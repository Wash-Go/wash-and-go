import type { OwnerShopView } from '@wash-and-go/domain';

// One-time "You're live" banner on the queue after verification (plan A3
// flow 1). Only for a shop verified in the last 14 days, so long-live shops
// never see it; dismissal is remembered per shop on this device.

export const LIVE_BANNER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function liveBannerKey(shopId: string): string {
  return `wg-portal-live-seen:${shopId}`;
}

export function shouldShowLiveBanner(
  shop: Pick<OwnerShopView, 'id' | 'status' | 'verifiedAt'> | null,
  dismissed: boolean,
  now: number,
): boolean {
  if (!shop || shop.status !== 'VERIFIED' || !shop.verifiedAt || dismissed) return false;
  const at = Date.parse(shop.verifiedAt);
  return Number.isFinite(at) && now - at <= LIVE_BANNER_WINDOW_MS;
}
