// @layer view
import { useEffect, useRef, useState } from 'react';
import { ensureOvertureRelease } from '../activity/overture';
import type { LngLat } from '../types';
import { complexes } from './index';
import { loadHiddenKinds, onHiddenKinds, saveHiddenKinds } from './settings';
import type { Complex, ComplexKind } from './types';

/** How long after a failed read the next ask waits (CX16): nothing is shown for it, nothing nags. */
const RETRY_MS = 90_000;

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
 * CX16: the complexes of the selected area, read once it is selected and the tab is in front, silently: a failed read shows
 * nothing and is asked again after a wait. Never for the areas merely in view.
 */
export function useComplexes(focused: boolean, area: { key: string; at: LngLat; reachM: number } | null): { complexes: Complex[]; partial: boolean } {
  const [state, setState] = useState<{ key: string | null; complexes: Complex[]; partial: boolean }>({ key: null, complexes: [], partial: false });
  const failedAt = useRef<{ key: string; t: number } | null>(null);
  const key = area?.key ?? null;
  const lon = area?.at[0];
  const lat = area?.at[1];
  const reachM = area?.reachM;
  useEffect(() => {
    if (!focused || key == null || lon == null || lat == null || reachM == null) return;
    const failed = failedAt.current;
    if (failed && failed.key === key && Date.now() - failed.t < RETRY_MS) return;
    let live = true;
    void (async () => {
      const release = await ensureOvertureRelease().catch(() => null);
      if (!release || !live) return;
      const r = await complexes.readArea({ at: [lon, lat], reachM }, release, () => !live).catch(() => null);
      if (!live) return;
      if (!r || (r.complexes.length === 0 && r.partial)) {
        failedAt.current = { key, t: Date.now() };
        return;
      }
      setState({ key, complexes: r.complexes, partial: r.partial });
    })();
    return () => {
      live = false;
    };
  }, [focused, key, lon, lat, reachM]);
  return state.key === key ? { complexes: state.complexes, partial: state.partial } : { complexes: [], partial: false };
}
