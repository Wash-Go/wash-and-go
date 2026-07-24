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
import { colors, font } from '@wash-and-go/ui';
import { auth, DEV_UID } from '../lib/firebase';

const RNTextAny = RNText as unknown as { defaultProps?: { style?: unknown } };
const RNTextInputAny = RNTextInput as unknown as { defaultProps?: { style?: unknown } };
RNTextAny.defaultProps = RNTextAny.defaultProps ?? {};
RNTextAny.defaultProps.style = { fontFamily: font.regular };
RNTextInputAny.defaultProps = RNTextInputAny.defaultProps ?? {};
RNTextInputAny.defaultProps.style = { fontFamily: font.regular };

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
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (devBypass) return;
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, [devBypass]);

  useEffect(() => {
    if (devBypass || user === undefined) return;
    const onLogin = (segments[0] as string) === 'login';
    // '/login' is a real route (src/app/login.tsx); the cast covers Expo Router's
    // typed-routes only regenerating on `expo start`.
    if (!user && !onLogin) router.replace('/login' as never);
    else if (user && onLogin) router.replace('/');
  }, [user, segments, router, devBypass]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
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
        <Stack.Screen name="index" options={{ title: 'My jobs' }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="cash" options={{ title: 'My cash' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Job' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
