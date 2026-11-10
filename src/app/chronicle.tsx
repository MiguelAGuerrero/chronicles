import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/**
 * Chronicle was `/chronicle` until Nov 9; it is `/` now, where the app opens (HC1, HC5, decision 0112).
 * A bookmark, a notification's old link or a Home Screen app reopening on its last page still lands
 * here. It goes back down to the tabs beneath: a `<Redirect>` (a replace) would stack a second set of
 * tabs over them.
 */
export default function OldChronicle() {
  useFocusEffect(
    useCallback(() => {
      router.dismissTo('/');
    }, []),
  );
  return null;
}
