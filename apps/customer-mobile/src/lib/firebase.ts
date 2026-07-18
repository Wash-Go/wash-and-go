import { getApp, getApps, initializeApp } from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import { initializeAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

// Firebase JS SDK runs in Expo Go (pure JS — no native module).
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// getReactNativePersistence exists at RUNTIME but is missing from firebase v12's
// TYPE exports (firebase-js-sdk#8332). Access it dynamically so tsc is happy;
// fall back to default (in-memory) persistence if it's ever unavailable.
const getRNPersistence = (
  fbAuth as unknown as {
    getReactNativePersistence?: (storage: unknown) => unknown;
  }
).getReactNativePersistence;

export const auth: Auth = getRNPersistence
  ? initializeAuth(app, {
      persistence: getRNPersistence(AsyncStorage) as never,
    })
  : initializeAuth(app);
