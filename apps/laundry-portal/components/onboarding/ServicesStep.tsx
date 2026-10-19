'use client';
import { useId } from 'react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { MoneyInput } from '../ui/MoneyInput';
import { MAX_TURNAROUND_HOURS, priceExample, unitLabel, unitSuffix, type ServiceDraft } from '../../lib/wizard-services';
import { CheckRow, FieldError } from './fields';
import type { StepErrors } from '../../lib/wizard';

function TurnaroundField({ s, error, onValue }: { s: ServiceDraft; error?: string; onValue: (v: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        Turnaround (hours)
      </label>
      <input
        id={id}
        className="input mono"
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_TURNAROUND_HOURS}
        step={1}
        value={s.turnaround}
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-msg`}
      />
      {error ? (
        <div id={`${id}-msg`} className="field-error">
          {error}
        </div>
      ) : (
        <div id={`${id}-msg`} className="field-hint">
          From the rider dropping it off to ready for return.
        </div>
      )}
    </div>
  );
}

// Step 3 · Services & rates (preview B5): tick what the shop offers, set ₱,
// unit and turnaround. Shared with the Services page (/services); both save
// rows through PUT /shop/services/:serviceId. Takes only the service rows.
export type ServicesFieldProps = {
  draft: { services: ServiceDraft[] };
  set: (patch: { services: ServiceDraft[] }) => void;
  errors: StepErrors;
  // The line under the list; the wizard says rates show once verified.
  note?: string;
};

export function ServicesStep({
  draft,
  set,
  errors,
  note = 'Customers see these rates once your shop is verified. You can change them later in Services.',
}: ServicesFieldProps) {
  const update = (id: string, patch: Partial<ServiceDraft>) =>
    set({ services: draft.services.map((s) => (s.serviceId === id ? { ...s, ...patch } : s)) });
  const example = priceExample(draft.services);

  if (!draft.services.length) {
    return (
      <EmptyState
        title="No services to choose from yet."
        body="Our team is setting up the service list. Try again in a little while."
      />
    );
  }

  return (
    <div className="wiz-section">
      <Card padded={false}>
        {draft.services.map((s) => (
          <div className="wiz-svc" key={s.serviceId} data-testid={`svc-${s.code}`}>
            <CheckRow checked={s.enabled} onChange={(enabled) => update(s.serviceId, { enabled })} testId={`svc-toggle-${s.code}`}>
              <b>{s.name}</b>
              <small>{s.enabled ? `Charged ${unitLabel(s.billingUnit)}` : 'Not offered · tick to set a rate'}</small>
            </CheckRow>
            {s.enabled ? (
              <>
                <MoneyInput
                  label={`Rate ${unitLabel(s.billingUnit)}`}
                  prefix="₱"
                  unit={unitSuffix(s.billingUnit)}
                  placeholder="0.00"
                  value={s.rate}
                  onChange={(e) => update(s.serviceId, { rate: e.target.value })}
                  error={errors[`rate:${s.serviceId}`]}
                />
                <TurnaroundField
                  s={s}
                  error={errors[`turnaround:${s.serviceId}`]}
                  onValue={(turnaround) => update(s.serviceId, { turnaround })}
                />
              </>
            ) : null}
          </div>
        ))}
      </Card>
      <FieldError>{errors.services}</FieldError>
      {example ? (
        <div className="wiz-preview" data-testid="price-example">
          Customers see: {example.replace(/ = .*/, ' = ')}
          <b>{example.split(' = ')[1]}</b> + delivery
        </div>
      ) : (
        <p className="small muted">Turn on wash, dry &amp; fold with a rate to see what a 6 kg load costs a customer.</p>
      )}
      <p className="small muted">{note}</p>
    </div>
  );
}
