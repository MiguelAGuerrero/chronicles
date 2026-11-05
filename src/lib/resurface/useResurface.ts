// @layer view
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useHidden, useOnDeleted } from '../deletion/useDeletions';
import { useStore } from '../useStore';
import { compose, type Composed } from './feed';
import { resurface, type ResurfaceState } from './index';

const whole = (s: ResurfaceState) => s;

/**
 * Memories' data for a view: read again each time Chronicle comes to the
 * front and after a delete reached storage (RM19); composed from the
 * moments, the user's choices and the ids a delete or its Undo window hides.
 */
export function useResurface(): { state: ResurfaceState; feed: Composed; now: number } {
  const state = useStore(resurface.store, whole);
  const hidden = useHidden();
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      void resurface.load().then(() => setNow(Date.now()));
    }, []),
  );
  useOnDeleted(() => {
    void resurface.load();
  });
  const { moments, prefs, seed, lastShownAtOpen } = state;
  const feed = useMemo(() => compose(moments, { ...prefs, lastShown: lastShownAtOpen }, hidden, now, seed), [moments, prefs, hidden, now, seed, lastShownAtOpen]);
  return { state, feed, now };
}
