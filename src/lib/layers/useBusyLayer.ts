// @layer view
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOvertureRelease } from '../activity/useOvertureRelease';
import { landingView, type LandingRow, type LandingView } from '../landing/view';
import { ensureTileBuild } from '../tiles';
import type { LngLat } from '../types';
import { readBusyAround, rememberedAreas } from './busy';
import { perfCount, perfMark } from '../perfCount';
import { busyReadDue, nearKey, needsBusyRead } from './state';

/** A centre to about 1 km, so the one read is tried once per area and again only when the map moves that far (ML9). */
const areaKey = (c: LngLat) => `${c[0].toFixed(2)},${c[1].toFixed(2)}`;

/**
 * Busy streets as a layer (ML8, ML9): the remembered areas near `centre`, drawn when `on`, on any walk. With none within
 * 1.5 km they are read once (the same read What's good here does); a failure says nothing and waits for a toggle or a
 * move of about 1 km. Nothing is listed or read while off. `reload` lists again after another read (an exploring walk's).
 */
/**
 * Whether the map is moving now, and a promise for its next settle (DC9). Explore keeps it in a ref fed by the map's
 * movestart and moveend, so a move never re-renders the screen.
 */
export type Stillness = () => { moving: boolean; settled: () => Promise<void> };

export function useBusyLayer(centre: LngLat | null, on: boolean, stillness?: Stillness): { view: LandingView | null; reading: boolean; failed: boolean; reload: () => void } {
  const release = useOvertureRelease();
  const [rows, setRows] = useState<LandingRow[]>([]);
  const [build, setBuild] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const tried = useRef(new Set<string>());
  // Read in the effect, never in render; the callback changes identity only if Explore's does.
  const stillnessRef = useRef(stillness);
  useEffect(() => {
    stillnessRef.current = stillness;
  });
  const key = centre ? areaKey(centre) : '';
  useEffect(() => {
    if (!on) tried.current = new Set();
  }, [on]);
  useEffect(() => {
    if (!on) return;
    let live = true;
    void (async () => {
      const [list, b] = await Promise.all([rememberedAreas(), ensureTileBuild().catch(() => null)]);
      if (!live) return;
      setRows(list);
      setBuild(b);
      const needs = !!centre && needsBusyRead(list, centre);
      // DC9: never while the map moves (a switch's ease, a drag): wait for it to settle, then decide again.
      const moving = () => stillnessRef.current?.().moving ?? false;
      while (needs && !tried.current.has(key) && moving()) {
        await stillnessRef.current!().settled();
        if (!live) return;
      }
      if (centre && busyReadDue({ on, needs, tried: tried.current.has(key), moving: moving() })) {
        tried.current.add(key);
        perfCount('busy:read');
        perfMark('mark:busy-read');
        setReading(true);
        const ok = await readBusyAround(centre, () => !live);
        if (!live) return;
        setReading(false);
        setFailed(!ok);
        if (ok) setRows(await rememberedAreas());
      }
    })();
    return () => {
      live = false;
      setReading(false);
    };
    // The centre is read through its key: a new array for the same place is not a move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, key, tick]);
  // Keyed by which areas are near, never by the walker's fix: a few metres on is the same key, so the drawing and its labels are
  // not rebuilt once a fix (layers audit 2).
  const nk = centre ? nearKey(rows, centre) : '';
  const view = useMemo(() => {
    if (!on || !nk) return null;
    const keys = new Set(nk.split('|'));
    return landingView(rows.filter((r) => keys.has(r.key)), build, release);
  }, [on, nk, rows, build, release]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { view, reading: on && reading, failed: on && failed && !view, reload };
}
