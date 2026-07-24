import { ApiClient } from '@wash-and-go/api-client';
import Constants from 'expo-constants';
import { auth, DEV_UID } from './firebase';

const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${host}:4000`;

// Real Firebase auth: send the signed-in rider's ID token. DEV_UID keeps the
// stub working in dev/e2e (see firebase.ts).
async function idToken(force: boolean): Promise<string | null> {
  await auth.authStateReady();
  return auth.currentUser ? auth.currentUser.getIdToken(force) : null;
}

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: { getToken: () => idToken(false), refreshToken: () => idToken(true) },
  devUid: DEV_UID,
});
