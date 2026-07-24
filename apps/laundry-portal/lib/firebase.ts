import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// Dev-auth fallback (see admin). Dev build → the dev-shop-owner stub against
// AUTH_DEV_BYPASS=1; production build → real Firebase sign-in required.
export const DEV_UID: string | undefined =
  process.env.NEXT_PUBLIC_DEV_UID ||
  (process.env.NODE_ENV !== 'production' ? 'dev-shop-owner' : undefined);
