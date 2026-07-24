import type { OrderStatus, ServiceType, UserRole } from './order-status';
import type { LoadCategoryKey } from './load';

// Admin user directory (checkpoint O). Money-agnostic; dates are ISO strings.
export interface AdminUserView {
  id: string;
  firebaseUid: string;
  phone: string;
  displayName: string;
  roles: UserRole[];
  disabledAt: string | null;
  createdAt: string;
}

export interface SetUserRolesBody {
  roles: UserRole[];
}

// Admin shop administration (checkpoint C — shop onboarding, code side). Margin
// fields (commissionPct, expressSlotsPerDay) ARE exposed here (ADMIN-only),
// unlike the customer-facing ShopView. Decimals are strings over the wire.
export interface AdminShopView {
  id: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
  active: boolean;
  commissionPct: string;
  expressSlotsPerDay: number;
  serviceCount: number;
  memberCount: number;
  createdAt: string;
}

export interface AdminShopServiceView {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  ratePhp: string;
  turnaroundHours: number;
  active: boolean;
}

export interface AdminShopMemberView {
  id: string;
  userId: string;
  displayName: string;
  phone: string;
  role: string;
}

export interface AdminShopDetail extends AdminShopView {
  services: AdminShopServiceView[];
  members: AdminShopMemberView[];
}

export interface ServiceCatalogView {
  id: string;
  code: string;
  name: string;
  billingUnit: string;
}

export interface CreateShopBody {
  name: string;
  address: string;
  lat: number;
  lng: number;
  commissionPct?: number;
  expressSlotsPerDay?: number;
}

export interface UpdateShopBody {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  commissionPct?: number;
  expressSlotsPerDay?: number;
  active?: boolean;
}

export interface AddShopServiceBody {
  serviceId: string;
  ratePhp: number;
  turnaroundHours: number;
}

export interface UpdateShopServiceBody {
  ratePhp?: number;
  turnaroundHours?: number;
  active?: boolean;
}

export interface AddShopMemberBody {
  userId: string;
  role: 'OWNER' | 'STAFF';
}
// ServiceType re-used below for the create body.

// Wire shapes returned by the Nest API. Money is a STRING over the wire (Prisma
// Decimal serializes to a decimal string in JSON); the app keeps it as a string
// and formats for display — never parses it into a float.

export interface ShopServiceView {
  id: string; // ShopService id — what POST /orders / preview need
  code: string;
  name: string;
  ratePhp: string;
  turnaroundHours: number;
}

export interface ShopView {
  id: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
  services: ShopServiceView[];
  // Present when GET /shops is called with a location (?lat&lng) — nearest first.
  distanceKm?: number;
}

// The checkout quote: the resolved (closest or chosen) shop + a full price
// breakdown with the distance-based delivery fee.
export interface OrderQuote {
  shopServiceId: string;
  shop: { id: string; name: string; address: string; distanceKm: number };
  breakdown: PricingBreakdown;
}

export interface QuoteOrderBody {
  pickupLat: number;
  pickupLng: number;
  loadCategory: LoadCategoryKey; // maps to an estimate kg server-side
  serviceType?: ServiceType; // SCHEDULED skips the express weight ceiling
  shopServiceId?: string; // override; omitted → auto-resolve nearest
}

export interface PricingBreakdown {
  washValuePhp: string;
  deliveryFeePhp: string;
  serviceFeePhp: string;
  commissionPhp: string;
  shopRemittancePhp: string;
  customerTotalPhp: string;
}

export interface Rider {
  id: string;
  displayName: string;
  phone: string;
}

export interface ShopContact {
  id: string;
  name: string;
  address: string;
}

export interface Contact {
  id: string;
  displayName: string;
  phone?: string;
}

export interface OrderView {
  id: string;
  code: string;
  status: OrderStatus;
  serviceType: ServiceType;
  pickupAddress: string;
  pickupLat: string | null;
  pickupLng: string | null;
  loadCategory: string | null;
  shopId: string | null;
  shopServiceId: string | null;
  assignedRiderId: string | null;
  weightEstimateKg: string | null;
  weightKg: string | null;
  scheduledPickupAt: string | null; // ISO; set for Scheduled (Tier 1), null for Express
  washValuePhp: string;
  deliveryFeePhp: string;
  serviceFeePhp: string;
  customerTotalPhp: string;
  paidCashAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  ratedStars: number | null; // customer's rating for this order (1–5), null if unrated
  // Present on the shaped read (GET /orders/:id, GET /orders): relations + the
  // actions the requesting actor may drive next.
  shop?: ShopContact | null;
  customer?: Contact;
  rider?: Contact | null;
  availableActions?: OrderStatus[];
}

