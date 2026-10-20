'use client';
import '../onboarding/onboarding.css';
import './shop.css';
import type { ShopProfileView } from '@wash-and-go/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useConsole } from '../console/ConsoleContext';
import { DetailsStep } from '../onboarding/DetailsStep';
import { HoursStep } from '../onboarding/HoursStep';
import { LocationStep } from '../onboarding/LocationStep';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ShopChip } from '../ui/Chip';
import { ErrorState } from '../ui/ErrorState';
import { SkeletonCard } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { useOnline } from '../../lib/live';
import { manilaDate } from '../../lib/relative-time';
import {
  hoursUnset,
  profileDraft,
  profileErrorMessage,
  sectionDirty,
  sectionPatch,
  shopMeKey,
  validateSection,
  type Section,
} from '../../lib/shop-profile';
import { hoursSummary, type StepErrors, type WizardDraft } from '../../lib/wizard';
import { LogoCard } from './LogoCard';
import { PayoutCard } from './PayoutCard';

// Which draft fields belong to each section, so saving one section never
// overwrites unsaved edits in another.
const FIELDS: Record<Section, (keyof WizardDraft)[]> = {
  profile: ['name', 'contactPhone', 'description'],
  location: ['address', 'lat', 'lng'],
  hours: ['hours', 'expressSlots'],
};

const TITLES: Record<Section, string> = {
  profile: 'Profile',
  location: 'Address and pin',
  hours: 'Hours and capacity',
};

