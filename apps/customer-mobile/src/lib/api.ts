import { ApiClient } from '@wash-and-go/api-client';
import Constants from 'expo-constants';

// In Expo Go the API runs on the dev machine; derive its LAN IP from the packager
// host so a phone on the same Wi-Fi can reach it. Falls back to localhost (web).
const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${host}:4000`;

/*
 * Stub login for Expo Go (design/eng note): real Firebase phone OTP is a native
 * module that Expo Go can't run, so today we authenticate via the backend's
 * dev-bypass header (AUTH_DEV_BYPASS=1) as the seeded dev-customer. The
 * TokenProvider returns null; when the dev build lands, swap in a Firebase-backed
 * provider and drop devUid.
 */
export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: { getToken: async () => null, refreshToken: async () => null },
  devUid: 'dev-customer',
});
