import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, font } from '@wash-and-go/ui';

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
        <Stack.Screen name="orders/[id]" options={{ title: 'Job' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
