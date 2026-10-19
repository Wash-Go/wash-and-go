import { Users } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';

export const metadata = { title: 'Staff' };

export default function Page() {
  return (
    <>
      <h1 className="disp">Staff</h1>
      <EmptyState
        icon={Users}
        title="Staff invites are coming in B4."
        body="Invite your staff by email so they can work the queue on their own phones. Owners keep money and settings."
      />
    </>
  );
}
