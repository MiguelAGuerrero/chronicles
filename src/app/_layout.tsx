import { deletions } from '../lib/deletion';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OpenWalkProvider } from '../components/OpenWalk';
import { theme } from '../components/ui';
import '../components/webStyles';
import '../components/pwa';
import { setAudioMode } from '../lib/audioMode';
import { db } from '../lib/db';
import { launchRoute } from '../lib/launchRoute';
import { chronicleSection } from '../lib/resurface/sectionStore';
import { openWalkAtLaunch } from '../lib/launchWalk';
import { reconcileOpenWalk } from '../lib/session';
import { ensureTileBuild } from '../lib/tiles';
import { loadUnits } from '../lib/unitsStore';
import { routeLeanings } from '../lib/routeLeanings';

/** The tabs are the stack's first screen, so a walk or a replay always has them beneath. */
export const unstable_settings = { initialRouteName: '(tabs)' };

/** The longest the launch cover waits on the open walk's read; the device's own store answers in a few ms. */
const LAUNCH_COVER_MAX_MS = 3000;

export default function RootLayout() {
  // The path the app opened on, so a stale replay link at launch goes to Explore (NV2).
  const pathname = usePathname();
  // The launch's way to the walk settles once the router is on it (NV2 launch 5).
  const at = useRef(pathname);
  const walkInFront = useRef<(() => void) | null>(null);
  useEffect(() => {
    launchRoute.note(pathname);
    // Chronicle opens on Memories again once the app has been elsewhere (RM1).
    chronicleSection.noteRoute(pathname);
    // A delete waits on the screen where it was made: moving to another stores it, as Close does (ui-conformance audit 6).
    void deletions.flush();
    at.current = pathname;
    if (pathname === '/walk') {
      walkInFront.current?.();
      walkInFront.current = null;
    }
  }, [pathname]);
  // Until the launch knows whether a walk is open, the app is covered, so a walk
  // comes straight back without Explore showing first (NV2 launch 1).
  const [covered, setCovered] = useState(true);
  // An open walk is picked back up at launch or reload, wherever the app
  // opened: the walk screen comes back, then recording re-attaches.
  useEffect(() => {
    // Memos and videos play with the ringer switch off, wherever they are opened.
    setAudioMode({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    // Notices a new map build early, so the fog on the walk screen is never stale.
    ensureTileBuild().catch(() => {});
    // The km or miles setting (QL13); until it loads, the locale's default shows.
    loadUnits().catch(() => {});
    // The scenic routes' leanings (SR1); until they load, all three are on.
    routeLeanings.load().catch(() => {});
    openWalkAtLaunch({
      findOpen: () => db.getOpenWalk(),
      showWalk: () =>
        new Promise<void>((inFront) => {
          if (at.current === '/walk') inFront();
          else walkInFront.current = inFront;
          router.replace('/walk');
        }),
      lift: () => setCovered(false),
      resume: reconcileOpenWalk,
      capMs: LAUNCH_COVER_MAX_MS,
    });
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
          {/* One walk screen at most, however it is reached (tabs audit 1). */}
          <Stack.Screen name="walk" dangerouslySingular options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="replay/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          {/* The day's replay (M10): moments and walks in time order. */}
          <Stack.Screen name="day/[key]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          {/* The old Explore path, sent on to / (NV2). */}
          <Stack.Screen name="explore" options={{ headerShown: false }} />
        </Stack>
        {covered && <View testID="launch-cover" style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} />}
      </OpenWalkProvider>
    </SafeAreaProvider>
  );
}
