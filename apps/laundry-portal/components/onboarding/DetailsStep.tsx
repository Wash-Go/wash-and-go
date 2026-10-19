'use client';
import { TextField } from '../auth/TextField';
import { MAX_DESCRIPTION, MAX_NAME } from '../../lib/wizard';
import { TextAreaField } from './fields';
import type { FieldProps } from './types';

// Step 1 · Laundry details: name, contact phone, short description.
export function DetailsStep({ draft, set, errors }: FieldProps) {
  return (
    <div className="wiz-section">
      <TextField
        label="Laundry name"
        autoComplete="organization"
        maxLength={MAX_NAME}
        placeholder="e.g. Tetuan Laundry Hub"
        value={draft.name}
        onValue={(name) => set({ name })}
        error={errors.name}
        hint="The name customers see when we match them to your shop."
      />
      <TextField
        label="Contact phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0917 123 4567"
        value={draft.contactPhone}
        onValue={(contactPhone) => set({ contactPhone })}
        error={errors.contactPhone}
        hint="A PH mobile number our team and riders can call during opening hours."
      />
      <TextAreaField
        label="Short description (optional)"
        max={MAX_DESCRIPTION}
        placeholder="e.g. Family-run since 2015, beside Tetuan church. Same-day wash, dry & fold."
        value={draft.description}
        onValue={(description) => set({ description })}
        error={errors.description}
      />
    </div>
  );
}
