import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../components/ui';
// Registers the background location task at startup, before any screen
// mounts, so a relaunch for location delivery finds it defined.
import '../lib/recorder';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Chronicles' }} />
        <Stack.Screen name="walk" options={{ title: 'Walking', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="replay/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
