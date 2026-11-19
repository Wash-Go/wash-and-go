import type { HTMLAttributes } from 'react';

// Surface + 1px line + 16px radius. A card never contains a card (DESIGN.md).
export function Card({ className, padded = true, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={['card', padded ? 'card-pad' : '', className ?? ''].filter(Boolean).join(' ')} {...rest} />;
}
