// @layer view
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOvertureRelease } from '../activity/useOvertureRelease';
import { landingView, nearAreas, type LandingRow, type LandingView } from '../landing/view';
import { ensureTileBuild } from '../tiles';
import type { LngLat } from '../types';
import { readBusyAround, rememberedAreas } from './busy';
import { needsBusyRead } from './state';

/** A centre to about 1 km, so the one read is tried once per area and again only when the map moves that far (ML9). */
const areaKey = (c: LngLat) => `${c[0].toFixed(2)},${c[1].toFixed(2)}`;

/**
 * Busy streets as a layer (ML8, ML9): the remembered areas near `centre`, drawn when `on`, on any walk. With none within
 * 1.5 km they are read once (the same read What's good here does); a failure says nothing and waits for a toggle or a
 * move of about 1 km. Nothing is listed or read while off. `reload` lists again after another read (an exploring walk's).
 */
export function useBusyLayer(centre: LngLat | null, on: boolean): { view: LandingView | null; reading: boolean; reload: () => void } {
  const release = useOvertureRelease();
  const [rows, setRows] = useState<LandingRow[]>([]);
  const [build, setBuild] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [tick, setTick] = useState(0);
  const tried = useRef(new Set<string>());
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
      if (centre && needsBusyRead(list, centre) && !tried.current.has(key)) {
        tried.current.add(key);
        setReading(true);
        const ok = await readBusyAround(centre, () => !live);
        if (!live) return;
        setReading(false);
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
  const near = useMemo(() => (centre ? nearAreas(rows, centre) : []), [rows, centre]);
  const view = useMemo(() => (on && near.length ? landingView(near, build, release) : null), [on, near, build, release]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { view, reading: on && reading, reload };
}
