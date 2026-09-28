import { ApiClient } from '@wash-and-go/api-client';
import { auth, DEV_UID } from './firebase';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Real Firebase auth: send the signed-in admin's ID token; the backend verifies
// it. In dev/e2e, DEV_UID is set (.env.development) so the x-dev-uid stub works
// against AUTH_DEV_BYPASS=1 with no login. In production DEV_UID is undefined, so
// only the real token is sent and an unauthenticated request is rejected.
async function idToken(force: boolean): Promise<string | null> {
  await auth.authStateReady();
  return auth.currentUser ? auth.currentUser.getIdToken(force) : null;
}

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: {
    getToken: () => idToken(false),
    refreshToken: () => idToken(true),
  },
  devUid: DEV_UID,
});
