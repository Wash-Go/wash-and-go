import { ApiClient } from '@wash-and-go/api-client';

// Stub auth for local: dev-bypass as dev-admin (backend AUTH_DEV_BYPASS=1). Real
// Firebase web auth lands later.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: { getToken: async () => null, refreshToken: async () => null },
  devUid: 'dev-admin',
});
