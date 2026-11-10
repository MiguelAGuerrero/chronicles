import { useCallback, useEffect, useRef, useState } from 'react';
import type { OpenWalkState } from '../OpenWalk';
import { distanceM } from '../../lib/geo';
import type { DrawnLine } from '../../lib/gaps/draw';
import { gapKey, type Gap } from '../../lib/gaps/infer';
import { useGapDraw } from '../../lib/gaps/useGapDraw';
import type { LngLat } from '../../lib/types';
import type { SetNotice } from './useWalkNotice';

/**
 * Stretches across gaps (Filling gaps, G9, G12): a tapped one's card, Keep or Not this way (G10), and
 * Draw my way (GW3-GW8), kept like Keep, as the line drawn. Following comes back after (audit, UI).
 */
export function useWalkGaps(a: { gaps: OpenWalkState['gaps']; here: LngLat | null; setFollowing: (on: boolean) => void; setNotice: SetNotice }) {
  const { gaps: gapView, here, setFollowing, setNotice } = a;
  const liveHereRef = useRef<LngLat | null>(null);
  // Which gap, and where the walker was when it opened: walking 30 m on closes it, as the spot card (audit 7).
  const [gapOpenAt, setGapOpenAt] = useState<{ key: string; from: LngLat | null } | null>(null);
  const gapOpen = gapOpenAt?.key ?? null;
  const setGapOpen = useCallback((key: string | null) => setGapOpenAt(key ? { key, from: liveHereRef.current } : null), []);
  const [gapBusy, setGapBusy] = useState(false);
  // The tapped gap and its stretch, if it has one (a gap with no line has none: GW2).
  const openGapOf = gapOpen ? gapView.gaps.find((g) => gapKey(g) === gapOpen) ?? null : null;
  const openGap = gapOpen ? gapView.stretches.find((s) => gapKey(s) === gapOpen) ?? null : null;
  const drawing = useGapDraw(
    useCallback(
      (gap: Gap, line: DrawnLine) => gapView.decide({ t0: gap.t0, t1: gap.t1, path: line.path, lengthM: line.lengthM, street: null, how: 'kept' }, 'kept'),
      [gapView],
    ),
    useCallback(() => setFollowing(true), [setFollowing]),
  );
  const isDrawing = drawing.gap != null;
  useEffect(() => {
    liveHereRef.current = here;
    if (!gapOpenAt?.from || !here || distanceM(gapOpenAt.from, here) < 30) return;
    const t = setTimeout(() => setGapOpenAt(null), 0);
    return () => clearTimeout(t);
  }, [gapOpenAt, here]);
  // Keep or Not this way (G10): stored with the walk, and the line follows at once.
  const decideGap = async (state: 'kept' | 'dismissed') => {
    if (!openGap) return;
    setGapBusy(true);
    try {
      await gapView.decide(openGap, state);
      setGapOpen(null);
    } catch {
      setNotice({ message: 'Couldn’t save that. Try again.', tone: 'error' });
    } finally {
      setGapBusy(false);
    }
  };
  return { gapView, setGapOpen, openGapOf, openGap, gapBusy, decideGap, drawing, isDrawing };
}

export type WalkGaps = ReturnType<typeof useWalkGaps>;
