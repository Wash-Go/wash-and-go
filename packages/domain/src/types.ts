import type { OrderStatus, ServiceType } from './order-status';

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
  weightKg: number;
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
  shopId: string | null;
  shopServiceId: string | null;
  assignedRiderId: string | null;
  weightEstimateKg: string | null;
  weightKg: string | null;
  washValuePhp: string;
  deliveryFeePhp: string;
  serviceFeePhp: string;
  customerTotalPhp: string;
  paidCashAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
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
  weightEstimateKg: number;
}

export interface PreviewOrderBody {
  shopServiceId: string;
  weightKg: number;
  // Optional — enables the distance-based delivery fee; omitted → base fee.
  pickupLat?: number;
  pickupLng?: number;
}
