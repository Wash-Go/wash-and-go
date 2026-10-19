import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// Honest empty state with a next step (DESIGN.md: no invented content).
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  headingLevel = 2,
}: {
  icon?: LucideIcon;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="card empty" data-testid="empty-state">
      {Icon ? <Icon className="empty-icon" aria-hidden="true" /> : null}
      <H>{title}</H>
      {body ? <p>{body}</p> : null}
      {action ? <div className="row">{action}</div> : null}
    </div>
  );
}
