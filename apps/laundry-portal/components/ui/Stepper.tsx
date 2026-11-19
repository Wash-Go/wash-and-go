// Wizard progress (plan A4): "Step 3 of 6 · Services & rates", a bar per step.
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  const n = steps.length;
  return (
    <div className="stepper-wrap">
      <div className="stepper-head">
        <b>
          Step {current + 1} of {n}
        </b>{' '}
        · {steps[current]}
      </div>
      <ol
        className="stepper"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
        aria-label={`Step ${current + 1} of ${n}: ${steps[current]}`}
      >
        {steps.map((s, i) => (
          <li key={s} className={i < current ? 'done' : i === current ? 'now' : undefined} aria-current={i === current ? 'step' : undefined}>
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>
      <div className="stepper-names" aria-hidden="true">
        {steps.map((s, i) => (
          <span key={s}>
            {i > 0 ? ' · ' : ''}
            {i === current ? <b>{s}</b> : s}
          </span>
        ))}
      </div>
    </div>
  );
}
