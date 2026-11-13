// @layer view
import { useEffect, useRef, useState } from 'react';
import type { Stillness } from '../layers/useBusyLayer';
import { perfCount, perfMark } from '../perfCount';
import type { LngLat } from '../types';
import { groundFor, groundKey, groundOf, hoodKeyOf, hoodProbe, keepGround, LOOK_MS, lookAgain, type Ground, type KeptGround } from './hoods';
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
 * Each outline derived is kept for the screen's life (SS1), so a revisit draws it at once, and it is derived only once the
 * map is still (`stillness`, SS2): never during a switch's camera move.
 */
export function useHoodGround(area: { level: string; name: string; at: LngLat } | null, near: PlaceCandidate[], active = true, stillness?: Stillness): Ground | null {
  const hood = active && area?.level === 'neighborhood' ? area : null;
  const key = hood ? hoodKeyOf(hood) : '';
  const stillRef = useRef(stillness);
  useEffect(() => {
    stillRef.current = stillness;
  });
  const [kept, setKept] = useState<KeptGround[]>([]);
  // What the effects derive from, read when they run.
  const keptNow = useRef(kept);
  const nearNow = useRef(near);
  useEffect(() => {
    keptNow.current = kept;
    nearNow.current = near;
  });
  const [read, setRead] = useState<{ key: string; set: OutlineSet } | null>(null);
  // The neighborhood's own read keeps its tiles a moment after it is selected: look in the cache again, a few times, never the network.
  const [tried, setTried] = useState<{ key: string; n: number }>({ key: '', n: 0 });
  const tries = tried.key === key ? tried.n : 0;
  useEffect(() => {
    if (!key || !hood) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const probes = hoodProbe(hood.at);
    // SS2: looked up once the camera is still, so its answer never renders the screen mid-move; a revisit draws the
    // outline kept meanwhile.
    const still = stillRef.current;
    const settled = async () => {
      while (still?.().moving) {
        await still().settled();
        if (!live) return;
      }
    };
    settled().then(() => (live ? outlines.known(probes, OUTLINE_ZOOM) : Promise.reject(new Error('gone')))).then(
      async (set) => {
        if (!live) return;
        // Until every tile beside it is kept too: a neighbor's shape not yet read would let a share run over it.
        if (lookAgain(set, probes, tries)) timer = setTimeout(() => live && setTried({ key, n: tries + 1 }), LOOK_MS);
        // The ground is computed again only when a tile arrived (audit 5), never on every look.
        const read = (was: { key: string; set: OutlineSet } | null) => (was && was.key === key && was.set.tiles.size === set.tiles.size ? was : { key, set });
        const gkNow = groundKey(hood, set.tiles.size, nearNow.current);
        if (groundFor(keptNow.current, key, gkNow)) return setRead(read);
        // Derived in a task of its own (the camera's last frame drawn first), and stored with the read in one update, so a
        // first visit renders the screen once for both (DC12).
        for (;;) {
          await new Promise((res) => setTimeout(res, 0));
          if (!live) return;
          if (!still?.().moving) break;
          await settled();
        }
        perfCount('hood:ground');
        perfMark('mark:hood-ground');
        const ground = groundOf(hood, nearNow.current, set);
        setRead(read);
        setKept((k) => keepGround(k, { hood: key, key: gkNow, ground }));
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
  const gk = hood && set ? groundKey(hood, set.tiles.size, near) : null;
  const exact = gk ? groundFor(kept, key, gk) : undefined;
  useEffect(() => {
    if (!gk || exact) return;
    let live = true;
    void (async () => {
      // SS2: never while the camera moves; a switch's ease settles first.
      // In a task of its own after the settle, so the camera's last frame is drawn first; a move begun meanwhile waits again.
      const still = stillRef.current;
      for (;;) {
        while (still?.().moving) {
          await still().settled();
          if (!live) return;
        }
        await new Promise((res) => setTimeout(res, 0));
        if (!live) return;
        if (!still?.().moving) break;
      }
      const h = hood;
      const s = set;
      const n = nearNow.current;
      if (!live || !h || !s || groundFor(keptNow.current, key, gk)) return;
      perfCount('hood:ground');
      perfMark('mark:hood-ground');
      const ground = groundOf(h, n, s);
      setKept((k) => keepGround(k, { hood: key, key: gk, ground }));
    })();
    return () => {
      live = false;
    };
    // The key stands for the neighborhood, its tiles and its candidates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gk, !!exact]);
  // SS1: the outline derived from exactly this, else this neighborhood's newest while its tiles are looked up again.
  return (exact ?? (key ? groundFor(kept, key, null) : undefined))?.ground ?? null;
}
