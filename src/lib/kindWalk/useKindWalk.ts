// @layer view
import { useEffect } from 'react';
import { useStore } from '../useStore';
import { kindWalkPrefs } from './app';
import type { KindWalkPrefs } from './prefs';

let loaded = false;
/** The planner's settings, loaded from the device on first use and live after (WP12, WP27). */
export function useKindWalkPrefs(): KindWalkPrefs {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    void kindWalkPrefs.load();
  }, []);
  return useStore(kindWalkPrefs.store, (s) => s);
}
