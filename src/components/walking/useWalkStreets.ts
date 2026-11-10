import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { WalkMapHandle } from '../map/types';
import { distanceM } from '../../lib/geo';
import { streetKey } from '../../lib/streets';
import { ensureTileBuild } from '../../lib/tiles';
import type { LngLat, StreetSegment } from '../../lib/types';
import { walkScreen } from '../../lib/walkScreen';

/** The streets around the walker are read again after this far. */
const FOG_STEP_M = 100;

/**
 * Streets around the walker, refreshed when they move 100 m (the shell's `streetsAround`): fog, the
 * streets already credited, and the named unwalked ones' count for Show unwalked streets. One run at a
 * time; a move during a run is picked up by the next refresh.
 */
export function useWalkStreets(a: { here: LngLat | null; riding: boolean; runs: LngLat[][]; mapRef: RefObject<WalkMapHandle | null> }) {
  const { here, riding, mapRef } = a;
  const [fog, setFog] = useState<StreetSegment[]>([]);
  const [walked, setWalked] = useState<StreetSegment[]>([]);
  const [build, setBuild] = useState<string | null>(null);
  useEffect(() => {
    ensureTileBuild().then(setBuild, () => setBuild('unknown'));
  }, []);
  const fogRun = useRef<{ busy: boolean; at: LngLat | null }>({ busy: false, at: null });
  const visitedRef = useRef<Set<string> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const liveRuns = useRef(a.runs);
  useEffect(() => {
    liveRuns.current = a.runs;
  }, [a.runs]);
  useEffect(() => {
    const now = here;
    const run = fogRun.current;
    // Not on a ride: its streets aren't walked, and a bus would read the map every few seconds (rides audit 13).
    if (!now || build == null || riding || run.busy || (run.at && distanceM(run.at, now) < FOG_STEP_M)) return;
    run.busy = true;
    run.at = now;
    walkScreen
      .streetsAround({
        at: now,
        build,
        collect: async () => mapRef.current?.collectView(),
        trace: () => liveRuns.current.flat(),
        visited: visitedRef.current,
      })
      .then((r) => {
        if (!r.complete) run.at = null; // zoomed out or not loaded yet: read the streets again on the next fix
        visitedRef.current = r.visited;
        // The screen may have gone; a newer fix never cancels a run already under way (perf: a slow
        // read on a phone was always thrown away by the next fix, 2 s later).
        if (!mountedRef.current) return;
        setFog(r.fog);
        setWalked(r.walked);
      })
      .catch(() => {})
      .finally(() => {
        run.busy = false;
      });
  }, [here, riding, build, mapRef]);
  // Unwalked streets near me: a count, and the fog drawn boldly over a veiled map.
  const [showUnwalked, setShowUnwalked] = useState(false);
  // Named streets only (the owner's call): unnamed paths are fog, not a count.
  const unwalkedCount = useMemo(() => new Set(fog.filter((x) => x.name).map(streetKey)).size, [fog]);
  return { fog, walked, showUnwalked, setShowUnwalked, unwalkedCount };
}
