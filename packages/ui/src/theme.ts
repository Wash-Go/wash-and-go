import type { StatusTone } from '@wash-and-go/domain';

// Shared mobile palette — Wash & Go landing (navy structure, terracotta action).
// Flat solid color, NO gradients; depth comes from soft shadows + layered
// surfaces. Warm-neutral ground for a characterful, non-generic feel.
export const colors = {
  brand: '#004375',
  brandDark: '#003460',
  brandTint: '#e6eef4',

  navy: '#004375',
  navyDark: '#00304f',
  navyTint: '#e7eef5',

  terra: '#d07a29',
  terraDark: '#a85d1e',
  terraTint: '#f7ecdf',

  slate: '#3d5975',
  slateTint: '#e9edf2',

  bg: '#f3f2ee', // warm paper ground
  surface: '#ffffff',
  surfaceAlt: '#faf9f5', // nested tray behind cards
  border: '#e7e6e0',
  borderSoft: '#eeede8',

  text: '#1a2430',
  textMuted: '#5a6775',
  textFaint: '#8a95a1',

  success: '#2f7d5b',
  danger: '#b8433f',
  warning: '#c47a2b',
  onNavy: '#f3f7fb',
  onNavyDim: '#a9c3d8',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 44 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

// Plus Jakarta Sans — loaded in each app's _layout via @expo-google-fonts.
// Weight is baked into the family; set fontFamily, not fontWeight, for RN.
export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export const type = {
  hero: { fontFamily: font.extrabold, fontSize: 30, letterSpacing: -0.6, lineHeight: 34 },
  h1: { fontFamily: font.extrabold, fontSize: 26, letterSpacing: -0.5, lineHeight: 30 },
  h2: { fontFamily: font.bold, fontSize: 20, letterSpacing: -0.3, lineHeight: 25 },
  title: { fontFamily: font.bold, fontSize: 16, letterSpacing: -0.2 },
  body: { fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2 },
};

// Soft ambient depth (iOS shadow + Android elevation). No harsh drop shadows.
export const elevation = {
  soft: {
    shadowColor: '#1a2430',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    shadowColor: '#1a2430',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  hero: {
    shadowColor: '#00304f',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  terra: {
    shadowColor: '#a85d1e',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
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
