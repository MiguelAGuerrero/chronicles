// @layer view
import { useEffect, useMemo, useState } from 'react';
import { KINDS } from '../explore/explore';
import { loadSettings } from '../explore/settings';
import { distanceM } from '../geo';
import { useKindWalkPrefs } from '../kindWalk/useKindWalk';
import { NAV } from '../nav/rules';
import type { Waypoint } from '../nav/types';
import { GET_THERE_M } from '../startPlan';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { useUnits } from '../useUnits';
import { openWalkId } from '../walkPlanner/app';
import { ceilingFor } from '../walkPlanner/settings';
import { outingPrefs, outingService } from './app';
import { CHIPS, defaultChips } from './chips';
import { outingDest } from './dest';
import type { Journey } from './journeys';
import { outingMap } from './map';
import type { Outing } from './plan';
import type { Session } from './service';
import { NO_SWAP_LINE, SWAPPED_LINE } from './words';

/** Where the outing is headed: a named place, or around where you stand (`name` null). */
export interface JourneyDest {
  name: string | null;
  at: LngLat;
}

type Answer = ReturnType<typeof outingService.journeys>;
type Read = { key: string; session: Session | null };

let loaded = false;
const keyOf = (d: JourneyDest) => `${d.at[0].toFixed(5)},${d.at[1].toFixed(5)}`;

/**
 * The outing page's state (OJ1-OJ4, OJ7, OJ12, OJ14, OJ17, OJ21, OJ25, OJ35): nothing is read until the person's own tap gives a place
 * (a town from the search, or around here); the journeys are computed from that one read and recomputed when the chips or "Include
 * chains" change. The chips start from "What I'm into" and are never written back. A swap's answer is held only until the journeys
 * themselves change. Nothing here is stored.
 */
export function useJourney(you: LngLat | null) {
  const prefs = useKindWalkPrefs();
  const units = useUnits();
  const ceilingM = ceilingFor(prefs.budgetM, units);
  const chains = useStore(outingPrefs.store, (s) => s.chains);
  const [pickedIds, setPicked] = useState<string[] | null>(null);
  const [dest, setDestState] = useState<JourneyDest | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [walkId, setWalkId] = useState<string | null>(null);
  const [at, setAt] = useState<{ base: Answer | null; cur: number; opened: boolean; open: number | null; said: string | null }>({ base: null, cur: 0, opened: false, open: null, said: null });
  const [swapped, setSwapped] = useState<{ base: Answer; cur: number; outing: Outing; offered: Record<number, string[]> } | null>(null);
  useEffect(() => {
    if (!loaded) {
      loaded = true;
      void outingPrefs.load();
    }
    void openWalkId().then(setWalkId);
    // OJ12: the chips on at first follow "What I'm into"; a pick made before the settings arrive is kept.
    void loadSettings().then((s) => setPicked((p) => p ?? defaultChips(KINDS, s.hidden)));
  }, []);
  const ids = pickedIds ?? [];
  const picked = useMemo(() => CHIPS.filter((c) => (pickedIds ?? []).includes(c.id)), [pickedIds]);
  const destKey = dest ? keyOf(dest) : null;
  const session = read && read.key === destKey ? read.session : null;
  const failed = !!read && read.key === destKey && !read.session;
  const reading = !!dest && !(read && read.key === destKey);
  // OJ35: the read begins at the tap that gives a place, never before, and once for that place.
  useEffect(() => {
    let live = true;
    if (!dest || !picked.length || (read && read.key === destKey)) return;
    const key = destKey!;
    void outingService.open(dest.at, picked).then((s) => live && setRead({ key, session: s }));
    return () => {
      live = false;
    };
    // The place is read through its key; the chips only gate the first read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey, picked.length > 0, read?.key]);
  const answer: Answer | null = useMemo(
    () => (session && picked.length ? outingService.journeys({ session, picked, ceilingM, chains }) : null),
    [session, picked, ceilingM, chains],
  );
  const mine = at.base === answer ? at : { base: answer, cur: 0, opened: false, open: null, said: null };
  const journeys: Journey[] = answer?.journeys ?? [];
  const cur = Math.min(mine.cur, Math.max(0, journeys.length - 1));
  const base: Journey | null = journeys[cur] ?? null;
  const swap = swapped && swapped.base === answer && swapped.cur === cur ? swapped : null;
  const journey: Journey | null = base && swap ? { ...base, outing: swap.outing } : base;
  const offered = swap?.offered ?? {};
  const farM = you && dest?.name ? distanceM(you, dest.at) : 0;
  return {
    units,
    chips: CHIPS,
    pickedIds: ids,
    toggle: (id: string) => setPicked((p) => ((p ?? []).includes(id) ? (p ?? []).filter((x) => x !== id) : [...(p ?? []), id])),
    chains,
    setChains: (on: boolean) => void outingPrefs.setChains(on),
    dest,
    /** How far the named place is in a straight line; null around here or with no position. */
    awayM: you && dest?.name ? farM : null,
    setDest: (d: JourneyDest | null) => {
      setDestState(d);
      setAt({ base: null, cur: 0, opened: false, open: null, said: null });
    },
    reading: reading && picked.length > 0,
    failed,
    reasons: answer?.reasons ?? [],
    journeys,
    cur,
    setCur: (i: number) => setAt({ base: answer, cur: i, opened: false, open: null, said: null }),
    journey,
    opened: mine.opened && !!journey,
    setOpened: (on: boolean) => setAt({ ...mine, opened: on, open: null, said: null }),
    map: outingMap(journey?.outing ?? null),
    walkId,
    open: mine.open,
    toggleOpen: (i: number) => setAt({ ...mine, open: mine.open === i ? null : i, said: null }),
    said: mine.said,
    /** QC21, OJ26: Swap within the journey's own chips; closes any open card; none left says so and changes nothing. */
    swap(i: number) {
      if (!session || !answer || !journey) return;
      const r = outingService.swap({ session, picked: journey.wants, mode: journey.outing.loop ? 'loop' : 'oneway', ceilingM, chains, outing: journey.outing, cands: answer.cands, index: i, offered: new Set(offered[i] ?? []) });
      setAt({ ...mine, open: null, said: r.outing ? SWAPPED_LINE : NO_SWAP_LINE });
      setSwapped({ base: answer, cur, outing: r.outing ?? journey.outing, offered: { ...offered, [i]: [...(offered[i] ?? []), ...r.offered] } });
    },
    /** How Start is offered (0121): at once when near; with "When I get there" beside it when far; that alone past what can be walked. */
    startChoice: (farM > NAV.maxM ? 'later' : farM > GET_THERE_M ? 'ask' : 'start') as 'start' | 'ask' | 'later',
    /** Start (QC22): the stops ordered and routed again from where the person is now when that still fits; positions only (QC24). */
    start(now: LngLat | null): Waypoint | null {
      if (!session || !journey) return null;
      const mode = journey.outing.loop ? 'loop' : 'oneway';
      const near = now && distanceM(now, session.from) <= GET_THERE_M ? now : session.from;
      const again = outingService.again({ session, picked: journey.wants, mode, ceilingM, chains, stops: journey.outing.stops, from: near }) ?? journey.outing;
      return outingDest(again);
    },
  };
}
