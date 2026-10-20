'use client';
import { useId, type ReactNode } from 'react';

// Wizard-only field shapes the kit doesn't have yet: a textarea with a
// character counter, and a checkbox row with a 44px target.

export function TextAreaField({
  label,
  value,
  onValue,
  max,
  error,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onValue: (v: string) => void;
  max: number;
  error?: string | null;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="wiz-textarea"
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${msgId} ${id}-count`}
      />
      <div id={`${id}-count`} className="wiz-count mono" aria-live="off">
        {value.length}/{max}
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

export function CheckRow({
  checked,
  onChange,
  children,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <label className="wiz-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      <span>{children}</span>
    </label>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <div className="field-error" role="alert">
      {children}
    </div>
  );
}
