import type { StatusTone } from '@wash-and-go/domain';

// Palette anchored on the brand blue (also the splash background). Kept in one
// place so every screen reads as one product; sync with landing-page later.
export const colors = {
  brand: '#208AEF',
  brandDark: '#1567C0',
  brandTint: '#E6F1FE',
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#E4E9F0',
  text: '#111827',
  textMuted: '#6B7280',
  success: '#15A34A',
  danger: '#DC2626',
  warning: '#B45309',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  h1: { fontSize: 26, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  title: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
};

// Maps the domain's semantic status tone to a concrete color (design system
// lives in the app, not in shared domain code).
export function toneColor(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'cancelled':
      return colors.danger;
    case 'active':
      return colors.brand;
    default:
      return colors.textMuted;
  }
}
