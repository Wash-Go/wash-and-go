// Portal navigation (plan A2). Phone: bottom tabs; ≥1024px: left rail.
export type NavKey = 'orders' | 'services' | 'payouts' | 'shop' | 'staff' | 'help' | 'more';
export type NavIcon = 'package' | 'shirt' | 'wallet' | 'store' | 'menu' | 'users' | 'help';
export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
  icon: NavIcon;
}

const ORDERS: NavItem = { key: 'orders', label: 'Orders', href: '/', icon: 'package' };
const SERVICES: NavItem = { key: 'services', label: 'Services', href: '/services', icon: 'shirt' };
const PAYOUTS: NavItem = { key: 'payouts', label: 'Payouts', href: '/payouts', icon: 'wallet' };
const SHOP: NavItem = { key: 'shop', label: 'Shop', href: '/shop', icon: 'store' };
const STAFF: NavItem = { key: 'staff', label: 'Staff', href: '/staff', icon: 'users' };
const HELP: NavItem = { key: 'help', label: 'Help', href: '/help', icon: 'help' };

// "More" opens a sheet (Staff, Help, Sign out) rather than a page.
export const TAB_ITEMS: NavItem[] = [ORDERS, SERVICES, PAYOUTS, SHOP, { key: 'more', label: 'More', href: '#more', icon: 'menu' }];
export const RAIL_ITEMS: NavItem[] = [ORDERS, SERVICES, PAYOUTS, SHOP, STAFF, HELP];
export const MORE_ITEMS: NavItem[] = [STAFF, HELP];

export function activeTab(pathname: string): NavKey | null {
  if (pathname === '/' || pathname === '/orders' || pathname.startsWith('/orders/')) return 'orders';
  for (const item of RAIL_ITEMS) {
    if (item.href !== '/' && (pathname === item.href || pathname.startsWith(`${item.href}/`))) return item.key;
  }
  return null;
}

// Where to go after sign-in (?next=). Only same-app paths; never back to the
// auth screens; anything else lands on Orders.
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  if (/^\/(login|signup)(\/|\?|$)/.test(next)) return '/';
  return next;
}
