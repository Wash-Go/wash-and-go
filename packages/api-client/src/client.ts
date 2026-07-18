import type {
  CreateOrderBody,
  OrderStatus,
  OrderView,
  PreviewOrderBody,
  PricingBreakdown,
  ShopView,
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
    this.fetchFn = opts.fetchFn ?? fetch;
    this.devUid = opts.devUid;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    // undefined = first attempt (fetch a fresh token); set = retry using the
    // exact token refreshToken() returned.
    retry?: { token: string | null },
  ): Promise<T> {
    const token = retry ? retry.token : await this.tokens.getToken();
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (this.devUid) headers['x-dev-uid'] = this.devUid;

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
        return this.request<T>(method, path, body, { token: refreshed });
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

  // First sign-in creates the Postgres user; idempotent (bearer only).
  postSession(): Promise<{ id: string }> {
    return this.request('POST', '/auth/session');
  }

  getShops(): Promise<ShopView[]> {
    return this.request('GET', '/shops');
  }

  previewOrder(body: PreviewOrderBody): Promise<PricingBreakdown> {
    return this.request('POST', '/orders/preview', body);
  }

  createOrder(body: CreateOrderBody): Promise<OrderView> {
    return this.request('POST', '/orders', body);
  }

  getOrder(id: string): Promise<OrderView> {
    return this.request('GET', `/orders/${encodeURIComponent(id)}`);
  }

  listOrders(status?: OrderStatus): Promise<OrderView[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request('GET', `/orders${q}`);
  }

  // Drive a legal status transition (rider/shop/admin). Server enforces legality
  // + ownership; the client only offers actions the shaped read said are available.
  transition(id: string, status: OrderStatus): Promise<OrderView> {
    return this.request('POST', `/orders/${encodeURIComponent(id)}/status`, {
      status,
    });
  }

  payCash(id: string): Promise<OrderView> {
    return this.request('POST', `/orders/${encodeURIComponent(id)}/pay-cash`);
  }
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}
