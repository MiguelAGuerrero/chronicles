// @layer view
import { useEffect, useMemo, useState } from 'react';
import type { LngLat } from '../types';
import { groundOf, hoodProbe, LOOK_MS, lookAgain, type Ground } from './hoods';
import { outlines } from './outlineReader';
import { OUTLINE_ZOOM, type OutlineSet } from './outlines';
import { AREA_REACH_M } from './rules';
import type { PlaceCandidate } from './types';

/** The neighborhoods and towns listed, as the candidates placing would weigh (HB9). */
export const candidatesOf = (areas: readonly { level: 'neighborhood' | 'town'; name: string; at: LngLat }[]): PlaceCandidate[] =>
  areas.map((a) => ({ level: a.level, name: a.name, at: a.at, reachM: a.level === 'town' ? AREA_REACH_M.town : AREA_REACH_M.neighborhood }));

/**
 * A selected neighborhood's own ground for a map to draw (HB9): from the kept tiles only, never the network
 * (HB12: selecting asks for nothing). Null until they are kept (the ring stands), and null for a town.
 */
export function useHoodGround(area: { level: string; name: string; at: LngLat } | null, near: PlaceCandidate[], active = true): Ground | null {
  const hood = active && area?.level === 'neighborhood' ? area : null;
  const key = hood ? `${hood.name}|${hood.at[0].toFixed(5)},${hood.at[1].toFixed(5)}` : '';
  const [read, setRead] = useState<{ key: string; set: OutlineSet } | null>(null);
  // The neighborhood's own read keeps its tiles a moment after it is selected: look in the cache again, a few times, never the network.
  const [tried, setTried] = useState<{ key: string; n: number }>({ key: '', n: 0 });
  const tries = tried.key === key ? tried.n : 0;
  useEffect(() => {
    if (!key || !hood) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const probes = hoodProbe(hood.at);
    outlines.known(probes, OUTLINE_ZOOM).then(
      (set) => {
        if (!live) return;
        // The ground is computed again only when a tile arrived (audit 5), never on every look.
        setRead((was) => (was && was.key === key && was.set.tiles.size === set.tiles.size ? was : { key, set }));
        // Until every tile beside it is kept too: a neighbor's shape not yet read would let a share run over it.
        if (lookAgain(set, probes, tries)) timer = setTimeout(() => live && setTried({ key, n: tries + 1 }), LOOK_MS);
      },
      () => {},
    );
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tries]);
  // A read for another neighborhood is not this one's.
  const set = read && read.key === key ? read.set : null;
  return useMemo(() => (hood && set ? groundOf(hood, near, set) : null), [hood, set, near]);
}
