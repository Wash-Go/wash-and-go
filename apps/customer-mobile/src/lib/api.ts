import { ApiClient } from '@wash-and-go/api-client';
import Constants from 'expo-constants';
import { auth } from './firebase';

// In Expo Go the API runs on the dev machine; derive its LAN IP from the packager
// host so a phone on the same Wi-Fi can reach it. Falls back to localhost (web).
const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${host}:4000`;

// Real Firebase auth: the client sends the signed-in user's Firebase ID token;
// the backend verifies it with the Admin SDK. refreshToken forces a fresh token
// on a 401 (tokens expire hourly).
//
// authStateReady() first: a screen can fire a request on mount BEFORE Firebase
// finishes restoring the persisted session. Without the await, currentUser is
// briefly null and we'd send no token (backend then rejects with the dev-bypass
// error). Waiting closes that race.
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
});
