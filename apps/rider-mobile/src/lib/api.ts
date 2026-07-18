import { ApiClient } from '@wash-and-go/api-client';
import Constants from 'expo-constants';

const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${host}:4000`;

// Expo Go stub login (backend AUTH_DEV_BYPASS=1) as the seeded dev-rider-1.
// Real Firebase OTP is the shared dev-build follow-up.
export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: { getToken: async () => null, refreshToken: async () => null },
  devUid: 'dev-rider-1',
});
