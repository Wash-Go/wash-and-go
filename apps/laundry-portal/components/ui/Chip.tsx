import type { OrderStatus, ShopStatus } from '@wash-and-go/domain';
import { orderChip, shopStatusChip, type ChipSpec } from '../../lib/status-chip';
import { CHIP_ICONS } from './icons';

// Status pill: icon + word + phase colour (DESIGN.md chips).
export function Chip({ spec }: { spec: ChipSpec }) {
  const Icon = CHIP_ICONS[spec.icon];
  return (
    <span className={`chip chip-${spec.tone}`}>
      <Icon aria-hidden="true" strokeWidth={2.2} />
      {spec.label}
    </span>
  );
}

export function OrderChip({ status, needsYou }: { status: OrderStatus; needsYou?: boolean }) {
  return <Chip spec={orderChip(status, { needsYou })} />;
}

export function ShopChip({ status }: { status: ShopStatus }) {
  return <Chip spec={shopStatusChip(status)} />;
}
