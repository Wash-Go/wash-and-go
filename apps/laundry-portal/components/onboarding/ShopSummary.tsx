'use client';
import { peso } from '@wash-and-go/domain';
import type { ReactNode } from 'react';
import { Card } from '../ui/Card';
import { hoursSummary, STEP, type WizardDraft } from '../../lib/wizard';
import { unitSuffix } from '../../lib/wizard-services';

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit?: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <Card padded={false} className="wiz-sum" data-testid={`summary-${step}`}>
      <div className="wiz-sum-head">
        <h2>{title}</h2>
        {onEdit ? (
          <button type="button" className="btn btn-text" onClick={() => onEdit(step)} aria-label={`Edit ${title.toLowerCase()}`}>
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

// One card per wizard step. With onEdit (review step) each card has "Edit";
// without it (under review) the summary is read-only.
export function ShopSummary({
  draft,
  uploadsConfigured,
  documentsPending,
  onEdit,
}: {
  draft: WizardDraft;
  uploadsConfigured: boolean;
  documentsPending?: boolean;
  onEdit?: (step: number) => void;
}) {
  const on = draft.services.filter((s) => s.enabled);
  const none = <span className="muted">Not set</span>;
  return (
    <div className="stack">
      <Section title="Laundry details" step={STEP.details} onEdit={onEdit}>
        <dl>
          <dt>Name</dt>
          <dd>{draft.name || none}</dd>
          <dt>Phone</dt>
          <dd className="mono">{draft.contactPhone || none}</dd>
          {draft.description ? (
            <>
              <dt>About</dt>
              <dd>{draft.description}</dd>
            </>
          ) : null}
        </dl>
      </Section>
      <Section title="Location" step={STEP.location} onEdit={onEdit}>
        <dl>
          <dt>Address</dt>
          <dd>{draft.address || none}</dd>
          <dt>Pin</dt>
          <dd className="mono">{draft.lat != null && draft.lng != null ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : none}</dd>
        </dl>
      </Section>
      <Section title="Services and rates" step={STEP.services} onEdit={onEdit}>
        {on.length ? (
          <dl>
            {on.map((s) => (
              <div key={s.serviceId} style={{ display: 'contents' }}>
                <dt>{s.name}</dt>
                <dd>
                  <span className="mono">
                    {peso(s.rate)} {unitSuffix(s.billingUnit)}
                  </span>{' '}
                  · <span className="mono">{s.turnaround} h</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="small">{none}</p>
        )}
      </Section>
      <Section title="Hours and capacity" step={STEP.hours} onEdit={onEdit}>
        <dl>
          {hoursSummary(draft.hours).map((g) => (
            <div key={g.days} style={{ display: 'contents' }}>
              <dt>{g.days}</dt>
              <dd className="mono">{g.hours}</dd>
            </div>
          ))}
          <dt>Express</dt>
          <dd>
            <span className="mono">{draft.expressSlots}</span> a day
          </dd>
        </dl>
      </Section>
      <Section title="Documents" step={STEP.documents} onEdit={uploadsConfigured ? onEdit : undefined}>
        <p className="small">
          {draft.permitKey
            ? `Business permit uploaded${draft.photoKeys.length ? ` · ${draft.photoKeys.length} storefront photo${draft.photoKeys.length === 1 ? '' : 's'}` : ''}.`
            : documentsPending || !uploadsConfigured
              ? 'We’ll check your permit in person.'
              : 'No permit yet.'}
        </p>
      </Section>
    </div>
  );
}
