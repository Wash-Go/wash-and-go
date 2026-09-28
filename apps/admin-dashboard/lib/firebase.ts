import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

// Web-only (Next.js). Browser persistence (IndexedDB/localStorage) via getAuth.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

// Dev-auth fallback. In a dev build (local + e2e) the app uses the x-dev-uid stub
// against AUTH_DEV_BYPASS=1 — no login needed. A PRODUCTION build has no dev uid,
// so it requires a real Firebase sign-in. A prod deploy can still opt into the
// stub by explicitly setting NEXT_PUBLIC_DEV_UID (e.g. a gated preview against a
// bypass=1 API).
export const DEV_UID: string | undefined =
  process.env.NEXT_PUBLIC_DEV_UID ||
  (process.env.NODE_ENV !== 'production' ? 'dev-admin' : undefined);
