'use client';
import { useId, type InputHTMLAttributes } from 'react';

export function TextField({
  label,
  error,
  hint,
  onValue,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  error?: string | null;
  hint?: string;
  onValue: (v: string) => void;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        {...rest}
      />
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
