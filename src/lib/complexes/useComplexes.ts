// @layer view
import { nextShown } from './shown';
import { useEffect, useRef, useState } from 'react';
import type { Stillness } from '../layers/useBusyLayer';
import { ensureOvertureRelease } from '../activity/overture';
import type { LngLat } from '../types';
import { retryIn } from './extent';
import { complexes } from './index';
import { loadHiddenKinds, onHiddenKinds, saveHiddenKinds } from './settings';
import type { Complex, ComplexKind } from './types';

/** CX10: the kinds switched off, saved as they change. */
export function useHiddenKinds(): { hidden: ComplexKind[]; set: (next: ComplexKind[]) => void } {
  const [hidden, setHidden] = useState<ComplexKind[]>([]);
  useEffect(() => {
    let live = true;
    void loadHiddenKinds().then((h) => live && setHidden(h), () => undefined);
    const off = onHiddenKinds((h) => live && setHidden(h));
    return () => {
      live = false;
      off();
    };
  }, []);
  return { hidden, set: (next) => void saveHiddenKinds(next) };
}

/**
 * CX16: the complexes of the selected area, read once it is selected, the tab is in front and a kind is on, silently: a failed
 * read shows nothing and is asked again once COMPLEX_RETRY_MS has passed, with no change of tab or area (complexes audit 4).
 * Never for the areas merely in view.
 */
export function useComplexes(
  enabled: boolean,
  area: { key: string; at: LngLat; reachM: number } | null,
  /** Explore's: the read starts once the camera is still, never mid-switch (smooth-switches SS9). */
  stillness?: Stillness,
): { complexes: Complex[]; partial: boolean } {
  const [state, setState] = useState<{ key: string | null; complexes: Complex[]; partial: boolean }>({ key: null, complexes: [], partial: false });
  const [tick, setTick] = useState(0);
  const stateNow = useRef(state);
  useEffect(() => {
    stateNow.current = state;
  }, [state]);
  const failedAt = useRef<{ key: string; t: number } | null>(null);
  const stillRef = useRef(stillness);
  useEffect(() => {
    stillRef.current = stillness;
  });
  const key = area?.key ?? null;
  const lon = area?.at[0];
  const lat = area?.at[1];
  const reachM = area?.reachM;
  useEffect(() => {
    if (!enabled || key == null || lon == null || lat == null || reachM == null) return;
    const failed = failedAt.current;
    const wait = retryIn(failed && failed.key === key ? failed.t : null, Date.now());
    // Failed not long ago: ask again when it is due, not before and not never.
    if (wait != null && wait > 0) {
      const timer = setTimeout(() => setTick((n) => n + 1), wait);
      return () => clearTimeout(timer);
    }
    let live = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    void (async () => {
      const still = stillRef.current;
      while (still?.().moving) {
        await still().settled();
        if (!live) return;
      }
      const release = await ensureOvertureRelease().catch(() => null);
      if (!live) return;
      const r = release ? await complexes.readArea({ at: [lon, lat], reachM }, release, () => !live).catch(() => null) : null;
      if (!live) return;
      if (!r || r.failed) {
        // Asked again when due, by the timer alone: a render now would only set it (smooth-switches SS9).
        const t = Date.now();
        failedAt.current = { key, t };
        retry = setTimeout(() => setTick((n) => n + 1), retryIn(t, Date.now()) ?? 0);
        return;
      }
      failedAt.current = null;
      // explore-dense-city DC12, audit 10: no update when nothing on screen changes: even a setState that hands back the
      // same state renders once (map rules), so it is compared here first.
      const next = nextShown(stateNow.current, key, r);
      if (next !== stateNow.current) setState(next);
    })();
    return () => {
      live = false;
      if (retry) clearTimeout(retry);
    };
  }, [enabled, key, lon, lat, reachM, tick]);
  return state.key === key ? { complexes: state.complexes, partial: state.partial } : { complexes: [], partial: false };
}
