import {
  Bike,
  Check,
  CircleHelp,
  Clock,
  FileText,
  Menu,
  Package,
  Shirt,
  Store,
  TriangleAlert,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ChipIcon } from '../../lib/status-chip';
import type { NavIcon } from '../../lib/nav';

// One icon set (Lucide), DESIGN.md. Pure lib modules name icons as strings so
// they stay testable without React; this maps the names to glyphs.
export const CHIP_ICONS: Record<ChipIcon, LucideIcon> = {
  clock: Clock,
  bike: Bike,
  store: Store,
  shirt: Shirt,
  package: Package,
  check: Check,
  x: X,
  alert: TriangleAlert,
  file: FileText,
};

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  package: Package,
  shirt: Shirt,
  wallet: Wallet,
  store: Store,
  menu: Menu,
  users: Users,
  help: CircleHelp,
};
