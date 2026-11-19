import { INSTALL_DISMISS_KEY, readDismissed, shouldShowInstallCard, writeDismissed } from './install-prompt';

describe('shouldShowInstallCard', () => {
  it('shows only when the browser offered an install and it was not dismissed', () => {
    expect(shouldShowInstallCard({ canPrompt: true, dismissed: false, standalone: false })).toBe(true);
    expect(shouldShowInstallCard({ canPrompt: false, dismissed: false, standalone: false })).toBe(false);
    expect(shouldShowInstallCard({ canPrompt: true, dismissed: true, standalone: false })).toBe(false);
    expect(shouldShowInstallCard({ canPrompt: true, dismissed: false, standalone: true })).toBe(false);
  });
});

describe('dismissal memory', () => {
  const store = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  };

  it('remembers a dismissal', () => {
    const s = store();
    expect(readDismissed(s)).toBe(false);
    writeDismissed(s);
    expect(readDismissed(s)).toBe(true);
    expect(s.getItem(INSTALL_DISMISS_KEY)).toBe('1');
  });

  it('survives a storage that throws (private mode)', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readDismissed(broken)).toBe(false);
    expect(() => writeDismissed(broken)).not.toThrow();
    expect(readDismissed(null)).toBe(false);
  });
});
