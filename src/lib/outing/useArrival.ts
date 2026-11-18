// @layer view
import { useEffect, useRef, useState } from 'react';
import type { Waypoint } from '../nav/types';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { stopWithin } from './arrival';
import { outingPrefs, outingService } from './app';

/** How long the arrival line stays before it fades by itself (QC26). */
const FADE_MS = 6000;

/**
 * QC19, QC24, QC26: on a walk started from an outing, the name of a stop once, within 60 m of it, looked up from the data then (the
 * destination holds positions only). A line on screen and nothing else: no haptic, sound or notification; it offers no action.
 */
export function useStopArrival(dest: Waypoint | null, here: LngLat | null): string | null {
  const chains = useStore(outingPrefs.store, (s) => s.chains);
  const [line, setLine] = useState<string | null>(null);
  const said = useRef<{ dest: Waypoint | null; stops: Set<number> }>({ dest: null, stops: new Set() });
  useEffect(() => {
    if (!dest?.outing || !here) return;
    if (said.current.dest !== dest) said.current = { dest, stops: new Set() };
    const stops = [...(dest.via ?? []), ...(dest.loop ? [] : [dest.at])];
    const i = stopWithin(stops, here, said.current.stops);
    if (i == null) return;
    said.current.stops.add(i);
    void outingService.nameNear(stops[i], chains).then((name) => {
      if (!name) return;
      setLine(name);
      setTimeout(() => setLine((l) => (l === name ? null : l)), FADE_MS);
    });
  }, [dest, here, chains]);
  return line;
}
