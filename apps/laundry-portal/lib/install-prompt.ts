// "Add to home screen" card. The browser fires beforeinstallprompt when the
// portal is installable; the card shows until it is used or dismissed, and the
// dismissal is remembered per browser. Storage can throw (private mode,
// blocked site data), so every access is guarded and defaults to "not dismissed".

export const INSTALL_DISMISS_KEY = 'wg-portal-install-dismissed';

type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void };

export function shouldShowInstallCard(s: { canPrompt: boolean; dismissed: boolean; standalone: boolean }): boolean {
  return s.canPrompt && !s.dismissed && !s.standalone;
}

export function readDismissed(store: Store | null | undefined): boolean {
  try {
    return store?.getItem(INSTALL_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDismissed(store: Store | null | undefined): void {
  try {
    store?.setItem(INSTALL_DISMISS_KEY, '1');
  } catch {
    // Not remembered; the card comes back next visit. Harmless.
  }
}
