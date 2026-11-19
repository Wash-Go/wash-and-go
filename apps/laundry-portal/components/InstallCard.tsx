'use client';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../lib/useInstallPrompt';

// "Add to home screen": shown in More and Help once the browser offers an
// install; dismissing it is remembered in this browser.
export function InstallCard() {
  const { show, install, dismiss } = useInstallPrompt();
  if (!show) return null;
  return (
    <div className="card card-pad" data-testid="install-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Download aria-hidden="true" style={{ color: 'var(--navy)', flex: 'none', marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ font: '700 16px/1.35 var(--font-body)' }}>Add to home screen</h3>
        <p className="small muted" style={{ margin: '2px 0 10px' }}>
          Open the portal like an app, straight from your phone&rsquo;s home screen. It also shows your last orders
          when the signal drops.
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => void install()}>
          Add to home screen
        </button>
      </div>
      <button type="button" className="icon-btn" aria-label="Not now" onClick={dismiss} style={{ margin: '-10px -10px 0 0' }}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
