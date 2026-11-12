// @layer view
import { useEffect, useRef, useState } from 'react';
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
export function useComplexes(enabled: boolean, area: { key: string; at: LngLat; reachM: number } | null): { complexes: Complex[]; partial: boolean } {
  const [state, setState] = useState<{ key: string | null; complexes: Complex[]; partial: boolean }>({ key: null, complexes: [], partial: false });
  const [tick, setTick] = useState(0);
  const failedAt = useRef<{ key: string; t: number } | null>(null);
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
    void (async () => {
      const release = await ensureOvertureRelease().catch(() => null);
      if (!live) return;
      const r = release ? await complexes.readArea({ at: [lon, lat], reachM }, release, () => !live).catch(() => null) : null;
      if (!live) return;
      if (!r || r.failed) {
        failedAt.current = { key, t: Date.now() };
        setTick((n) => n + 1);
        return;
      }
      failedAt.current = null;
      setState({ key, complexes: r.complexes, partial: r.partial });
    })();
    return () => {
      live = false;
    };
  }, [enabled, key, lon, lat, reachM, tick]);
  return state.key === key ? { complexes: state.complexes, partial: state.partial } : { complexes: [], partial: false };
}
