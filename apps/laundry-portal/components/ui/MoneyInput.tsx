import { useId, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> & {
  label: string;
  unit: string; // suffix: "kg", "/ kg"
  prefix?: string; // "₱"
  error?: string | null;
  hint?: string | null;
};

// 56px money/weight input: mono, decimal keyboard, unit suffix (DESIGN.md
// input-money). Font is 26px so iOS never zooms.
export function MoneyInput({ label, unit, prefix, error, hint, id, ...rest }: Props) {
  const auto = useId();
  const inputId = id ?? auto;
  const msgId = `${inputId}-msg`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="money">
        {prefix ? <span className="unit">{prefix}</span> : null}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          {...rest}
        />
        <span className="unit">{unit}</span>
      </div>
      {error ? (
        <div id={msgId} className="field-error">
          {error}
        </div>
      ) : hint ? (
        <div id={msgId} className="field-hint">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
