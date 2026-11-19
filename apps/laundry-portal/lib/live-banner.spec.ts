import type { OwnerShopView } from '@wash-and-go/domain';
import { LIVE_BANNER_WINDOW_MS, liveBannerKey, shouldShowLiveBanner } from './live-banner';

const now = Date.parse('2026-10-19T08:00:00Z');
const shop = (status: OwnerShopView['status'], verifiedAt: string | null) =>
  ({ id: 's1', status, verifiedAt }) as Pick<OwnerShopView, 'id' | 'status' | 'verifiedAt'>;

describe('live banner', () => {
  it('keys the flag by shop id', () => {
    expect(liveBannerKey('s1')).toBe('wg-portal-live-seen:s1');
  });

  it('shows once for a recently verified shop until dismissed', () => {
    const recent = new Date(now - 60_000).toISOString();
    expect(shouldShowLiveBanner(shop('VERIFIED', recent), false, now)).toBe(true);
    expect(shouldShowLiveBanner(shop('VERIFIED', recent), true, now)).toBe(false);
  });

  it('never shows for long-live shops, unverified shops or staff (no shop)', () => {
    const old = new Date(now - LIVE_BANNER_WINDOW_MS - 1).toISOString();
    expect(shouldShowLiveBanner(shop('VERIFIED', old), false, now)).toBe(false);
    expect(shouldShowLiveBanner(shop('VERIFIED', null), false, now)).toBe(false);
    expect(shouldShowLiveBanner(shop('SUBMITTED', null), false, now)).toBe(false);
    expect(shouldShowLiveBanner(null, false, now)).toBe(false);
  });
});
