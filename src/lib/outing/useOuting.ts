// @layer view
import { useEffect, useMemo, useState } from 'react';
import { useKindWalkPrefs } from '../kindWalk/useKindWalk';
import type { Waypoint } from '../nav/types';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { useUnits } from '../useUnits';
import { ceilingFor } from '../walkPlanner/settings';
import { openWalkId } from '../walkPlanner/app';
import { outingPrefs, outingService } from './app';
import { matchWants, WANTS } from './wants';
import { outingDest } from './dest';
import { outingMap } from './map';
import type { Outing } from './plan';
import type { PlanAnswer, Session } from './service';
import { NO_SWAP_LINE } from './words';

let loaded = false;

/**
 * The outing page's state (QC1-QC3, QC7, QC21, QC22, QC41): nothing is read until an entry is picked; the proposal is computed from the
 * session's reads and recomputed when the picks, the mode (Loop first, never remembered) or "Include chains" change. A swap's answer is
 * held only until the proposal itself changes.
 */
export function useOuting(you: LngLat | null) {
  const prefs = useKindWalkPrefs();
  const units = useUnits();
  const ceilingM = ceilingFor(prefs.budgetM, units);
  const chains = useStore(outingPrefs.store, (s) => s.chains);
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    void outingPrefs.load();
  }, []);
  const [query, setQuery] = useState('');
  const [pickedIds, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<'loop' | 'oneway'>('loop');
  const [session, setSession] = useState<Session | null>(null);
  const [walkId, setWalkId] = useState<string | null>(null);
  const picked = useMemo(() => WANTS.filter((w) => pickedIds.includes(w.id)), [pickedIds]);
  const wantsKey = pickedIds.join(',');
  const reading = picked.length > 0 && !!you && !session;
  // QC29: the reads begin at the first pick, never before.
  useEffect(() => {
    let live = true;
    if (!picked.length || !you || session) return;
    void outingService.open(you, picked).then((s) => live && s && setSession(s));
    return () => {
      live = false;
    };
    // The picks are read through the key; the session is read once and kept for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsKey, !!you, !!session]);
  useEffect(() => {
    void openWalkId().then(setWalkId);
  }, []);
  const answer: PlanAnswer | null = useMemo(
    () => (session && picked.length ? outingService.plan({ session, picked, mode, ceilingM, chains }) : null),
    [session, picked, mode, ceilingM, chains],
  );
  const [swapped, setSwapped] = useState<{ base: PlanAnswer; outing: Outing; offered: Record<number, string[]> } | null>(null);
  const current: Outing | null = swapped && swapped.base === answer ? swapped.outing : answer?.outing ?? null;
  const offered = swapped && swapped.base === answer ? swapped.offered : {};
  // The open card and the line about a swap belong to the proposal they were made on: a new proposal has neither.
  const [ui, setUi] = useState<{ base: PlanAnswer | null; open: number | null; said: string | null }>({ base: null, open: null, said: null });
  const mine = ui.base === answer ? ui : { base: answer, open: null, said: null };
  const noPosition = !you;
  const reasons = !you ? (['noPosition'] as const) : answer?.reasons ?? [];
  return {
    ceilingM,
    query,
    setQuery,
    entries: matchWants(query),
    picked,
    pickedIds,
    toggle: (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    mode,
    setMode,
    chains,
    setChains: (on: boolean) => void outingPrefs.setChains(on),
    outing: current,
    map: outingMap(current),
    reasons,
    noPosition,
    reading,
    walkId,
    open: mine.open,
    toggleOpen: (i: number) => setUi({ base: answer, open: mine.open === i ? null : i, said: null }),
    said: mine.said,
    /** QC21: Swap closes any open card; the new slot is unnamed; none left says so and changes nothing. */
    swap(i: number) {
      if (!session || !answer || !current) return;
      const r = outingService.swap({ session, picked, mode, ceilingM, chains, outing: current, cands: answer.cands, index: i, offered: new Set(offered[i] ?? []) });
      if (!r.outing) {
        setUi({ base: answer, open: null, said: NO_SWAP_LINE });
        setSwapped({ base: answer, outing: current, offered: { ...offered, [i]: [...(offered[i] ?? []), ...r.offered] } });
        return;
      }
      setUi({ base: answer, open: null, said: null });
      setSwapped({ base: answer, outing: r.outing, offered: { ...offered, [i]: [...(offered[i] ?? []), ...r.offered] } });
    },
    canStart: !!current,
    /** Start (QC22): the stops ordered and routed again from where the walker is now; its destination holds positions only (QC24). */
    start(now: LngLat | null): Waypoint | null {
      if (!session || !current) return null;
      const again = outingService.again({ session, picked, mode, ceilingM, chains, stops: current.stops, from: now ?? session.from }) ?? current;
      return outingDest(again);
    },
  };
}
