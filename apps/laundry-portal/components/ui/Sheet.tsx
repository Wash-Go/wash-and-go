'use client';
import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useDialog } from './useDialog';

// Bottom sheet on a phone, side panel from 1024px (CSS), so the list behind
// stays visible on desktop while you work in the sheet.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panel = useDialog(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
