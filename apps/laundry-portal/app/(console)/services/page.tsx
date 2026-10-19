import { Shirt } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';

export const metadata = { title: 'Services & rates' };

export default function Page() {
  return (
    <>
      <h1 className="disp">Services & rates</h1>
      <EmptyState
        icon={Shirt}
        title="Services and rates are coming in B4."
        body="Set what you offer, your rate per kg or per piece, and turnaround. Until then, the Wash & Go team sets your rates with you."
      />
    </>
  );
}
