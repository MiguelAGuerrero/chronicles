// @layer view
import { useEffect, useMemo, useState } from 'react';
import type { LngLat } from '../types';
import { groundOf, type Ground } from './hoods';
import { outlines } from './outlineReader';
import { AREA_REACH_M } from './rules';
import { coveredBy, OUTLINE_ZOOM, type OutlineSet } from './outlines';
import type { PlaceCandidate } from './types';

/** How often, and how far apart, the cache is looked in for a neighborhood's tiles. */
const LOOKS = 8;
const LOOK_MS = 1500;

/** Points around a neighborhood's own, so its neighbors' shapes in the tiles beside are known too. */
const around = ([lon, lat]: LngLat): LngLat[] => {
  const dLat = 1500 / 110_540;
  const dLon = 1500 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [[lon, lat], [lon + dLon, lat], [lon - dLon, lat], [lon, lat + dLat], [lon, lat - dLat]];
};

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
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (!key || !hood) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    outlines.known(around(hood.at), OUTLINE_ZOOM).then(
      (set) => {
        if (!live) return;
        setRead({ key, set });
        if (!coveredBy(set, hood.at) && tries < LOOKS) timer = setTimeout(() => live && setTries((n) => n + 1), LOOK_MS);
      },
      () => {},
    );
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tries]);
  useEffect(() => setTries(0), [key]);
  // A read for another neighborhood is not this one's.
  const set = read && read.key === key ? read.set : null;
  return useMemo(() => (hood && set ? groundOf(hood, near, set) : null), [hood, set, near]);
}
