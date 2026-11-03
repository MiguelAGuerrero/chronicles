// @layer view
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import type { Fill, GapDecision, LngLat } from '../types';
import { decide, readGap } from './index';
import { decisionFor, emptyGaps, fillsOf, gapKey, stretchesFor, type Gap, type Inference, type Stretch } from './infer';

/** A gap whose streets couldn't be read is tried again after this long (G8; offline, a failed fetch). */
const RETRY_MS = 2 * 60_000;

export interface LiveStretches {
  /** Every gap's stretch: filled, kept or offered (G5, G6, G10). */
  stretches: Stretch[];
  /** Filled and kept: walked trace (G11). Stable until the stretches change. */
  fills: Fill[];
  /** Offered: drawn faint (G6). */
  faint: LngLat[][];
  /** Every gap worth reading, with a stretch or not (GW1). */
  gaps: Gap[];
  /** Gaps with no line across them (GW2), and their dotted joins. */
  empty: Gap[];
  links: LngLat[][];
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
  const current = useRef(walkId);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    current.current = walkId;
    tried.current = new Map();
    if (!walkId) return;
    let alive = true;
    // A failed read is no decisions, so gaps are still read (audit 11).
    db.getGapDecisions(walkId)
      .catch(() => [] as GapDecision[])
      .then((rows) => alive && setDecisions({ walkId, rows }));
    return () => {
      alive = false;
    };
  }, [walkId]);
  useEffect(() => () => {
    if (retry.current) clearTimeout(retry.current);
  }, []);

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
        if (current.current !== walkId) return;
        tried.current.set(gapKey(g), Date.now());
        const inf = await readGap(walkId, g).catch(() => undefined);
        if (inf === undefined) unread = true;
        // This walk's only, one row per gap: a gap whose end moved replaces nothing it shouldn't (audit 10, 11).
        else if (inf && current.current === walkId)
          setInferred((prev) => ({ walkId, rows: [...(prev.walkId === walkId ? prev.rows : []).filter((r) => gapKey(r) !== gapKey(inf)), inf] }));
      }
    })().finally(() => {
      reading.current = false;
      // Gaps that closed while this read ran are looked at now (audit 11); unread ones later.
      setTick((t) => t + 1);
      if (unread) {
        if (retry.current) clearTimeout(retry.current);
        retry.current = setTimeout(() => setTick((t) => t + 1), RETRY_MS);
      }
    });
  }, [walkId, gaps, mine, found, decisions.walkId, tick]);

  const stretches = useMemo(() => (gaps.length ? stretchesFor(gaps, found, mine) : NONE), [gaps, found, mine]);
  const fills = useMemo(() => fillsOf(stretches), [stretches]);
  const faint = useMemo(() => stretches.filter((s) => s.how === 'offer').map((s) => s.path), [stretches]);
  const empty = useMemo(() => emptyGaps(gaps, stretches), [gaps, stretches]);
  const links = useMemo(() => empty.map((g) => [g.from, g.to]), [empty]);
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
  return useMemo(() => ({ stretches, fills, faint, gaps, empty, links, decide: decideNow }), [stretches, fills, faint, gaps, empty, links, decideNow]);
}
