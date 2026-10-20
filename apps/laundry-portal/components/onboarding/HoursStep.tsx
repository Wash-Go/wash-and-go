'use client';
import { Copy } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { copyMondayToWeekdays, DAY_NAMES, MAX_EXPRESS_SLOTS, type HoursRow } from '../../lib/wizard';
import { FieldError } from './fields';
import type { FieldProps } from './types';

// Step 4 · Hours & capacity: Sun–Sat grid with an open toggle and times,
// "Copy Monday to weekdays", and Express slots per day.
export function HoursStep({ draft, set, errors }: FieldProps) {
  const slotsId = useId();
  const update = (day: number, patch: Partial<HoursRow>) =>
    set({ hours: draft.hours.map((h) => (h.day === day ? { ...h, ...patch } : h)) });

  return (
    <div className="wiz-section">
      <Card padded={false} className="wiz-hours">
        {draft.hours.map((h) => {
          const name = DAY_NAMES[h.day];
          const err = errors[`hours:${h.day}`];
          return (
            <div className="wiz-day" key={h.day} data-testid={`day-${h.day}`}>
              <span className="wiz-day-name">{name}</span>
              <label className="wiz-check">
                <input
                  type="checkbox"
                  checked={h.open}
                  onChange={(e) => update(h.day, { open: e.target.checked })}
                  aria-label={`Open on ${name}`}
                />
                <span>{h.open ? 'Open' : 'Closed'}</span>
              </label>
              {h.open ? (
                <div className="wiz-times">
                  <input
                    className="input"
                    type="time"
                    step={900}
                    value={h.from}
                    aria-label={`${name} opens`}
                    aria-invalid={err ? true : undefined}
                    onChange={(e) => update(h.day, { from: e.target.value })}
                  />
                  <span className="small muted">to</span>
                  <input
                    className="input"
                    type="time"
                    step={900}
                    value={h.to}
                    aria-label={`${name} closes`}
                    aria-invalid={err ? true : undefined}
                    onChange={(e) => update(h.day, { to: e.target.value })}
                  />
                </div>
              ) : null}
              {err ? <div className="field-error">{err}</div> : null}
            </div>
          );
        })}
      </Card>
      <FieldError>{errors.hours}</FieldError>
      <Button
        variant="secondary"
        icon={<Copy aria-hidden="true" />}
        onClick={() => set({ hours: copyMondayToWeekdays(draft.hours) })}
        style={{ alignSelf: 'flex-start' }}
      >
        Copy Monday to weekdays
      </Button>

      <div className="field">
        <label className="field-label" htmlFor={slotsId}>
          Express slots per day
        </label>
        <input
          id={slotsId}
          className="input mono"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_EXPRESS_SLOTS}
          step={1}
          value={draft.expressSlots}
          onChange={(e) => set({ expressSlots: e.target.value })}
          aria-invalid={errors.expressSlots ? true : undefined}
          aria-describedby={`${slotsId}-msg`}
        />
        {errors.expressSlots ? (
          <div id={`${slotsId}-msg`} className="field-error">
            {errors.expressSlots}
          </div>
        ) : (
          <div id={`${slotsId}-msg`} className="field-hint">
            One slot is one Express order a day: an e-bike pickup of up to 6 kg, back to the customer the same
            day. Set 0 to take only Scheduled orders for now.
          </div>
        )}
      </div>
    </div>
  );
}
