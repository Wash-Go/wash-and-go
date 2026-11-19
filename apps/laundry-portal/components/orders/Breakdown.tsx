import { peso } from '@wash-and-go/domain';
import type { ReactNode } from 'react';

// Price breakdown (preview B3/B4): wash, delivery, service fee, then the
// customer total ruled off; money in mono, right-aligned.
export function Breakdown({
  wash,
  washValuePhp,
  deliveryFeePhp,
  serviceFeePhp,
  customerTotalPhp,
  extra,
}: {
  wash: string;
  washValuePhp: string;
  deliveryFeePhp: string;
  serviceFeePhp: string;
  customerTotalPhp: string;
  extra?: ReactNode;
}) {
  return (
    <dl className="bd" data-testid="breakdown">
      <div>
        <dt>
          Wash · <span className="mono">{wash}</span>
        </dt>
        <dd>{peso(washValuePhp)}</dd>
      </div>
      <div>
        <dt>Delivery</dt>
        <dd>{peso(deliveryFeePhp)}</dd>
      </div>
      <div>
        <dt>Service fee</dt>
        <dd>{peso(serviceFeePhp)}</dd>
      </div>
      <div className="tot">
        <dt>Customer pays</dt>
        <dd>{peso(customerTotalPhp)}</dd>
      </div>
      {extra}
    </dl>
  );
}