// Request bodies the app sends.
export interface CreateOrderBody {
  shopServiceId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  loadCategory: LoadCategoryKey; // maps to an estimate kg; server enforces the express ceiling
  // Omitted → EXPRESS (Tier 2). SCHEDULED (Tier 1) has no weight ceiling and
  // requires scheduledPickupAt (ISO, must be in the future).
  serviceType?: ServiceType;
  scheduledPickupAt?: string;
}

export interface RateOrderBody {
  stars: number; // 1–5
  comment?: string;
}

// In-app notification inbox.
export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: NotificationView[];
  unread: number;
}

export interface PreviewOrderBody {
  shopServiceId: string;
  weightKg: number;
  // Optional — enables the distance-based delivery fee; omitted → base fee.
  pickupLat?: number;
  pickupLng?: number;
}

// Platform business rules (admin-editable, no redeploy). Flat numeric view the
// admin editor + GET /admin/config speak. Placeholders (expressWeightThresholdKg,
// minOrderPricePhp, platformFeePhp) are editable but have no consumer yet.
export interface PlatformConfigView {
  serviceFeePhp: number;
  deliveryBasePhp: number;
  deliveryFreeKm: number;
  deliveryPerKmPhp: number;
  deliveryMaxPhp: number;
  deliveryRoadFactor: number;
  maxResolveKm: number;
  expressWeightThresholdKg: number;
  minOrderPricePhp: number;
  platformFeePhp: number;
  autoDispatchEnabled: number; // 1 = auto-assign a rider on Express booking, 0 = manual
  updatedAt: string;
}

// PUT /admin/config body — patch only the fields you change.
export type PlatformConfigPatch = Partial<Omit<PlatformConfigView, 'updatedAt'>>;

// One audited change (GET /admin/config/audit).
export interface ConfigAuditEntry {
  id: string;
  actorUid: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: string;
}

// Shop payout batch (admin remittance console). Money fields are stringified
// Decimals, dates are ISO strings — matches the JSON the API returns.
export type RemittanceBatchStatus = 'PENDING' | 'PAID';

export interface RemittanceBatchView {
  id: string;
  shopId: string;
  periodStart: string;
  periodEnd: string;
  totalPhp: string;
  lineCount: number;
  status: RemittanceBatchStatus;
  reference: string | null;
  paidAt: string | null;
  paidByUid: string | null;
  createdAt: string;
}

export interface CloseRemittanceBody {
  periodStart: string; // ISO
  periodEnd: string; // ISO, exclusive
  shopId?: string; // omit to close every shop with unbatched lines
}

// Customer address book. lat/lng are stringified Decimals (or null) as JSON.
export interface AddressView {
  id: string;
  label: string | null;
  line: string;
  lat: string | null;
  lng: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressBody {
  label?: string;
  line: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export type UpdateAddressBody = Partial<CreateAddressBody>;

// Geocode result from GET /geocode?q= (address → coords). null = no match.
export interface GeocodeHit {
  point: { lat: number; lng: number };
  label: string;
  score?: number;
}

// Rider cash reconciliation (admin). Money is stringified Decimal.
export interface RiderCashBalance {
  riderId: string;
  collectedPhp: string;
  depositedPhp: string;
  outstandingPhp: string;
}

export interface RiderCashDepositView {
  id: string;
  riderId: string;
  amountPhp: string;
  reference: string | null;
  note: string | null;
  recordedByUid: string;
  createdAt: string;
}

export interface RiderCashDetail {
  balance: RiderCashBalance;
  deposits: RiderCashDepositView[];
}

export interface RecordDepositBody {
  amountPhp: number;
  reference?: string;
  note?: string;
}

// Coverage zone (admin). polygon is an array of { lat, lng } vertices.
export interface ZoneVertex {
  lat: number;
  lng: number;
}
export interface ZoneView {
  id: string;
  name: string;
  active: boolean;
  polygon: ZoneVertex[];
  createdAt: string;
}
export interface CreateZoneBody {
  name: string;
  polygon: ZoneVertex[];
}
