'use client';
import '../onboarding/onboarding.css';
import '../shop/shop.css';
import type { ShopCatalogItem, ShopServiceRow } from '@wash-and-go/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shirt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConsole } from '../console/ConsoleContext';
import { ServicesStep } from '../onboarding/ServicesStep';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SkeletonCard } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { useOnline } from '../../lib/live';
import { serviceRowLine, serviceSaveError, servicesDirty, servicesFromServer, validateServices } from '../../lib/services-page';
import { shopMeKey } from '../../lib/shop-profile';
import { staffAccess } from '../../lib/staff';
import { servicePuts, type StepErrors } from '../../lib/wizard';
import type { ServiceDraft } from '../../lib/wizard-services';

const servicesKey = (uid: string) => ['shop-services', uid] as const;
const catalogKey = (uid: string) => ['shop-catalog', uid] as const;

// /services (plan A2/A4 "Services"): the catalog with your rate, unit,
// turnaround and on/off. OWNER edits with the wizard's rows and one Save
// (PUT /shop/services/:serviceId per changed row, active always sent);
// STAFF see the live rates read-only. Role from GET /shop/me myRole.
export function ServicesPage() {
  const { me } = useConsole();
  const shopMe = useQuery({ queryKey: shopMeKey(me.id), queryFn: () => api.shopMe(), refetchInterval: false });
  const access = staffAccess(shopMe.data?.myRole);
  const catalog = useQuery({
    queryKey: catalogKey(me.id),
    queryFn: () => api.shopCatalog(),
    refetchInterval: false,
    staleTime: 5 * 60_000,
  });
  const services = useQuery({ queryKey: servicesKey(me.id), queryFn: () => api.shopServices(), refetchInterval: false });

  const failed = (shopMe.isError && !shopMe.data) || (catalog.isError && !catalog.data) || (services.isError && !services.data);
  if (failed) {
    return (
      <ErrorState
        title="We couldn't load your services."
        onRetry={() => {
          void shopMe.refetch();
          void catalog.refetch();
          void services.refetch();
        }}
      />
    );
  }
  if (!access.known || !catalog.data || !services.data) {
    return (
      <div className="shop-page" aria-busy="true">
        <SkeletonCard label="Loading your services" />
      </div>
    );
  }
  return access.manage ? (
    <OwnerServices catalog={catalog.data} rows={services.data} />
  ) : (
    <StaffServices rows={services.data} />
  );
}

function OwnerServices({ catalog, rows }: { catalog: ShopCatalogItem[]; rows: ShopServiceRow[] }) {
  const { me } = useConsole();
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [services, setServices] = useState<ServiceDraft[]>(() => servicesFromServer(catalog, rows));
  const [errors, setErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const dirty = servicesDirty(services, rows);

  // A refetch replaces the form only while there are no local edits.
  useEffect(() => {
    setServices((cur) => (servicesDirty(cur, rows) ? cur : servicesFromServer(catalog, rows)));
  }, [catalog, rows]);

  async function save() {
    const errs = validateServices(services);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    let saved = rows;
    try {
      for (const { serviceId, body } of servicePuts({ services }, rows)) {
        const row = await api.putShopService(serviceId, body);
        saved = [...saved.filter((r) => r.serviceId !== row.serviceId), row];
      }
      qc.setQueryData(servicesKey(me.id), saved);
      setServices(servicesFromServer(catalog, saved));
      toast.show({ title: 'Rates saved.', body: 'New bookings use these rates.' });
    } catch (e) {
      // Rows saved before the failure stay saved; show them as they are now.
      qc.setQueryData(servicesKey(me.id), saved);
      toast.show({ tone: 'error', title: serviceSaveError(e) });
      const s = (e as { status?: unknown } | null)?.status;
      if (s === 404 || s === 409) void qc.invalidateQueries({ queryKey: servicesKey(me.id) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shop-page" data-testid="services-page">
      <fieldset disabled={!online || saving} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <ServicesStep
          draft={{ services }}
          set={(p) => setServices(p.services)}
          errors={errors}
          note="Customers see these rates when they book. A change applies to new bookings, not to orders already placed."
        />
      </fieldset>
      {dirty ? (
        <div className="sticky-action shop-actions">
          <Button
            variant="text"
            disabled={saving}
            onClick={() => {
              setServices(servicesFromServer(catalog, rows));
              setErrors({});
            }}
          >
            Discard changes
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving}
            disabledReason={!online ? 'Connect to the internet to save.' : null}
            data-testid="services-save"
          >
            {saving ? 'Saving…' : 'Save rates'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StaffServices({ rows }: { rows: ShopServiceRow[] }) {
  return (
    <div className="shop-page" data-testid="services-page">
      {rows.length ? (
        <Card className="shop-card">
          <ul className="list">
            {rows.map((r) => (
              <li key={r.id} data-testid={`service-${r.code}`}>
                <div className="li-main">
                  <b>{r.name}</b>
                  <span className="mono">{serviceRowLine(r)}</span>
                </div>
                <Chip
                  spec={r.active ? { label: 'Offered', tone: 'done', icon: 'check' } : { label: 'Off', tone: 'cancel', icon: 'x' }}
                />
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState icon={Shirt} title="No services set yet." body="The owner sets the services and rates." />
      )}
      <p className="small muted">Ask the owner to change rates.</p>
    </div>
  );
}
