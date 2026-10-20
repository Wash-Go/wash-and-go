'use client';
import { usePathname } from 'next/navigation';
import { useConsole } from '../console/ConsoleContext';
import { shellInvite } from '../../lib/invites';
import { InviteCard } from './InviteCard';
import { useDismissedInvites, usePendingInvites } from './usePendingInvites';

// Shell banner (Orders) for someone who already has a shop and
// also has an open invite. The API answers 409 to the accept today (one shop
// per account); the card shows that reason. Mounted from the console layout.
export function InviteBanner() {
  const { gate } = useConsole();
  const pathname = usePathname();
  const pending = usePendingInvites();
  const [dismissed, dismiss] = useDismissedInvites();
  if (gate.kind === 'not-a-shop') return null;
  // On Orders only, so it never crowds a form.
  if (pathname !== '/') return null;
  const invite = shellInvite({ invites: pending.data ?? [], dismissed });
  if (!invite) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <InviteCard invite={invite} onNotNow={() => dismiss(invite.id)} />
    </div>
  );
}
