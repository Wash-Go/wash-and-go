'use client';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error';
type ToastItem = { id: number; tone: Tone; title: string; body?: string };
type Api = { show: (t: { tone?: Tone; title: string; body?: string }) => void };

const ToastCtx = createContext<Api>({ show: () => undefined });

// One toast component (DESIGN.md feedback): role=status + aria-live polite,
// auto-dismiss after 6 s, closable. Errors stay human copy only.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const show = useCallback<Api['show']>(
    ({ tone = 'success', title, body }) => {
      const id = next.current++;
      setItems((xs) => [...xs.slice(-2), { id, tone, title, body }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => {
          const Icon = t.tone === 'error' ? CircleAlert : CircleCheck;
          return (
            <div key={t.id} className={`toast${t.tone === 'error' ? ' toast-error' : ''}`}>
              <Icon aria-hidden="true" />
              <div className="toast-body">
                <b>{t.title}</b>
                {t.body ? <div className="small muted">{t.body}</div> : null}
              </div>
              <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <X aria-hidden="true" size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Api {
  return useContext(ToastCtx);
}
