// @layer view
import { useEffect, useState } from 'react';
import type { CategoryId } from '../discovery/types';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { kindWalk, kindWalkPrefs } from './app';
import type { KindWalkPrefs } from './prefs';
import type { Suggestion } from './suggest';

let loaded = false;
/** The two settings, loaded from the device on first use and live after (KW8, KW11). */
export function useKindWalkPrefs(): KindWalkPrefs {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    void kindWalkPrefs.load();
  }, []);
  return useStore(kindWalkPrefs.store, (s) => s);
}

/**
 * The suggestion for a kind in an area, read once the row is open (KW14) and again when a setting changes. `null` while it
 * is being read. Nothing is read while `active` is false.
 */
export function useKindWalk(kind: CategoryId, area: { at: LngLat; reachM: number }, you: LngLat | null, active: boolean): Suggestion | null {
  const prefs = useKindWalkPrefs();
  const key = `${kind}|${area.at.join(',')}|${area.reachM}|${you ? you.map((x) => x.toFixed(3)).join(',') : ''}|${prefs.budgetM}|${prefs.pref}`;
  const [done, setDone] = useState<{ key: string; s: Suggestion } | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    void kindWalk.suggest({ kind, area, from: you, prefs }).then((s) => {
      if (live) setDone({ key, s });
    });
    return () => {
      live = false;
    };
    // The inputs are read through the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);
  return active && done?.key === key ? done.s : null;
}
