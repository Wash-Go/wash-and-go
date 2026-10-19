import { Shirt } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';

export const metadata = { title: 'Services & rates' };

export default function Page() {
  return (
    <>
      <h1 className="disp">Services & rates</h1>
      <EmptyState
        icon={Shirt}
        title="Editing services here isn't open yet."
        body="The services and rates you set when you registered are live. To change one, contact the Wash & Go team (Help → Contact ops)."
      />
    </>
  );
}
