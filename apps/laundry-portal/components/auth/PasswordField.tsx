'use client';
import { useId, useState } from 'react';

// Password with a Show/Hide toggle (44px target), 16px so iOS never zooms.
export function PasswordField({
  value,
  onChange,
  autoComplete,
  error,
  hint,
  label = 'Password',
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string | null;
  hint?: string;
  label?: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const msgId = `${id}-msg`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-row">
        <input
          id={id}
          className="input"
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          required
        />
        <button
          type="button"
          className="btn btn-text"
          aria-controls={id}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? 'Hide' : 'Show'}
          <span className="sr-only"> password</span>
        </button>
      </div>
      {error ? (
        <div id={msgId} className="field-error" role="alert">
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
