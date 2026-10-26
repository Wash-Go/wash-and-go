import type { CSSProperties } from 'react';

export function Skeleton({ width = '100%', height = 14, style }: { width?: string | number; height?: number; style?: CSSProperties }) {
  return <div className="sk" aria-hidden="true" style={{ width, height, ...style }} />;
}

// A loading order card: code, two lines, the action.
export function SkeletonCard({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="card card-pad" aria-busy="true">
      <span className="sr-only">{label}</span>
      <Skeleton width="38%" height={28} />
      <Skeleton width="72%" />
      <Skeleton width="46%" />
      <Skeleton height={48} style={{ borderRadius: 'var(--r-md)', margin: 0 }} />
    </div>
  );
}
