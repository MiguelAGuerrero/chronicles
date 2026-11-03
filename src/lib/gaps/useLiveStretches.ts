import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import type { Fill, GapDecision, LngLat } from '../types';
import { decide, readGap } from './index';
import { decisionFor, fillsOf, gapKey, stretchesFor, type Gap, type Inference, type Stretch } from './infer';

/** A gap whose streets couldn't be read is tried again after this long (G8; offline, a failed fetch). */
const RETRY_MS = 2 * 60_000;

export interface LiveStretches {
  /** Every gap's stretch: filled, kept or offered (G5, G6, G10). */
  stretches: Stretch[];
  /** Filled and kept: walked trace (G11). Stable until the stretches change. */
  fills: Fill[];
  /** Offered: drawn faint (G6). */
  faint: LngLat[][];
  /** Keeps or dismisses a stretch, and shows it at once (G10). */
  decide: (s: Stretch, state: GapDecision['state']) => Promise<void>;
}

const NONE: Stretch[] = [];

/**
 * The open walk's stretches across gaps (Filling gaps, G12): once a new fix
 * closes a gap (back in the app, or GPS back), its streets are read in code
 * and the gap inferred, one gap at a time; a gap the walker decided is never
 * read. Lives with the live trace, so a minimized walk keeps its stretches.
 */
export function useLiveStretches(walkId: string | null, gaps: Gap[]): LiveStretches {
  const [decisions, setDecisions] = useState<{ walkId: string | null; rows: GapDecision[] }>({ walkId: null, rows: [] });
  const [inferred, setInferred] = useState<{ walkId: string | null; rows: Inference[] }>({ walkId: null, rows: [] });
  const [tick, setTick] = useState(0);
  const tried = useRef(new Map<string, number>());
  const reading = useRef(false);

  useEffect(() => {
    tried.current = new Map();
    if (!walkId) return;
    let alive = true;
    db.getGapDecisions(walkId)
      .then((rows) => alive && setDecisions({ walkId, rows }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [walkId]);

  const mine = useMemo(() => (decisions.walkId === walkId ? decisions.rows : []), [decisions, walkId]);
  const found = useMemo(() => (inferred.walkId === walkId ? inferred.rows : []), [inferred, walkId]);

  useEffect(() => {
    if (!walkId || reading.current || decisions.walkId !== walkId) return;
    const now = Date.now();
    const todo = gaps.filter((g) => {
      if (decisionFor(g, mine) || found.some((x) => gapKey(x) === gapKey(g))) return false;
      const at = tried.current.get(gapKey(g));
      return at == null || now - at >= RETRY_MS;
    });
    if (!todo.length) return;
    reading.current = true;
    let unread = false;
    (async () => {
      for (const g of todo) {
        tried.current.set(gapKey(g), Date.now());
        const inf = await readGap(walkId, g).catch(() => undefined);
        if (inf === undefined) unread = true;
        else if (inf) setInferred((prev) => ({ walkId, rows: [...(prev.walkId === walkId ? prev.rows : []), inf] }));
      }
    })().finally(() => {
      reading.current = false;
      // Unread gaps are tried again later, without waiting for a new gap.
      if (unread) setTimeout(() => setTick((t) => t + 1), RETRY_MS);
    });
  }, [walkId, gaps, mine, found, decisions.walkId, tick]);

  const stretches = useMemo(() => (gaps.length ? stretchesFor(gaps, found, mine) : NONE), [gaps, found, mine]);
  const fills = useMemo(() => fillsOf(stretches), [stretches]);
  const faint = useMemo(() => stretches.filter((s) => s.how === 'offer').map((s) => s.path), [stretches]);
  const decideNow = useCallback(
    async (s: Stretch, state: GapDecision['state']) => {
      if (!walkId) return;
      await decide(walkId, s, state);
      const rows = await db.getGapDecisions(walkId);
      setDecisions({ walkId, rows });
    },
    [walkId],
  );
  // One object while nothing changed: the open walk's context is memoized on it (perf).
  return useMemo(() => ({ stretches, fills, faint, decide: decideNow }), [stretches, fills, faint, decideNow]);
}
