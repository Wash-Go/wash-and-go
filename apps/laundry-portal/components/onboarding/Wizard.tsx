'use client';
import './onboarding.css';
import type { ShopServiceRow, UpdateOnboardingBody } from '@wash-and-go/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useConsole } from '../console/ConsoleContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorState } from '../ui/ErrorState';
import { SkeletonCard } from '../ui/Skeleton';
import { StaleBanner } from '../ui/StaleBanner';
import { Stepper } from '../ui/Stepper';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { useNow, useOnline } from '../../lib/live';
import { WIZARD_STEPS } from '../../lib/onboarding';
import { formatAgo } from '../../lib/relative-time';
import {
  detailsPatch,
  draftFromServer,
  firstIncompleteStep,
  hoursPatch,
  locationPatch,
  servicePuts,
  STEP,
  submitErrorSteps,
  validateStep,
  type StepErrors,
  type WizardDraft,
} from '../../lib/wizard';
import { DetailsStep } from './DetailsStep';
import { DocumentsStep } from './DocumentsStep';
import { CheckRow, FieldError } from './fields';
import { HoursStep } from './HoursStep';
import { LocationStep } from './LocationStep';
import { ServicesStep } from './ServicesStep';
import { ShopSummary } from './ShopSummary';
import type { StepProps, WizardData } from './types';

const HEADLINES = [
  'Tell us about your laundry',
  'Where is your shop?',
  'What do you offer?',
  'When are you open?',
  'Your documents',
  'Check and submit',
];

const status = (e: unknown): number | undefined => {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : undefined;
};

export function wizardKey(userId: string) {
  return ['wizard', userId] as const;
}

