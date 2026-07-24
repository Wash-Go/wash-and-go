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
