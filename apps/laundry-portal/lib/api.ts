import { ApiClient } from '@wash-and-go/api-client';

// Stub auth for local: dev-bypass as dev-shop-owner (member of the Tetuan shop).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  tokens: { getToken: async () => null, refreshToken: async () => null },
  devUid: 'dev-shop-owner',
});
