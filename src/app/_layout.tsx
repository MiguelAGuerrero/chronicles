import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../components/ui';
import '../components/webStyles';
import { reconcileOpenWalk } from '../lib/session';
import { ensureTileBuild } from '../lib/tiles';

export default function RootLayout() {
  // An open walk is picked back up at launch or reload, wherever the app
  // opened: recording re-attaches and the walk screen comes back.
  useEffect(() => {
    // Notices a new map build early, so the fog on the walk screen is never stale.
    ensureTileBuild().catch(() => {});
    reconcileOpenWalk()
      .then((open) => {
        if (open) router.replace('/walk');
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.ink,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Chronicles' }} />
        {/* No way back from a walk but Stop: leaving would strand it open. */}
        <Stack.Screen
          name="walk"
          options={{ title: 'Walking', headerBackVisible: false, headerLeft: () => null, gestureEnabled: false }}
        />
        <Stack.Screen name="replay/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
