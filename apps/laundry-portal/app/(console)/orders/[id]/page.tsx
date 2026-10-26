'use client';
import type { OrderView } from '@wash-and-go/domain';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { OrderDetail } from '../../../../components/orders/OrderDetail';
import { WeighSheet } from '../../../../components/orders/WeighSheet';

// /orders/[id]: the order detail as its own route so it deep-links (plan A2).
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [weighing, setWeighing] = useState<OrderView | null>(null);
  return (
    <>
      <OrderDetail id={id} onWeigh={setWeighing} />
      {weighing ? <WeighSheet key={weighing.id} order={weighing} onClose={() => setWeighing(null)} /> : null}
    </>
  );
}
