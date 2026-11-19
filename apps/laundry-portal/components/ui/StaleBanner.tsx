import { WifiOff } from 'lucide-react';

// Offline / stale data banner: what you are looking at and how old it is,
// with a retry (DESIGN.md feedback).
export function StaleBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="stale" role="status" data-testid="stale-banner">
      <WifiOff aria-hidden="true" />
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="btn btn-text" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
