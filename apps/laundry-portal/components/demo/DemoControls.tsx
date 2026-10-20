'use client';
import { useQueryClient } from '@tanstack/react-query';
import { PackagePlus, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { demoNewOrder, demoReset } from '../../lib/demo/runtime';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';

// Standalone demo build only (B10). "New order arrives" books an order that
// reaches the shop in about 30 s (the badge, chime and New ring fire);
// "Reset demo" puts every order, rate and setting back to the start.
function useDemoActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const newOrder = () => {
    demoNewOrder();
    void qc.invalidateQueries();
    toast.show({ title: 'A new order is on its way.', body: 'It reaches your shop in about 30 seconds.' });
  };
  const reset = () => {
    demoReset();
    void qc.invalidateQueries();
    toast.show({ title: 'Demo reset.', body: 'Every order and setting is back to the start.' });
  };
  return { newOrder, reset };
}

export function DemoControls({ variant = 'card' }: { variant?: 'card' | 'rail' }) {
  const { newOrder, reset } = useDemoActions();
  const [confirm, setConfirm] = useState(false);
  const dialog = (
    <ConfirmDialog
      open={confirm}
      title="Reset the demo?"
      body="Every order, rate and setting goes back to the start. You stay signed in."
      confirmLabel="Reset demo"
      onConfirm={() => {
        setConfirm(false);
        reset();
      }}
      onCancel={() => setConfirm(false)}
    />
  );
  if (variant === 'rail') {
    return (
      <div className="demo-rail" data-testid="demo-controls-rail">
        <button type="button" onClick={newOrder} title="Shortcut: Shift+N">
          <PackagePlus aria-hidden="true" />
          New order arrives
        </button>
        <button type="button" onClick={() => setConfirm(true)}>
          <RotateCcw aria-hidden="true" />
          Reset demo
        </button>
        {dialog}
      </div>
    );
  }
  return (
    <section className="card card-pad stack demo-card" data-testid="demo-controls" aria-labelledby="demo-controls-h">
      <div>
        <h2 id="demo-controls-h">Demo controls</h2>
        <p className="small muted">
          This is a demo with sample data. Nothing is sent anywhere; changes stay in this browser.
        </p>
      </div>
      <Button variant="secondary" full icon={<PackagePlus aria-hidden="true" />} onClick={newOrder}>
        New order arrives
      </Button>
      <Button variant="text" icon={<RotateCcw aria-hidden="true" />} onClick={() => setConfirm(true)}>
        Reset demo
      </Button>
      {dialog}
    </section>
  );
}

// Shift+N books a new order (desktop presenting), unless typing in a field.
export function DemoHotkeys() {
  const { newOrder } = useDemoActions();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      newOrder();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return null;
}

// Header chip: the shop's data is sample data (NEXT_PUBLIC_DEMO_BADGE=0 hides
// it). From 560 px it sits beside Verified; on a phone it moves under the
// shop name as a small tag, so the name and "updated" line keep their room.
export function DemoChip({ inline }: { inline?: boolean }) {
  if (process.env.NEXT_PUBLIC_DEMO_BADGE === '0') return null;
  if (inline) {
    return (
      <span className="demo-tag" data-testid="demo-data-tag">
        Demo data
      </span>
    );
  }
  return (
    <span className="chip chip-cancel demo-chip" data-testid="demo-data-chip">
      Demo data
    </span>
  );
}
