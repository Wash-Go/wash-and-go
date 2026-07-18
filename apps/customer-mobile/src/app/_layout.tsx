import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Wash & Go' }} />
        <Stack.Screen name="book" options={{ title: 'Book pickup' }} />
        <Stack.Screen name="orders/index" options={{ title: 'My orders' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
