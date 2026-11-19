'use client';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { addPhotoKey, checkUploadFile, MAX_PHOTOS, PERMIT_TYPES, PHOTO_TYPES, removeKey, uploadDocument } from '../../lib/uploads';
import { FieldError } from './fields';
import type { StepProps } from './types';

const put = (url: string, init: RequestInit) => fetch(url, init);

// Step 5 · Documents. Gated while R2 is not configured (plan decision): our
// team verifies in person and the owner can go on to submit.
export function DocumentsStep({ draft, set, errors, data }: StepProps) {
  if (!data.uploads.configured) {
    return (
      <EmptyState
        icon={FileText}
        title="Document upload isn’t open yet; our team will verify in person."
        body="Have your business permit ready when we visit. You can go on and submit now."
      />
    );
  }
  return <Uploads draft={draft} set={set} errors={errors} data={data} />;
}

function Uploads({ draft, set, errors }: StepProps) {
  const toast = useToast();
  const permitId = useId();
  const photosId = useId();
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<{ permit?: string; photo?: string }>({});

  async function upload(file: File, kind: 'permit' | 'photo'): Promise<string | null> {
    const bad = checkUploadFile(file, kind);
    if (bad) {
      setErr((e) => ({ ...e, [kind]: bad }));
      return null;
    }
    setErr((e) => ({ ...e, [kind]: undefined }));
    try {
      const key = await uploadDocument(file, { presign: (t) => api.presignUpload(t), put });
      setNames((n) => ({ ...n, [key]: file.name }));
      return key;
    } catch {
      toast.show({ tone: 'error', title: 'That file didn’t upload.', body: 'Check your connection, then try again.' });
      return null;
    }
  }

  const label = (key: string, fallback: string) => names[key] ?? fallback;

  return (
    <div className="wiz-section">
      <div className="field">
        <label className="field-label" htmlFor={permitId}>
          Business permit (photo or PDF)
        </label>
        {draft.permitKey ? (
          <ul className="wiz-files" data-testid="permit-file">
            <li>
              <FileText aria-hidden="true" />
              <span>{label(draft.permitKey, 'Business permit (uploaded)')}</span>
            </li>
          </ul>
        ) : null}
        <input
          id={permitId}
          className="wiz-file-input"
          type="file"
          accept={PERMIT_TYPES.join(',')}
          disabled={busy != null}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy('permit');
            const key = await upload(f, 'permit');
            if (key) set({ permitKey: key });
            setBusy(null);
          }}
        />
        <div className="field-hint">{draft.permitKey ? 'Choose another file to replace it.' : 'JPG, PNG, WebP or PDF, up to 10 MB.'}</div>
        <FieldError>{err.permit ?? errors.permit}</FieldError>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={photosId}>
          Storefront photos (up to {MAX_PHOTOS})
        </label>
        {draft.photoKeys.length ? (
          <ul className="wiz-files">
            {draft.photoKeys.map((k, i) => (
              <li key={k}>
                <ImageIcon aria-hidden="true" />
                <span>{label(k, `Photo ${i + 1}`)}</span>
                <button
                  type="button"
                  className="btn btn-text"
                  onClick={() => set({ photoKeys: removeKey(draft.photoKeys, k) })}
                  aria-label={`Remove ${label(k, `photo ${i + 1}`)}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={photosId}
          className="wiz-file-input"
          type="file"
          multiple
          accept={PHOTO_TYPES.join(',')}
          disabled={busy != null || draft.photoKeys.length >= MAX_PHOTOS}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            setBusy('photo');
            let keys = draft.photoKeys;
            for (const f of files) {
              if (keys.length >= MAX_PHOTOS) break;
              const key = await upload(f, 'photo');
              if (key) keys = addPhotoKey(keys, key);
            }
            set({ photoKeys: keys });
            setBusy(null);
          }}
        />
        <div className="field-hint">The shop front and the counter, so riders know they&rsquo;re at the right place.</div>
        <FieldError>{err.photo}</FieldError>
      </div>
      {busy ? (
        <p className="small muted" role="status">
          Uploading…
        </p>
      ) : null}
    </div>
  );
}