// Loads everything the wizard needs once: the shop (starting a draft if the
// owner has none yet), the catalog, the shop's rates and whether uploads are
// open. Not polled; each save writes the API's answer back into this cache.
export function useWizardData() {
  const { me } = useConsole();
  return useQuery<WizardData>({
    queryKey: wizardKey(me.id),
    queryFn: async () => {
      const shop = (await api.getMyShopOnboarding()) ?? (await api.startShopOnboarding());
      const [catalog, services, uploads] = await Promise.all([api.shopCatalog(), api.shopServices(), api.uploadsStatus()]);
      return { shop, catalog, services, uploads };
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: (n, e) => n < 1 && typeof status(e) !== 'number',
  });
}

// The six-step registration wizard (plan A3 flow 1, A4). Opens on the first
// incomplete step (or `startAt`, e.g. the step a rejection names). Next
// validates the step, saves it (PATCH /shop/onboarding, or PUT
// /shop/services/:id for rates) and only then moves on; a failed save shows a
// toast and keeps the owner on the step with their answers intact.
export function Wizard({ startAt, onSaved }: { startAt?: number; onSaved?: (at: number) => void }) {
  const { me, refresh } = useConsole();
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const q = useWizardData();
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [step, setStep] = useState<number>(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const [backToReview, setBackToReview] = useState(false);
  const [missing, setMissing] = useState<{ label: string; step: number }[]>([]);
  const headRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!q.data || draft) return;
    const { shop, catalog, services, uploads } = q.data;
    setDraft(draftFromServer(shop, catalog, services));
    setStep(startAt ?? firstIncompleteStep(shop, services, uploads));
  }, [q.data, draft, startAt]);

  // Move focus to the step headline so screen readers hear the new step.
  useEffect(() => {
    if (!moved.current) return;
    headRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const set = useCallback((patch: Partial<WizardDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d)), []);

  const writeCache = (patch: Partial<WizardData>) =>
    qc.setQueryData<WizardData>(wizardKey(me.id), (old) => (old ? { ...old, ...patch } : old));

  const go = (n: number) => {
    moved.current = true;
    setErrors({});
    setStep(n);
  };

  if (q.isError && !q.data) {
    return (
      <ErrorState
        title="We couldn't open your registration."
        body="Check your connection, then try again. Your saved answers are safe."
        onRetry={() => void q.refetch()}
      />
    );
  }
  if (!q.data || !draft) {
    return (
      <div className="stack" aria-busy="true">
        <SkeletonCard label="Loading your registration" />
      </div>
    );
  }
  const data = q.data;

  async function patch(body: UpdateOnboardingBody) {
    const shop = await api.updateShopOnboarding(body);
    writeCache({ shop });
  }

  async function saveStep(n: number, d: WizardDraft) {
    if (n === STEP.details) await patch(detailsPatch(d));
    else if (n === STEP.location) await patch(locationPatch(d));
    else if (n === STEP.hours) await patch(hoursPatch(d));
    else if (n === STEP.services) {
      let rows: ShopServiceRow[] = data.services;
      for (const { serviceId, body } of servicePuts(d, rows)) {
        const row = await api.putShopService(serviceId, body);
        rows = [...rows.filter((r) => r.serviceId !== row.serviceId), row];
        writeCache({ services: rows });
      }
    } else if (n === STEP.documents && data.uploads.configured) {
      const same =
        d.permitKey === data.shop.permitKey &&
        d.photoKeys.length === data.shop.photoKeys.length &&
        d.photoKeys.every((k, i) => k === data.shop.photoKeys[i]);
      if (!same) await patch({ ...(d.permitKey ? { permitKey: d.permitKey } : {}), photoKeys: d.photoKeys });
    }
  }

  async function submit() {
    setMissing([]);
    try {
      const shop = await api.submitShopOnboarding();
      writeCache({ shop });
      // The next visit (e.g. after a rejection) starts from fresh answers.
      void qc.invalidateQueries({ queryKey: wizardKey(me.id) });
      toast.show({ title: 'Sent for review.', body: 'We’ll call you to arrange the visit.' });
      await refresh();
    } catch (e) {
      const s = status(e);
      if (s === 400 && e instanceof Error) {
        const list = submitErrorSteps(e.message);
        if (list.length) {
          setMissing(list);
          return;
        }
      }
      if (s === 409) {
        toast.show({ tone: 'error', title: 'This registration is already with our team.' });
        await refresh();
        return;
      }
      toast.show({ tone: 'error', title: 'We couldn’t send your registration.', body: 'Check your connection, then try again.' });
    }
  }

  async function next() {
    if (!draft || saving || !online) return;
    const errs = validateStep(step, draft, data.uploads);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('.wiz [aria-invalid="true"], .wiz .field-error');
        el?.focus?.();
        el?.scrollIntoView?.({ block: 'center' });
      });
      return;
    }
    setSaving(true);
    try {
      if (step === STEP.review) {
        await submit();
        return;
      }
      await saveStep(step, draft);
      onSaved?.(Date.now());
      const to = backToReview ? STEP.review : step + 1;
      if (backToReview) setBackToReview(false);
      go(to);
    } catch (e) {
      const s = status(e);
      if (s === 409) {
        toast.show({ tone: 'error', title: 'This registration is already with our team.' });
        await refresh();
      } else {
        toast.show({
          tone: 'error',
          title: 'We couldn’t save this step.',
          body:
            s === 400
              ? 'Check your answers, then try again.'
              : 'Check your connection, then try again. Your answers are still here.',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  const props: StepProps = { draft, set, errors, data };
  const isReview = step === STEP.review;
  const label = saving
    ? isReview
      ? 'Sending…'
      : 'Saving…'
    : isReview
      ? 'Submit for review'
      : backToReview
        ? 'Save and review'
        : `Next: ${WIZARD_STEPS[step + 1]}`;

  return (
    <div className="wiz" data-testid="wizard" data-step={step}>
      {!online ? <StaleBanner message="You're offline. Your answers stay here; Next saves them once you're back online." /> : null}
      <Stepper steps={WIZARD_STEPS} current={step} />
      <h1 className="disp" ref={headRef} tabIndex={-1} style={{ outline: 'none' }}>
        {HEADLINES[step]}
      </h1>

      {step === STEP.details ? <DetailsStep {...props} /> : null}
      {step === STEP.location ? <LocationStep {...props} /> : null}
      {step === STEP.services ? <ServicesStep {...props} /> : null}
      {step === STEP.hours ? <HoursStep {...props} /> : null}
      {step === STEP.documents ? <DocumentsStep {...props} /> : null}
      {isReview ? (
        <div className="wiz-section">
          <ShopSummary
            draft={draft}
            uploadsConfigured={data.uploads.configured}
            onEdit={(n) => {
              setBackToReview(true);
              go(n);
            }}
          />
          {missing.length ? (
            <Card className="error-state" role="alert" data-testid="submit-missing">
              <h2>A few things are still missing.</h2>
              <ul className="wiz-missing">
                {missing.map((m) => (
                  <li key={m.label}>
                    <span>{m.label}</span>
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() => {
                        setBackToReview(true);
                        go(m.step);
                      }}
                    >
                      Go to step {m.step + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <CheckRow checked={draft.accurate} onChange={(accurate) => set({ accurate })} testId="accurate">
            The information above is accurate.
          </CheckRow>
          <FieldError>{errors.accurate}</FieldError>
        </div>
      ) : null}

      <div className="wiz-actions">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => go(backToReview ? STEP.review : step - 1)} disabled={saving}>
            Back
          </Button>
        ) : null}
        <Button
          onClick={() => void next()}
          disabled={saving}
          disabledReason={!online ? 'Connect to the internet to save this step.' : null}
          data-testid="wizard-next"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

export function SavedAgo({ at }: { at: number | null }) {
  const now = useNow();
  if (!at || !now) return null;
  return <small aria-live="off">saved {formatAgo(at, Math.max(now, at))}</small>;
}
