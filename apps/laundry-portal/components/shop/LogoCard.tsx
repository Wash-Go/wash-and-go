'use client';
import './shop.css';
import { ImagePlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ShopMark } from '../ui/ShopLockup';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { checkLogoFile, LOGO_TYPES, uploadDocument } from '../../lib/uploads';

const put = (url: string, init: RequestInit) => fetch(url, init);

export const LOGO_GATED_COPY = 'Logo upload opens with document upload; until then your shop shows its initials.';

// Shop logo (B8), on /shop and wizard step 1. Upload only when R2 is
// configured (presign → PUT → save the key); otherwise the gated copy, like
// the documents step. `onSave` writes logoKey (null removes it) through
// PATCH /shop/me or /shop/onboarding. Read-only for staff.
export function LogoCard({
  name,
  logoUrl,
  hasLogo,
  uploadsConfigured,
  readOnly,
  onSave,
  testId = 'logo-card',
}: {
  name: string;
  logoUrl: string | null;
  hasLogo: boolean;
  uploadsConfigured: boolean;
  readOnly?: boolean;
  onSave?: (logoKey: string | null) => Promise<void>;
  testId?: string;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function upload(file: File) {
    const bad = checkLogoFile(file);
    setError(bad);
    if (bad || !onSave) return;
    setBusy(true);
    try {
      const key = await uploadDocument(file, { presign: (t) => api.presignUpload(t), put });
      await onSave(key);
      toast.show({ title: 'Logo saved.' });
    } catch {
      toast.show({ tone: 'error', title: 'Your logo didn’t upload.', body: 'Check your connection, then try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!onSave) return;
    setBusy(true);
    try {
      await onSave(null);
      toast.show({ title: 'Logo removed.' });
    } catch {
      toast.show({ tone: 'error', title: 'We couldn’t remove the logo.', body: 'Check your connection, then try again.' });
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <Card className="shop-card" data-testid={testId}>
      <div className="shop-card-head">
        <h2>Logo</h2>
        {readOnly ? <span className="small muted">Set by the owner</span> : <span className="small muted">Optional</span>}
      </div>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'center', gap: 14 }}>
        <ShopMark name={name} logoUrl={logoUrl} large />
        <p className="small muted">
          {readOnly
            ? 'Shown next to the Wash & Go whale in the portal header.'
            : uploadsConfigured
              ? 'A square image works best. PNG, JPG or WebP, up to 2 MB. It shows next to the Wash & Go whale.'
              : LOGO_GATED_COPY}
        </p>
      </div>
      {!readOnly && uploadsConfigured ? (
        <>
          <input
            ref={input}
            type="file"
            accept={LOGO_TYPES.join(',')}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void upload(f);
            }}
          />
          <div className="shop-actions">
            <Button variant="secondary" icon={<ImagePlus aria-hidden="true" />} onClick={() => input.current?.click()} disabled={busy}>
              {busy ? 'Uploading…' : hasLogo ? 'Change logo' : 'Upload logo'}
            </Button>
            {hasLogo ? (
              <Button variant="text" onClick={() => setConfirm(true)} disabled={busy}>
                Remove
              </Button>
            ) : null}
          </div>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </>
      ) : null}
      <ConfirmDialog
        open={confirm}
        title="Remove your logo?"
        body="Your shop shows its initials instead. You can upload a logo again later."
        confirmLabel={busy ? 'Removing…' : 'Remove'}
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(false)}
      />
    </Card>
  );
}
