import type {
  AddressView,
  AdminUserView,
  CloseRemittanceBody,
  ConfigAuditEntry,
  CreateAddressBody,
  CreateOrderBody,
  CreateZoneBody,
  GeocodeHit,
  RecordDepositBody,
  RiderCashBalance,
  RiderCashDetail,
  UpdateAddressBody,
  ZoneView,
  OrderQuote,
  OrderStatus,
  OrderView,
  PlatformConfigPatch,
  PlatformConfigView,
  PreviewOrderBody,
  PricingBreakdown,
  QuoteOrderBody,
  RateOrderBody,
  RemittanceBatchView,
  Rider,
  ShopView,
  UserRole,
} from '@wash-and-go/domain';

/*
 * Hand-written typed client for the Nest API (eng review C1: ~6 endpoints, too
 * small to justify codegen). Auth is injected via TokenProvider so this package
 * has ZERO Firebase dependency and the 401 -> refresh -> retry path is fully
 * unit-testable. Lane B plugs a Firebase-backed TokenProvider in
 * (getToken = current ID token; refreshToken = getIdToken(true)).
 */

export interface TokenProvider {
  getToken(): Promise<string | null>;
  refreshToken(): Promise<string | null>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens: TokenProvider;
  fetchFn?: typeof fetch; // injectable for tests / non-global-fetch runtimes
  // Dev-bypass stub (backend AUTH_DEV_BYPASS=1): send x-dev-uid instead of a
  // Firebase token, so the app runs in Expo Go before real OTP exists. Never
  // set this in a production build.
  devUid?: string;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly tokens: TokenProvider;
  private readonly fetchFn: typeof fetch;
  private readonly devUid?: string;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.tokens = opts.tokens;
    // Wrap the global fetch so it's called as a free function, not as a method
    // of this client — browsers throw "Illegal invocation" when fetch's `this`
    // isn't the window. (Native RN doesn't care; this is web-safe everywhere.)
    this.fetchFn = opts.fetchFn ?? ((input, init) => fetch(input, init));
    this.devUid = opts.devUid;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    // undefined = first attempt (fetch a fresh token); set = retry using the
    // exact token refreshToken() returned.
    retry?: { token: string | null },
    // Idempotency key — a retried mutating call returns the same result instead
    // of creating a duplicate (booking / cash deposit).
    idempotencyKey?: string,
  ): Promise<T> {
    const token = retry ? retry.token : await this.tokens.getToken();
    const headers: Record<string, string> = {};
    // Only set content-type when there's a body — Fastify rejects an empty body
    // sent with content-type: application/json (breaks no-body POSTs like
    // pay-cash).
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (this.devUid) headers['x-dev-uid'] = this.devUid;
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    // Firebase ID tokens expire hourly. On the first 401, refresh once and
    // retry with the refreshed token directly; a second 401 is a real auth
    // failure.
    if (res.status === 401 && !retry) {
      const refreshed = await this.tokens.refreshToken();
      if (refreshed) {
        return this.request<T>(method, path, body, { token: refreshed }, idempotencyKey);
      }
    }

    const text = await res.text();
    const data = text ? safeJson(text) : undefined;

    if (!res.ok) {
      const message =
        data && typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: unknown }).message)
          : `HTTP ${res.status}`;
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  }

  // First sign-in creates the Postgres user; idempotent. The endpoint is public
  // and verifies the token itself, so the ID token goes in the BODY as idToken
  // (not just the Authorization header).
  async postSession(): Promise<{ id: string; roles: string[] }> {
    const token = await this.tokens.getToken();
    return this.request('POST', '/auth/session', { idToken: token });
  }

  getShops(loc?: { lat: number; lng: number }): Promise<ShopView[]> {
    const q = loc ? `?lat=${loc.lat}&lng=${loc.lng}` : '';
    return this.request('GET', `/shops${q}`);
  }

  // Resolve nearest shop (or the override) + a priced quote for checkout.
  quoteOrder(body: QuoteOrderBody): Promise<OrderQuote> {
    return this.request('POST', '/orders/quote', body);
  }

  // Admin-only: riders for the dispatch assign picker.
  getRiders(): Promise<Rider[]> {
    return this.request('GET', '/riders');
  }

  assignRider(id: string, riderId: string): Promise<OrderView> {
    return this.request('POST', `/orders/${encodeURIComponent(id)}/assign-rider`, {
      riderId,
    });
  }

  weigh(id: string, weightKg: number): Promise<OrderView> {
    return this.request('POST', `/orders/${encodeURIComponent(id)}/weigh`, {
      weightKg,
    });
  }

  previewOrder(body: PreviewOrderBody): Promise<PricingBreakdown> {
    return this.request('POST', '/orders/preview', body);
  }

  createOrder(body: CreateOrderBody, idempotencyKey?: string): Promise<OrderView> {
    return this.request('POST', '/orders', body, undefined, idempotencyKey);
  }

  getOrder(id: string): Promise<OrderView> {
    return this.request('GET', `/orders/${encodeURIComponent(id)}`);
  }

  // Paged, newest-first. `q` searches the order code; `before` is an order id
  // cursor for the next page. Back-compatible: listOrders() / listOrders(status).
  listOrders(
    status?: OrderStatus,
    q?: string,
    limit?: number,
    before?: string,
  ): Promise<OrderView[]> {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (q) p.set('q', q);
    if (limit != null) p.set('limit', String(limit));
    if (before) p.set('before', before);
    const s = p.toString();
    return this.request('GET', `/orders${s ? `?${s}` : ''}`);
  }

  // Drive a legal status transition (rider/shop/admin). Server enforces legality
  // + ownership; the client only offers actions the shaped read said are available.
  transition(id: string, status: OrderStatus, reason?: string): Promise<OrderView> {
    return this.request('POST', `/orders/${encodeURIComponent(id)}/status`, {
      status,
      ...(reason ? { reason } : {}),
    });
  }

  rateOrder(id: string, body: RateOrderBody): Promise<unknown> {
    return this.request('POST', `/orders/${encodeURIComponent(id)}/rating`, body);
  }

  payCash(id: string): Promise<OrderView> {
    return this.request('POST', `/orders/${encodeURIComponent(id)}/pay-cash`);
  }

  // --- Admin: platform business rules (dynamic config, no redeploy) ---

  getConfig(): Promise<PlatformConfigView> {
    return this.request('GET', '/admin/config');
  }

  updateConfig(patch: PlatformConfigPatch): Promise<PlatformConfigView> {
    return this.request('PUT', '/admin/config', patch);
  }

  getConfigAudit(limit?: number): Promise<ConfigAuditEntry[]> {
    const q = limit ? `?limit=${limit}` : '';
    return this.request('GET', `/admin/config/audit${q}`);
  }

  // --- Admin: shop payout batches (remittance) ---

  getRemittanceBatches(filter?: {
    shopId?: string;
    status?: 'PENDING' | 'PAID';
  }): Promise<RemittanceBatchView[]> {
    const q = new URLSearchParams();
    if (filter?.shopId) q.set('shopId', filter.shopId);
    if (filter?.status) q.set('status', filter.status);
    const qs = q.toString();
    return this.request('GET', `/admin/remittance/batches${qs ? `?${qs}` : ''}`);
  }

  closeRemittance(body: CloseRemittanceBody): Promise<RemittanceBatchView[]> {
    return this.request('POST', '/admin/remittance/close', body);
  }

  markRemittancePaid(
    batchId: string,
    reference: string,
  ): Promise<RemittanceBatchView> {
    return this.request(
      'POST',
      `/admin/remittance/batches/${encodeURIComponent(batchId)}/mark-paid`,
      { reference },
    );
  }

  // --- Customer address book ---

  getAddresses(): Promise<AddressView[]> {
    return this.request('GET', '/me/addresses');
  }

  createAddress(body: CreateAddressBody): Promise<AddressView> {
    return this.request('POST', '/me/addresses', body);
  }

  updateAddress(id: string, body: UpdateAddressBody): Promise<AddressView> {
    return this.request('PATCH', `/me/addresses/${encodeURIComponent(id)}`, body);
  }

  deleteAddress(id: string): Promise<void> {
    return this.request('DELETE', `/me/addresses/${encodeURIComponent(id)}`);
  }

  // Address → coordinates (booking pickup search). null = no match.
  geocode(query: string): Promise<GeocodeHit | null> {
    return this.request('GET', `/geocode?q=${encodeURIComponent(query)}`);
  }

  // --- Admin: rider cash reconciliation ---

  getRiderCashSummary(): Promise<RiderCashBalance[]> {
    return this.request('GET', '/admin/riders/cash');
  }

  getRiderCashDetail(riderId: string): Promise<RiderCashDetail> {
    return this.request('GET', `/admin/riders/${encodeURIComponent(riderId)}/cash`);
  }

  recordRiderDeposit(
    riderId: string,
    body: RecordDepositBody,
    idempotencyKey?: string,
  ): Promise<unknown> {
    return this.request(
      'POST',
      `/admin/riders/${encodeURIComponent(riderId)}/cash/deposit`,
      body,
      undefined,
      idempotencyKey,
    );
  }

  // --- Admin: user directory (onboarding — grant roles / disable) ---
  listUsers(role?: UserRole, q?: string): Promise<AdminUserView[]> {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (q) params.set('q', q);
    const qs = params.toString();
    return this.request('GET', `/admin/users${qs ? `?${qs}` : ''}`);
  }

  setUserRoles(id: string, roles: UserRole[]): Promise<AdminUserView> {
    return this.request('PATCH', `/admin/users/${encodeURIComponent(id)}/roles`, {
      roles,
    });
  }

  setUserDisabled(id: string, disabled: boolean): Promise<AdminUserView> {
    const action = disabled ? 'disable' : 'enable';
    return this.request('POST', `/admin/users/${encodeURIComponent(id)}/${action}`);
  }

  // --- Admin: coverage zones ---

  getZones(): Promise<ZoneView[]> {
    return this.request('GET', '/admin/zones');
  }

  createZone(body: CreateZoneBody): Promise<ZoneView> {
    return this.request('POST', '/admin/zones', body);
  }

  setZoneActive(id: string, active: boolean): Promise<ZoneView> {
    return this.request('PATCH', `/admin/zones/${encodeURIComponent(id)}`, {
      active,
    });
  }
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
