import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OpenWalkProvider } from '../components/OpenWalk';
import { theme } from '../components/ui';
import '../components/webStyles';
import '../components/pwa';
import { setAudioMode } from '../lib/audioMode';
import { reconcileOpenWalk } from '../lib/session';
import { ensureTileBuild } from '../lib/tiles';

/** The tabs are the stack's first screen, so a walk or a replay always has them beneath. */
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  // An open walk is picked back up at launch or reload, wherever the app
  // opened: recording re-attaches and the walk screen comes back.
  useEffect(() => {
    // Memos and videos play with the ringer switch off, wherever they are opened.
    setAudioMode({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
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
      {/* The open walk is kept above the walk screen and the tabs, so a minimized walk keeps its trace,
          its recording bar and Remind me here going (NV8, NV9). */}
      <OpenWalkProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.ink,
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.bg },
          }}
        >
          {/* The three tabs (Explore, Navigate, Chronicle), edge to edge: no header. The walk and the
              replays sit over them, full screen, so the tab bar is hidden while they are up (NV6). */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Chronicles' }} />
          {/* No header: the growing trace says a walk is on. Its way out is Minimize, to the bar above the
              tabs (NV7), or Stop; a swipe would only minimize it unasked. */}
          <Stack.Screen name="walk" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="replay/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          {/* The day's replay (M10): moments and walks in time order. */}
          <Stack.Screen name="day/[key]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
      </OpenWalkProvider>
    </SafeAreaProvider>
  );
}
