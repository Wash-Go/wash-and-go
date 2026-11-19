'use client';
import type { PendingInviteView } from '@wash-and-go/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { useConsole } from '../console/ConsoleContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { acceptOutcome, inviteHeadline } from '../../lib/invites';
import { manilaDate } from '../../lib/relative-time';
import { pendingInvitesKey } from './usePendingInvites';

// "X invited you to join their team" (plan A3 flow 6: explicit accept).
// Accept → POST /shop/invites/:id/accept, then the boot query re-runs so the
// gate routes to Orders. A 409 (already in a shop) shows the reason here.
export function InviteCard({ invite, onNotNow }: { invite: PendingInviteView; onNotNow: () => void }) {
  const { me, refresh } = useConsole();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setMessage(null);
    let error: unknown = null;
    try {
      await api.acceptInvite(invite.id);
    } catch (e) {
      error = e;
    }
    const out = acceptOutcome(error);
    if (out.kind === 'refresh') {
      if (out.note) toast.show({ tone: 'error', title: out.note });
      else toast.show({ title: `You joined ${invite.shopName}.` });
      await qc.invalidateQueries({ queryKey: pendingInvitesKey(me.id) });
      await refresh();
    } else {
      setMessage(out.message);
    }
    setBusy(false);
  }

  return (
    <Card className="stack" data-testid="invite-card" role="region" aria-label="Staff invite">
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <Users aria-hidden="true" size={22} style={{ color: 'var(--navy)', flex: 'none', marginTop: 2 }} />
        <div>
          <b>{inviteHeadline(invite)}</b>
          <div className="small muted">
            Sent {manilaDate(invite.createdAt)}. As staff you work the order queue; the owner keeps money and settings.
          </div>
        </div>
      </div>
      {message ? (
        <p className="field-error" role="alert">
          {message}
        </p>
      ) : null}
      <div className="row">
        <Button onClick={() => void accept()} disabled={busy}>
          {busy ? 'Joining…' : 'Accept'}
        </Button>
        <Button variant="text" onClick={onNotNow} disabled={busy}>
          Not now
        </Button>
      </div>
    </Card>
  );
}
