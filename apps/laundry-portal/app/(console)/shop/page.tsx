import { Store } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';

export const metadata = { title: 'Shop' };

export default function Page() {
  return (
    <>
      <h1 className="disp">Shop</h1>
      <EmptyState
        icon={Store}
        title="Your shop profile is coming in B4."
        body="Name, address and map pin, hours, capacity and payout account will live here. To change anything today, contact the Wash & Go team."
      />
    </>
  );
}
