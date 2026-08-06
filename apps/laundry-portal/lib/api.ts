import { ApiClient } from '@wash-and-go/api-client';
import { auth, DEV_UID } from './firebase';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function idToken(force: boolean): Promise<string | null> {
  await auth.authStateReady();
  return auth.currentUser ? auth.currentUser.getIdToken(force) : null;
}

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: { getToken: () => idToken(false), refreshToken: () => idToken(true) },
  devUid: DEV_UID,
});
