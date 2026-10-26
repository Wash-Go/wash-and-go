'use client';
import './shop.css';
import type { PayoutAccountView, PayoutMethod } from '@wash-and-go/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { TextField } from '../auth/TextField';
import { useConsole } from '../console/ConsoleContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { useOnline } from '../../lib/live';
import { emptyPayoutForm, METHOD_LABEL, payoutBody, payoutLine, validatePayout, type PayoutForm } from '../../lib/payout';
import { manilaDate } from '../../lib/relative-time';
import { shopMeKey } from '../../lib/shop-profile';

// Payout account (OWNER only). Shows the masked line the API returns; the
// full number exists only in the open form and is dropped when it closes.
export function PayoutCard({ account, owner }: { account: PayoutAccountView | null; owner: boolean }) {
  const { me } = useConsole();
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PayoutForm>(emptyPayoutForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<'save' | 'remove' | null>(null);
  const [busy, setBusy] = useState(false);

  if (!owner) {
    return (
      <Card className="shop-card" data-testid="payout-card">
        <div className="shop-card-head">
          <h2>Payout account</h2>
        </div>
        <p className="small muted">Managed by the owner.</p>
      </Card>
    );
  }

  const writeAccount = (payoutAccount: PayoutAccountView | null) =>
    qc.setQueryData(shopMeKey(me.id), (old: { payoutAccount: PayoutAccountView | null } | undefined) =>
      old ? { ...old, payoutAccount } : old,
    );

  const close = () => {
    setEditing(false);
    setForm(emptyPayoutForm());
    setErrors({});
  };

  const open = () => {
    setForm(emptyPayoutForm(account?.method ?? 'GCASH'));
    setErrors({});
    setEditing(true);
  };

  async function put() {
    setBusy(true);
    try {
      const saved = await api.putPayoutAccount(payoutBody(form));
      writeAccount(saved);
      setConfirm(null);
      close();
      toast.show({ title: 'Payout account saved.', body: payoutLine(saved) });
    } catch (e) {
      setConfirm(null);
      const s = (e as { status?: unknown } | null)?.status;
      toast.show({
        tone: 'error',
        title: s === 400 ? 'Check the account details, then try again.' : 'We couldn’t save the payout account.',
        body: s === 400 ? undefined : 'Check your connection, then try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deletePayoutAccount();
      writeAccount(null);
      toast.show({ title: 'Payout account removed.' });
    } catch {
      toast.show({ tone: 'error', title: 'We couldn’t remove the payout account.', body: 'Check your connection, then try again.' });
    } finally {
      setConfirm(null);
      setBusy(false);
    }
  }

  const setField = (k: keyof PayoutForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setMethod = (method: PayoutMethod) => {
    setForm((f) => ({ ...f, method, accountNumber: '' }));
    setErrors({});
  };

  return (
    <Card className="shop-card" data-testid="payout-card">
      <div className="shop-card-head">
        <h2>Payout account</h2>
        <span className="small muted">Owner only</span>
      </div>
      {account ? (
        <div>
          <div className="payout-line mono" data-testid="payout-line">
            {payoutLine(account)}
          </div>
          <div className="small muted">
            {account.accountName}
            {account.updatedAt ? ` · updated ${manilaDate(account.updatedAt)}` : ''}
          </div>
        </div>
      ) : (
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <Wallet aria-hidden="true" size={22} style={{ color: 'var(--navy)', flex: 'none' }} />
          <p className="small">
            <b>No payout account yet.</b> Ops can&rsquo;t send your payouts until this is set.
          </p>
        </div>
      )}
      <div className="shop-actions">
        <Button
          variant="secondary"
          onClick={open}
          disabledReason={!online ? 'Connect to the internet to change this.' : null}
        >
          {account ? 'Change payout account' : 'Add payout account'}
        </Button>
        {account ? (
          <Button variant="text" onClick={() => setConfirm('remove')} disabled={!online}>
            Remove
          </Button>
        ) : null}
      </div>

      <Sheet open={editing} onClose={close} title={account ? 'Change payout account' : 'Add payout account'}>
        <form
          className="sheet-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const errs = validatePayout(form);
            setErrors(errs);
            if (!Object.keys(errs).length) setConfirm('save');
          }}
        >
          <div className="field">
            <span className="field-label" id="payout-method">
              Send payouts to
            </span>
            <div className="seg" role="radiogroup" aria-labelledby="payout-method">
              {(['GCASH', 'BANK'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={form.method === m} onClick={() => setMethod(m)}>
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <TextField
            label="Account name"
            autoComplete="name"
            value={form.accountName}
            onValue={setField('accountName')}
            error={errors.accountName}
            hint="The name on the GCash or bank account."
          />
          {form.method === 'BANK' ? (
            <TextField label="Bank" value={form.bankName} onValue={setField('bankName')} error={errors.bankName} placeholder="e.g. BPI" />
          ) : null}
          <TextField
            label={form.method === 'GCASH' ? 'GCash number' : 'Account number'}
            type={form.method === 'GCASH' ? 'tel' : 'text'}
            inputMode={form.method === 'GCASH' ? 'tel' : 'numeric'}
            autoComplete="off"
            placeholder={form.method === 'GCASH' ? '0917 123 4567' : 'Digits only'}
            value={form.accountNumber}
            onValue={setField('accountNumber')}
            error={errors.accountNumber}
            className="input mono"
          />
          <Button type="submit" full disabled={busy}>
            Save payout account
          </Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirm === 'save'}
        title={account ? 'Change payout account?' : 'Save payout account?'}
        body="Payouts will go to the new account from the next batch."
        confirmLabel={busy ? 'Saving…' : 'Yes, save it'}
        busy={busy}
        onConfirm={() => void put()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'remove'}
        title="Remove payout account?"
        body="Ops can’t send your payouts until you add an account again."
        confirmLabel={busy ? 'Removing…' : 'Remove'}
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(null)}
      />
    </Card>
  );
}
