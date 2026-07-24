import { getApp, getApps, initializeApp } from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { firebaseConfig } from './firebaseConfig';

// Firebase JS SDK runs in Expo Go AND on web (react-native-web).
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function makeAuth(): Auth {
  // Web: default browser persistence (IndexedDB/localStorage) via getAuth.
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  // Native: AsyncStorage persistence. getReactNativePersistence exists at
  // runtime but is missing from firebase v12's type exports (firebase-js-sdk
  // #8332), so access it dynamically; fall back to in-memory if unavailable.
  const getRNPersistence = (
    fbAuth as unknown as {
      getReactNativePersistence?: (storage: unknown) => unknown;
    }
  ).getReactNativePersistence;
  return getRNPersistence
    ? initializeAuth(app, {
        persistence: getRNPersistence(AsyncStorage) as never,
      })
    : initializeAuth(app);
}

export const auth: Auth = makeAuth();

// Dev-auth fallback: in an Expo dev build (local + e2e web) authenticate as the
// seeded dev-rider-1 via the x-dev-uid stub (AUTH_DEV_BYPASS=1). A production
// build has no dev uid, so it requires a real Firebase sign-in.
export const DEV_UID: string | undefined =
  process.env.EXPO_PUBLIC_DEV_UID ||
  (typeof __DEV__ !== 'undefined' && __DEV__ ? 'dev-rider-1' : undefined);
