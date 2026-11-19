import type { Gate } from './gate';

type Kind = Gate['kind'];

// Where the console must navigate when the gate resolves (or changes):
// onboarding lives on /onboarding; a ready shop never stays there; and an
// account that just became staff (not-a-shop → ready, an accepted invite)
// lands on Orders whatever URL it was on. null = stay.
export function gateRedirect(prev: Kind | null, next: Kind, pathname: string): string | null {
  if (next === 'onboarding') return pathname === '/onboarding' ? null : '/onboarding';
  if (next === 'ready') {
    if (pathname === '/onboarding') return '/';
    if (prev === 'not-a-shop' && pathname !== '/') return '/';
  }
  return null;
}