// /shop (plan A4 "Shop", preview B8). OWNER edits each section with its own
// Save (PATCH /shop/me); STAFF see the same facts read-only.
export function ShopProfile() {
  const { me } = useConsole();
  const q = useQuery({
    queryKey: shopMeKey(me.id),
    queryFn: () => api.shopMe(),
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  if (q.isError && !q.data) {
    return <ErrorState title="We couldn't load your shop." onRetry={() => void q.refetch()} />;
  }
  if (!q.data) {
    return (
      <div className="shop-page" aria-busy="true">
        <SkeletonCard label="Loading your shop" />
        <SkeletonCard label="Loading your shop" />
      </div>
    );
  }
  return q.data.myRole === 'OWNER' ? <OwnerView view={q.data} /> : <StaffView view={q.data} />;
}

function StatusCard({ view }: { view: ShopProfileView }) {
  const { shop } = useConsole();
  const verified = view.status === 'VERIFIED';
  return (
    <Card className="shop-status" data-testid="shop-status">
      <div>
        <b>{verified ? 'Verified partner' : 'Not verified yet'}</b>
        <div className="small muted">
          {verified && view.verifiedAt ? `since ${manilaDate(view.verifiedAt)}` : 'Orders open once our team verifies your shop.'}
        </div>
        {shop?.documentsPending ? <div className="small muted">We&rsquo;ll check your permit in person.</div> : null}
      </div>
      <ShopChip status={view.status} />
    </Card>
  );
}

// Whether logo upload is open (R2 configured). Not polled.
function useUploadsConfigured(): boolean {
  const { me } = useConsole();
  const q = useQuery({
    queryKey: ['uploads-status', me.id],
    queryFn: () => api.uploadsStatus(),
    refetchInterval: false,
    staleTime: 5 * 60_000,
  });
  return !!q.data?.configured;
}

function OwnerView({ view }: { view: ShopProfileView }) {
  const { me } = useConsole();
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [draft, setDraft] = useState<WizardDraft>(() => profileDraft(view));
  const [errors, setErrors] = useState<Partial<Record<Section, StepErrors>>>({});
  const [saving, setSaving] = useState<Section | null>(null);
  const [onboarding, setOnboarding] = useState<string | null>(null);
  const uploadsConfigured = useUploadsConfigured();

  const set = (patch: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...patch }));

  // A refetch (e.g. after reconnecting) updates sections with no local edits.
  useEffect(() => {
    setDraft((d) => {
      const fresh = profileDraft(view);
      const next = { ...d };
      for (const s of Object.keys(FIELDS) as Section[]) {
        if (!sectionDirty(s, d, view)) for (const k of FIELDS[s]) (next as Record<string, unknown>)[k] = fresh[k];
      }
      return next;
    });
  }, [view]);

  async function save(s: Section) {
    const errs = validateSection(s, draft);
    setErrors((e) => ({ ...e, [s]: errs }));
    if (Object.keys(errs).length) return;
    setSaving(s);
    setOnboarding(null);
    try {
      const updated = await api.updateShopMe(sectionPatch(s, draft));
      qc.setQueryData(shopMeKey(me.id), updated);
      const fresh = profileDraft(updated);
      setDraft((d) => {
        const next = { ...d };
        for (const k of FIELDS[s]) (next as Record<string, unknown>)[k] = fresh[k];
        return next;
      });
      toast.show({ title: `${TITLES[s]} saved.` });
    } catch (e) {
      const m = profileErrorMessage(e);
      if (m.onboarding) setOnboarding(m.text);
      else toast.show({ tone: 'error', title: m.text });
    } finally {
      setSaving(null);
    }
  }

  const section = (s: Section, body: ReactNode) => {
    const dirty = sectionDirty(s, draft, view);
    return (
      <Card className="shop-card" data-testid={`shop-${s}`}>
        <div className="shop-card-head">
          <h2>{TITLES[s]}</h2>
        </div>
        <fieldset disabled={!online || saving === s}>{body}</fieldset>
        {dirty ? (
          <div className="shop-actions">
            <Button
              onClick={() => void save(s)}
              disabled={saving === s}
              disabledReason={!online ? 'Connect to the internet to save.' : null}
            >
              {saving === s ? 'Saving…' : `Save ${TITLES[s].toLowerCase()}`}
            </Button>
            <Button
              variant="text"
              disabled={saving === s}
              onClick={() => {
                const fresh = profileDraft(view);
                setDraft((d) => {
                  const next = { ...d };
                  for (const k of FIELDS[s]) (next as Record<string, unknown>)[k] = fresh[k];
                  return next;
                });
                setErrors((e) => ({ ...e, [s]: {} }));
              }}
            >
              Discard changes
            </Button>
          </div>
        ) : null}
      </Card>
    );
  };

  const fieldProps = (s: Section) => ({ draft, set, errors: errors[s] ?? {} });

  return (
    <div className="shop-page" data-testid="shop-page">
      <StatusCard view={view} />
      <LogoCard
        name={view.name}
        logoUrl={view.logoUrl}
        hasLogo={!!view.logoKey}
        uploadsConfigured={uploadsConfigured}
        onSave={async (logoKey) => {
          const updated = await api.updateShopMe({ logoKey });
          qc.setQueryData(shopMeKey(me.id), updated);
        }}
      />
      {onboarding ? (
        <div className="notice notice-warn" role="alert">
          {onboarding} <Link href="/onboarding">Open the registration form</Link>
        </div>
      ) : null}
      {section('profile', <DetailsStep {...fieldProps('profile')} />)}
      {section('location', <LocationStep {...fieldProps('location')} />)}
      {section(
        'hours',
        <>
          {hoursUnset(view) && !sectionDirty('hours', draft, view) ? (
            <div className="row" data-testid="hours-unset">
              <p className="small muted">Your opening hours aren&rsquo;t set yet. These are the usual defaults.</p>
              <Button variant="secondary" onClick={() => void save('hours')} disabled={saving === 'hours' || !online}>
                Save these hours
              </Button>
            </div>
          ) : null}
          <HoursStep {...fieldProps('hours')} />
        </>,
      )}
      <PayoutCard account={view.payoutAccount} owner />
    </div>
  );
}

function StaffView({ view }: { view: ShopProfileView }) {
  const d = profileDraft(view);
  return (
    <div className="shop-page" data-testid="shop-page">
      <StatusCard view={view} />
      <LogoCard name={view.name} logoUrl={view.logoUrl} hasLogo={!!view.logoKey} uploadsConfigured={false} readOnly />
      <Card className="shop-card">
        <div className="shop-card-head">
          <h2>{view.name}</h2>
        </div>
        <dl className="kv">
          <dt>Phone</dt>
          <dd className="mono">{d.contactPhone || '—'}</dd>
          <dt>Address</dt>
          <dd>{view.address || '—'}</dd>
          {view.description ? (
            <>
              <dt>About</dt>
              <dd>{view.description}</dd>
            </>
          ) : null}
          {hoursSummary(d.hours).map((g) => (
            <div key={g.days} style={{ display: 'contents' }}>
              <dt>{g.days}</dt>
              <dd className="mono">{g.hours}</dd>
            </div>
          ))}
          <dt>Express</dt>
          <dd>
            <span className="mono">{view.expressSlotsPerDay}</span> a day
          </dd>
        </dl>
        <p className="small muted">Ask the owner to change this.</p>
      </Card>
      <PayoutCard account={null} owner={false} />
    </div>
  );
}
