import { ApiClient } from '@wash-and-go/api-client';
import { auth, DEV_UID } from './firebase';

// The standalone demo build (NEXT_PUBLIC_DEMO=1) answers every API call in the
// browser (lib/demo). The flag is inlined by next.config, so in any other
// build this require is dead code and the demo modules are not bundled.
const demo: typeof import('./demo/runtime') | null =
  process.env.NEXT_PUBLIC_DEMO === '1' ? require('./demo/runtime') : null;

export const API_BASE_URL = demo ? demo.DEMO_API_BASE : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

async function idToken(force: boolean): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_DEMO === '1') return null;
  await auth.authStateReady();
  return auth.currentUser ? auth.currentUser.getIdToken(force) : null;
}

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: { getToken: () => idToken(false), refreshToken: () => idToken(true) },
  devUid: DEV_UID,
  ...(demo ? { fetchFn: demo.demoFetch } : {}),
});
