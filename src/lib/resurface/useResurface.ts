// @layer view
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useHidden, useOnDeleted } from '../deletion/useDeletions';
import { useStore } from '../useStore';
import { compose, type Composed } from './feed';
import { resurface, type ResurfaceState } from './index';
import { chronicleSection } from './sectionStore';

const whole = (s: ResurfaceState) => s;

/**
 * Memories' data for a view: read again each time Chronicle comes to the
 * front (a new open, or the same one again) and after a delete reached storage (RM19); composed from the
 * moments, the user's choices and the ids a delete or its Undo window hides.
 */
export function useResurface(): { state: ResurfaceState; feed: Composed; now: number; hidden: ReadonlySet<string> } {
  const state = useStore(resurface.store, whole);
  const hidden = useHidden();
  const [now, setNow] = useState(() => Date.now());
  // A new open (the app was elsewhere) brings a new moment back; coming out of a replay or a day reads again
  // and leaves the top card where it was (audit 4).
  const seen = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      const visit = chronicleSection.visit();
      const fresh = seen.current !== visit;
      seen.current = visit;
      void (fresh ? resurface.load() : resurface.refresh()).then(() => setNow(Date.now()));
    }, []),
  );
  useOnDeleted(() => {
    void resurface.refresh();
  });
  const { moments, prefs, seed, lastShownAtOpen } = state;
  const feed = useMemo(() => compose(moments, { ...prefs, lastShown: lastShownAtOpen }, hidden, now, seed), [moments, prefs, hidden, now, seed, lastShownAtOpen]);
  return { state, feed, now, hidden };
}
