import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Email + password only, so no popup/redirect resolver: getAuth() would load
// Google's gapi iframe (apis.google.com, ~1.4 s on mobile) before auth state
// is ready, holding up every boot. Same persistence as getAuth's browser
// default. initializeAuth may run once per app; reuse it on hot reload.
function makeAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  } catch {
    return getAuth(app);
  }
}
export const auth: Auth = makeAuth();

// Dev-auth fallback (see admin). Dev build → the dev-shop-owner stub against
// AUTH_DEV_BYPASS=1; production build → real Firebase sign-in required.
export const DEV_UID: string | undefined =
  process.env.NEXT_PUBLIC_DEV_UID ||
  (process.env.NODE_ENV !== 'production' ? 'dev-shop-owner' : undefined);
