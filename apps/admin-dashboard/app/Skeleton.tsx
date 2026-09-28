// Loading-state skeletons — shimmer placeholders that match each view's shape,
// so a page reads as "loading fast" instead of a bare "Loading…" line.

export function SkelBar({ w = '100%', h = 14 }: { w?: number | string; h?: number }) {
  return <div className="wg-skel" style={{ width: w, height: h }} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }} aria-busy="true" aria-label="Loading">
      <div style={{ display: 'grid', gap: 12, padding: 14 }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 16,
              alignItems: 'center',
            }}
          >
            {Array.from({ length: cols }).map((_, ci) => (
              <SkelBar key={ci} w={ci === 0 ? '70%' : '55%'} h={13} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gap: 12 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <SkelBar w="40%" h={16} />
          <SkelBar w="80%" />
          <SkelBar w="60%" />
        </div>
      ))}
    </div>
  );
}
