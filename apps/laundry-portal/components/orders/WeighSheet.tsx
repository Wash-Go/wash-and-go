'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { peso, type OrderView } from '@wash-and-go/domain';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { mutationErrorMessage, shouldRefreshQueue } from '../../lib/mutation-errors';
import { ORDERS_KEY } from '../../lib/order-queries';
import { firstName, loadLabel, serviceLabel } from '../../lib/queue';
import { parseWeight } from '../../lib/shop';
import {
  confirmLabel,
  estimateNote,
  formatKg,
  orderEstimateKg,
  scaleCheckHint,
  washLine,
  WEIGH_RANGE_HINT,
  weighCheck,
} from '../../lib/weigh';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { Sheet } from '../ui/Sheet';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';
import { Breakdown } from './Breakdown';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

// Weigh sheet (preview B3, B3b; plan A4 "Weigh-in"). Bottom sheet on a phone,
// the 440px side panel from 1024px. The live breakdown comes from
// POST /orders/preview at the same pickup point the weigh-in prices with, so
// the total on the button is the one the customer is billed.
export function WeighSheet({ order, onClose }: { order: OrderView; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [input, setInput] = useState('');
  // Second confirm is keyed by the kg it was armed for: an edit disarms it.
  const [armedKg, setArmedKg] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const v = parseWeight(input.trim().replace(',', '.'));
  const typed = input.trim() !== '';
  const debouncedKg = useDebounced(v.ok ? v.kg : null, 400);
  const settled = v.ok && debouncedKg === v.kg;
  const check = v.ok ? weighCheck(v.kg, orderEstimateKg(order)) : null;
  const armed = v.ok && armedKg === v.kg;
  const short = order.code.slice(-4);
  const name = firstName(order.customer?.displayName);

  const lat = order.pickupLat != null ? Number(order.pickupLat) : null;
  const lng = order.pickupLng != null ? Number(order.pickupLng) : null;
  const preview = useQuery({
    queryKey: ['weigh-preview', order.shopServiceId, debouncedKg, lat, lng],
    enabled: debouncedKg != null && order.shopServiceId != null,
    queryFn: () =>
      api.previewOrder({
        shopServiceId: order.shopServiceId!,
        weightKg: debouncedKg!,
        ...(lat != null && lng != null ? { pickupLat: lat, pickupLng: lng } : {}),
      }),
    staleTime: 60_000,
    refetchInterval: false,
    retry: 1,
  });
  const priced = settled && preview.data && !preview.isFetching ? preview.data : null;

  const save = useMutation({
    mutationFn: (kg: number) => api.weigh(order.id, kg),
    onMutate: () => setSaveError(null),
    onSuccess: (saved, kg) => {
      toast.show({
        title: `Order ${short} weighed: ${formatKg(kg)} kg.`,
        body: `New total ${peso(saved.customerTotalPhp)}. ${name || 'The customer'} will be told.`,
      });
      void qc.invalidateQueries({ queryKey: ORDERS_KEY });
      onClose();
    },
    onError: (e) => {
      if (shouldRefreshQueue(e)) void qc.invalidateQueries({ queryKey: ORDERS_KEY });
      setSaveError(mutationErrorMessage('weigh', e));
    },
  });

  const onConfirm = () => {
    if (!v.ok || !priced) return;
    if (check?.needsSecondConfirm && !armed) setArmedKg(v.kg);
    else save.mutate(v.kg);
  };

  const reason = !typed
    ? 'Enter the weight on the scale first.'
    : !v.ok
      ? null
      : preview.isError && settled
        ? null
        : !priced
          ? 'Working out the new price…'
          : null;

  const meta = ['Weigh', serviceLabel(order.serviceType), loadLabel(order)].filter(Boolean).join(' · ');
  const breakdown = priced ? (
    <Breakdown
      wash={washLine(v.kg, priced.washValuePhp)}
      washValuePhp={priced.washValuePhp}
      deliveryFeePhp={priced.deliveryFeePhp}
      serviceFeePhp={priced.serviceFeePhp}
      customerTotalPhp={priced.customerTotalPhp}
    />
  ) : v.ok && !(preview.isError && settled) ? (
    <div className="bd" aria-busy="true">
      <span className="sr-only">Working out the new price</span>
      <Skeleton width="100%" height={18} style={{ marginTop: 10 }} />
      <Skeleton width="100%" height={18} />
      <Skeleton width="60%" height={24} />
    </div>
  ) : null;

  return (
    <Sheet open onClose={onClose} title={`Order ${short}${name ? ` · ${name}` : ''}`}>
      <div className="weigh" data-testid="weigh-sheet">
        <div className="lbl">{meta}</div>

        {armed && check?.confirmPrompt ? (
          <>
            <div className="field">
              <div className="field-label">Weight on the scale</div>
              <div className="money money-warn" data-testid="weigh-readback">
                <span className="money-read">{formatKg(v.kg)}</span>
                <span className="unit">kg</span>
              </div>
            </div>
            <div className="warnbox" role="alert">
              <TriangleAlert aria-hidden="true" />
              <div>
                <b>{check.confirmPrompt}</b>
                {scaleCheckHint(v.kg)}
              </div>
            </div>
            {breakdown}
          </>
        ) : (
          <>
            <MoneyInput
              label="Weight on the scale"
              unit="kg"
              value={input}
              data-autofocus=""
              placeholder="0.0"
              onChange={(e) => {
                setInput(e.target.value);
                setSaveError(null);
              }}
              error={typed && !v.ok ? WEIGH_RANGE_HINT : null}
              hint={order.weightKg != null ? `Weighed before: ${formatKg(Number(order.weightKg))} kg` : null}
            />
            {breakdown}
            {preview.isError && settled ? (
              <div className="field-error" role="alert">
                {mutationErrorMessage('preview', preview.error)}{' '}
                <button type="button" className="btn btn-text" onClick={() => void preview.refetch()}>
                  Try again
                </button>
              </div>
            ) : null}
            {check?.deltaText && !check.deltaText.startsWith('Matches') ? (
              <div className="warnbox" data-testid="weigh-delta">
                <TriangleAlert aria-hidden="true" />
                <div>
                  <b>{check.deltaText}</b>
                  {estimateNote(name, order.customerTotalPhp)}
                </div>
              </div>
            ) : null}
          </>
        )}

        {saveError ? (
          <div className="field-error" role="alert">
            {saveError}
          </div>
        ) : null}

        <div className="stack weigh-actions">
          <Button
            full
            onClick={onConfirm}
            disabled={!v.ok || !priced || save.isPending}
            disabledReason={reason}
            aria-busy={save.isPending || undefined}
          >
            {save.isPending ? 'Saving…' : priced ? confirmLabel(priced.customerTotalPhp, armed) : 'Confirm'}
          </Button>
          {armed ? (
            <Button variant="secondary" full onClick={() => setArmedKg(null)} disabled={save.isPending}>
              Change the weight
            </Button>
          ) : (
            <Button variant="text" onClick={onClose} disabled={save.isPending}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
