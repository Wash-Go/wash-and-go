import { CircleHelp } from 'lucide-react';
import { InstallCard } from '../../../components/InstallCard';
import { EmptyState } from '../../../components/ui/EmptyState';

export const metadata = { title: 'Help' };

export default function HelpPage() {
  return (
    <div className="stack">
      <h1 className="disp">Help</h1>
      <InstallCard />
      <EmptyState
        icon={CircleHelp}
        title="The help guide is coming in B6."
        body="How an order moves, the weigh-in rules, how payouts work, and how to reach the Wash & Go team."
      />
    </div>
  );
}
