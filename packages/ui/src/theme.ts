import type { StatusTone } from '@wash-and-go/domain';

// Shared mobile palette — from the Wash & Go landing page. Flat solid color,
// warm-neutral bias. navy = structure/primary, terracotta = action/accent,
// slate = support. Existing keys (brand*, text*, etc.) are kept as aliases so
// consumers don't break; new keys add terracotta + slate.
export const colors = {
  // brand aliases -> navy (primary/structure)
  brand: '#004375',
  brandDark: '#003460',
  brandTint: '#e6eef4',

  navy: '#004375',
  navyDark: '#003460',
  navyTint: '#e6eef4',

  terra: '#d07a29',
  terraDark: '#a85d1e',
  terraTint: '#f6ebdd',

  slate: '#3d5975',
  slateTint: '#e9edf2',

  bg: '#f4f3ef',
  surface: '#ffffff',
  border: '#e5e8ec',
  borderSoft: '#eef1f5',

  text: '#1e2a36',
  textMuted: '#586779',
  textFaint: '#7d8896',

  success: '#2f7d5b',
  danger: '#b8433f',
  warning: '#d07a29',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const type = {
  h1: { fontSize: 26, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  title: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
};

// Status tone -> concrete color (design system stays in the app, not domain).
export function toneColor(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'cancelled':
      return colors.danger;
    case 'active':
      return colors.navy;
    default:
      return colors.textMuted;
  }
}
