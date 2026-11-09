import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../components/ui';
import { entryPlan } from '../../lib/readyNav';
import { showWalk } from '../../lib/walkNav';

// A tab that throws shows what broke, with the tab bar and the recording bar still there (fix ios-video audit 1).
export { ScreenError as ErrorBoundary } from '../../components/ScreenError';

/**
 * Navigate's route (`/navigate`): it has no view of its own any more (NR1).
 * Navigate is the walk screen, ready or walking, over the tabs. Reached
 * directly (a reload of `/navigate`, a link), it puts Chronicle beneath and
 * opens the walk screen over it, so the chevron has somewhere to go back to.
 * The tab button itself never lands here: its press opens the walk screen
 * (`(tabs)/_layout.tsx`).
 */
export default function NavigateEntry() {
  useFocusEffect(
    useCallback(() => {
      const plan = entryPlan();
      // Replaced, not pushed: `/` leaves the history, so the browser's back from Chronicle never lands here
      // again and reopens Navigate (audit 7).
      router.replace(plan.tabs);
      // After the tabs have moved, so the walk screen opens over Chronicle, not over this route. Never
      // cancelled: moving the tabs blurs this route at once, which would clear it.
      setTimeout(() => plan.thenShowWalk && showWalk(undefined, { launch: true }), 0);
    }, []),
  );
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.bg } });
