// @layer view
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LngLat } from '../types';
import { bordersFor, outlineIdsOf, type BorderView } from './borders';
import { outlines } from './outlineReader';
import { BORDER_ZOOM, OUTLINE_ZOOM, outlineTileKey, outlineTilesFor, type OutlineSet } from './outlines';

/** A failed read is tried again this long after, while the screen is open (TB12). */
const RETRY_MS = 30_000;

/**
 * Town outlines around some points, for a screen (TB1-TB7): the phone's copy
 * at once, then the tiles not kept yet read once. `z` is BORDER_ZOOM to draw,
 * OUTLINE_ZOOM to decide. It runs again only when the tiles under the points
 * change, never per fix or render (TB9). Null until something is known.
 */
export function useOutlineSet(points: readonly (LngLat | null | undefined)[], z: number = OUTLINE_ZOOM, active = true): OutlineSet | null {
  const pts = points.filter((p): p is LngLat => !!p);
  const key = active && pts.length ? (outlineTilesFor(pts, 64, z) ?? []).map(([x, y]) => outlineTileKey(x, y, z)).sort().join(',') : '';
  const pointsRef = useRef(pts);
  useEffect(() => {
    pointsRef.current = pts;
  });
  const [set, setSet] = useState<OutlineSet | null>(null);
  // A failed read asks again after RETRY_MS, for as long as the screen holds these tiles (TB12).
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const at = pointsRef.current;
    (async () => {
      const known = await outlines.known(at, z);
      if (!live) return;
      setSet(known);
      const read = z === OUTLINE_ZOOM ? await outlines.read(at, () => !live) : await outlines.borders(at, () => !live);
      if (!live) return;
      if (read.complete || read.tooMany) setSet(read.set);
      else timer = setTimeout(() => live && setAttempt((n) => n + 1), RETRY_MS);
    })().catch(() => {
      if (live) timer = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
    });
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [key, z, attempt]);
  return key ? set : null;
}

/**
 * TB5: the borders of a replay or a day: the towns its walks were in tinted, the rest of the
 * tile lined. `refresh` reads the towns again (a walk placed while its replay plays).
 */
export function useWalkBorders(walkIds: readonly string[], refresh: string = ''): BorderView | null {
  const idsKey = [...walkIds].sort().join(',');
  const [towns, setTowns] = useState<{ name: string; at: LngLat }[]>([]);
  useEffect(() => {
    if (!idsKey) return;
    let live = true;
    outlines.townsOf(idsKey.split(',')).then((t) => live && setTowns(t), () => {});
    return () => {
      live = false;
    };
  }, [idsKey, refresh]);
  const drawn = useOutlineSet(towns.map((t) => t.at), BORDER_ZOOM);
  return useMemo(() => bordersFor(drawn, { tinted: outlineIdsOf(towns, drawn), near: towns[0]?.at ?? null }), [drawn, towns]);
}
