import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

/**
 * Explore was `/explore` until Nov 3; it is `/` now (NV2, decision 0070). A
 * bookmark, or a Home Screen app reopening on its last page, still lands here.
 * It goes back down to the tabs beneath: a `<Redirect>` (a replace) would stack
 * a second set of tabs over them.
 */
export default function OldExplore() {
  useFocusEffect(
    useCallback(() => {
      router.dismissTo('/');
    }, []),
  );
  return null;
}
