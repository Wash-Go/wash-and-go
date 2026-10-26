'use client';
import { useParams } from 'next/navigation';
import { BatchDetail } from '../../../../components/payouts/BatchDetail';

// /payouts/[id]: one payout batch with its lines and CSV export (preview C2).
export default function PayoutBatchPage() {
  const { id } = useParams<{ id: string }>();
  return <BatchDetail id={id} />;
}
