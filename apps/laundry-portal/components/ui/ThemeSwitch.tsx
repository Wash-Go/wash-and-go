'use client';
import { Moon } from 'lucide-react';
import { useTheme } from '../../lib/useTheme';

// "Dark mode" on/off (B8). Light is the default on every device; the choice
// is kept on this device only.
export function ThemeSwitch({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const on = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={className}
      data-testid="theme-switch"
      onClick={() => setTheme(on ? 'light' : 'dark')}
    >
      <Moon aria-hidden="true" />
      Dark mode
      <span className="switch-state" aria-hidden="true">
        {on ? 'On' : 'Off'}
      </span>
    </button>
  );
}
