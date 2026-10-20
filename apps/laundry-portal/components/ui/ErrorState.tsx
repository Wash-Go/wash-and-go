'use client';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';

// Every error offers a recovery that fits it: retry, back, or both.
export function ErrorState({
  title = "Something didn't load.",
  body = 'Check your connection, then try again.',
  onRetry,
  backHref,
  backLabel = 'Go back',
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="card empty error-state" role="alert">
      <CircleAlert className="empty-icon" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="row">
        {onRetry ? (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        ) : null}
        {backHref ? (
          <Link className="btn btn-secondary" href={backHref}>
            {backLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
