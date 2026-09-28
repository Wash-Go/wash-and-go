import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, font, ToastProvider, useToast } from '@wash-and-go/ui';
import { api } from '../lib/api';
import { auth, DEV_UID } from '../lib/firebase';
import { ensureSession } from '../lib/session';

const RNTextAny = RNText as unknown as { defaultProps?: { style?: unknown } };
const RNTextInputAny = RNTextInput as unknown as { defaultProps?: { style?: unknown } };
RNTextAny.defaultProps = RNTextAny.defaultProps ?? {};
RNTextAny.defaultProps.style = { fontFamily: font.regular };
RNTextInputAny.defaultProps = RNTextInputAny.defaultProps ?? {};
RNTextInputAny.defaultProps.style = { fontFamily: font.regular };

// Ensure the Postgres user row exists for a session Firebase restored at startup
// (the login screen covers fresh sign-ins). Idempotent upsert. A failure doesn't
// sign the rider out — it's logged and toasted, and the next API call surfaces
// any auth error normally.
function RestoredSessionSync({ user }: { user: User | null }) {
  const { show } = useToast();
  useEffect(() => {
    if (!user) return;
    void ensureSession(user, api).then((r) => {
      if (r.ok) return;
      console.warn('[auth] POST /auth/session failed for the restored session', r.error);
      show(r.message, 'error');
    });
  }, [user, show]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  // Dev/e2e (DEV_UID set) skips auth gating entirely.
  const devBypass = !!DEV_UID;
  // undefined = still restoring the persisted session.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  // The user Firebase restored at startup (the first auth state), or null.
  const [restoredUser, setRestoredUser] = useState<User | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (devBypass) return; // dev x-dev-uid stub: no Firebase user, no session call
    let first = true;
    return onAuthStateChanged(auth, (u) => {
      if (first) {
        first = false;
        setRestoredUser(u);
      }
      setUser(u);
    });
  }, [devBypass]);

  useEffect(() => {
    if (devBypass || user === undefined) return;
    const onLogin = (segments[0] as string) === 'login';
    // '/login' is a real route (src/app/login.tsx); the cast covers Expo Router's
    // typed-routes only regenerating on `expo start`. A signed-in user on /login
    // is left alone: the login screen navigates once POST /auth/session succeeds
    // (Firebase reports the user before that, and a failure must stay on login).
    if (!user && !onLogin) router.replace('/login' as never);
  }, [user, segments, router, devBypass]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <RestoredSessionSync user={restoredUser} />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: font.bold, color: colors.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="orders/[id]" options={{ title: 'Job' }} />
        </Stack>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
