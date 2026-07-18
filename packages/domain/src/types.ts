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
}

export interface PricingBreakdown {
  washValuePhp: string;
  deliveryFeePhp: string;
  serviceFeePhp: string;
  commissionPhp: string;
  shopRemittancePhp: string;
  customerTotalPhp: string;
}

export interface OrderView {
  id: string;
  code: string;
  status: OrderStatus;
  serviceType: ServiceType;
  pickupAddress: string;
  shopId: string | null;
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
}
