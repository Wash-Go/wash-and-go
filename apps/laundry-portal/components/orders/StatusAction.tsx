'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { STATUS_META, type OrderView } from '@wash-and-go/domain';
import { Package, Scale, Shirt } from 'lucide-react';
import { api } from '../../lib/api';
import { mutationErrorMessage, shouldRefreshQueue } from '../../lib/mutation-errors';
import { ORDERS_KEY } from '../../lib/order-queries';
import { primaryAction, type ActionIcon } from '../../lib/queue';
import { Button, type ButtonVariant } from '../ui/Button';
import { useToast } from '../ui/Toast';

const ICONS: Record<ActionIcon, typeof Scale> = { scale: Scale, shirt: Shirt, package: Package };

// The one primary action for an order (card and detail): Weigh opens the
// weigh sheet; a status step posts the transition with a toast either way.
export function StatusAction({
  order,
  onWeigh,
  variant = 'primary',
  full,
}: {
  order: OrderView;
  onWeigh: (o: OrderView) => void;
  variant?: ButtonVariant;
  full?: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const action = primaryAction(order);
  const short = order.code.slice(-4);
  const m = useMutation({
    mutationFn: (to: Parameters<typeof api.transition>[1]) => api.transition(order.id, to),
    onSuccess: (_saved, to) => {
      toast.show({ title: `Order ${short}: ${STATUS_META[to].label}.` });
      void qc.invalidateQueries({ queryKey: ORDERS_KEY });
    },
    onError: (e) => {
      if (shouldRefreshQueue(e)) void qc.invalidateQueries({ queryKey: ORDERS_KEY });
      toast.show({ tone: 'error', title: mutationErrorMessage('status', e) });
    },
  });
  if (!action) return null;
  const Icon = ICONS[action.icon];
  return (
    <Button
      variant={variant}
      full={full}
      className="oc-action"
      icon={<Icon aria-hidden="true" />}
      disabled={m.isPending}
      aria-busy={m.isPending || undefined}
      onClick={() => (action.kind === 'weigh' ? onWeigh(order) : m.mutate(action.to))}
    >
      {m.isPending ? 'Updating…' : action.label}
    </Button>
  );
}
