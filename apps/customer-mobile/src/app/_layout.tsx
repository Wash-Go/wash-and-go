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
import { auth } from '../lib/firebase';

// Base default font so every Text/TextInput inherits Plus Jakarta, not the
// system face (which reads as unstyled/AI). Screens override per weight.
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
  // undefined = still restoring the persisted session.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (user === undefined) return; // wait for the first auth state
    const onLogin = segments[0] === 'login';
    if (!user && !onLogin) router.replace('/login');
    else if (user && onLogin) router.replace('/');
  }, [user, segments, router]);

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="book" options={{ title: 'Book pickup' }} />
        <Stack.Screen name="checkout" options={{ title: 'Review & confirm' }} />
        <Stack.Screen name="change-laundry" options={{ title: 'Choose a laundry' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
