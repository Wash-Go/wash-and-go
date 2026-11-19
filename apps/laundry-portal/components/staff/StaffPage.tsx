'use client';
import '../shop/shop.css';
import type { ShopInviteView, ShopMemberView } from '@wash-and-go/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MailPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { TextField } from '../auth/TextField';
import { useConsole } from '../console/ConsoleContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Sheet } from '../ui/Sheet';
import { SkeletonCard } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { inviteEmailError, inviteErrorMessage } from '../../lib/invites';
import { shopMeKey } from '../../lib/shop-profile';
import { staffAccess } from '../../lib/staff';
import { useOnline } from '../../lib/live';
import { manilaDate } from '../../lib/relative-time';

const membersKey = (uid: string) => ['shop-members', uid] as const;
const invitesKey = (uid: string) => ['shop-invites', uid] as const;

type Pending =
  | { kind: 'member'; member: ShopMemberView }
  | { kind: 'invite'; invite: ShopInviteView };

// /staff (plan A4 "Staff"). OWNER: members with Remove (staff only), open
// invites with Revoke, "Invite by email". STAFF: the member list, read-only.
export function StaffPage() {
  const { me } = useConsole();
  // Shop-scoped role (GET /shop/me myRole), not the account's global roles.
  const shopMe = useQuery({ queryKey: shopMeKey(me.id), queryFn: () => api.shopMe(), refetchInterval: false });
  const access = staffAccess(shopMe.data?.myRole);
  const owner = access.manage;
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const members = useQuery({ queryKey: membersKey(me.id), queryFn: () => api.shopMembers(), refetchInterval: false });
  const invites = useQuery({
    queryKey: invitesKey(me.id),
    queryFn: () => api.shopInvites(),
    enabled: owner,
    refetchInterval: false,
  });
  const [sheet, setSheet] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendInvite() {
    const err = inviteEmailError(email);
    setEmailError(err);
    if (err) return;
    setSending(true);
    try {
      const inv = await api.createShopInvite(email.trim().toLowerCase());
      qc.setQueryData<ShopInviteView[]>(invitesKey(me.id), (old) => [...(old ?? []).filter((i) => i.id !== inv.id), inv]);
      toast.show({ title: 'Invite saved.', body: `Tell ${inv.email} to sign in to the portal with that email.` });
      setSheet(false);
      setEmail('');
    } catch (e) {
      setEmailError(inviteErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'member') {
        await api.removeStaffMember(confirm.member.id);
        qc.setQueryData<ShopMemberView[]>(membersKey(me.id), (old) => (old ?? []).filter((m) => m.id !== confirm.member.id));
        toast.show({ title: `${confirm.member.name || 'Staff member'} removed.` });
      } else {
        await api.revokeShopInvite(confirm.invite.id);
        qc.setQueryData<ShopInviteView[]>(invitesKey(me.id), (old) => (old ?? []).filter((i) => i.id !== confirm.invite.id));
        toast.show({ title: 'Invite revoked.' });
      }
    } catch (e) {
      const s = (e as { status?: unknown } | null)?.status;
      if (s === 404) {
        void members.refetch();
        if (owner) void invites.refetch();
        toast.show({ tone: 'error', title: 'That was already changed. The list is up to date now.' });
      } else {
        toast.show({ tone: 'error', title: 'That didn’t go through.', body: 'Check your connection, then try again.' });
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <div className="shop-page" data-testid="staff-page">
      <p className="small muted" style={{ marginTop: -4 }}>
        {!access.known
          ? 'Your team.'
          : owner
          ? 'Staff work the order queue on their own phones. Owners keep money and settings.'
          : 'Your team. Only the owner can invite or remove people.'}
      </p>
      {owner ? (
        <Button
          icon={<MailPlus aria-hidden="true" />}
          onClick={() => {
            setEmailError(null);
            setSheet(true);
          }}
          disabledReason={!online ? 'Connect to the internet to invite someone.' : null}
          style={{ alignSelf: 'flex-start' }}
        >
          Invite by email
        </Button>
      ) : null}

      <Card className="shop-card" data-testid="members">
        <div className="shop-card-head">
          <h2>Team</h2>
        </div>
        {members.isError && !members.data ? (
          <ErrorState title="We couldn't load your team." onRetry={() => void members.refetch()} />
        ) : !members.data ? (
          <SkeletonCard label="Loading your team" />
        ) : (
          <ul className="list">
            {members.data.map((m) => (
              <li key={m.id} data-testid={`member-${m.id}`}>
                <div className="li-main">
                  <b>{m.name || m.email || 'Team member'}</b>
                  <span>
                    {m.email && m.name ? `${m.email} · ` : ''}joined {manilaDate(m.joinedAt)}
                  </span>
                </div>
                <Chip spec={{ label: m.role === 'OWNER' ? 'Owner' : 'Staff', tone: m.role === 'OWNER' ? 'move' : 'cancel', icon: m.role === 'OWNER' ? 'store' : 'shirt' }} />
                {owner && m.role === 'STAFF' ? (
                  <Button variant="text" onClick={() => setConfirm({ kind: 'member', member: m })} disabled={!online}>
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {owner ? (
        <Card className="shop-card" data-testid="invites">
          <div className="shop-card-head">
            <h2>Pending invites</h2>
          </div>
          {invites.isError && !invites.data ? (
            <ErrorState title="We couldn't load your invites." onRetry={() => void invites.refetch()} />
          ) : !invites.data ? (
            <SkeletonCard label="Loading invites" />
          ) : invites.data.length ? (
            <ul className="list">
              {invites.data.map((i) => (
                <li key={i.id} data-testid="invite-row">
                  <div className="li-main">
                    <b>{i.email}</b>
                    <span>sent {manilaDate(i.createdAt)}</span>
                  </div>
                  <Button variant="text" onClick={() => setConfirm({ kind: 'invite', invite: i })} disabled={!online}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} headingLevel={3} title="No open invites." body="Invite a staff member by email to get them on the queue." />
          )}
          <p className="small muted">
            How it works: they sign in to the portal with this email, verify it, and accept. We don&rsquo;t email them
            yet, so let them know.
          </p>
        </Card>
      ) : null}

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Invite by email">
        <form
          className="sheet-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void sendInvite();
          }}
        >
          <TextField
            label="Their email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            placeholder="ana@gmail.com"
            value={email}
            onValue={setEmail}
            error={emailError}
            hint="They sign in to the portal with this email, verify it, and accept."
          />
          <Button type="submit" full disabled={sending}>
            {sending ? 'Sending…' : 'Send invite'}
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirm?.kind === 'member'}
        title={`Remove ${confirm?.kind === 'member' ? confirm.member.name || 'this person' : ''} from your team?`}
        body="They lose access to your orders right away. You can invite them again later."
        confirmLabel={busy ? 'Removing…' : 'Remove'}
        destructive
        busy={busy}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'invite'}
        title="Revoke this invite?"
        body={`${confirm?.kind === 'invite' ? confirm.invite.email : 'They'} won’t be able to join with it. You can invite them again later.`}
        confirmLabel={busy ? 'Revoking…' : 'Revoke'}
        destructive
        busy={busy}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
