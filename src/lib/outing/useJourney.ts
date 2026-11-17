// @layer view
import { useEffect, useMemo, useState } from 'react';
import { KINDS } from '../explore/explore';
import { loadSettings } from '../explore/settings';
import { indexOf } from '../gazetteer/loader';
import { bundledGazetteer } from '../gazetteer/source';
import { boundsOf, distanceM } from '../geo';
import { useKindWalkPrefs } from '../kindWalk/useKindWalk';
import { NAV } from '../nav/rules';
import type { Waypoint } from '../nav/types';
import { GET_THERE_M } from '../startPlan';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { useUnits } from '../useUnits';
import { openWalkId } from '../walkPlanner/app';
import { ceilingFor } from '../walkPlanner/settings';
import { outingPrefs, outingService, walkedTowns } from './app';
import { areaKey, areasAround, areasToward, type Area, type TownRow } from './areas';
import { CHIPS, defaultChips } from './chips';
import { outingDest } from './dest';
import type { Chapter, Journey } from './journeys';
import type { Outing } from './plan';
import type { Session } from './service';
import { NO_OTHER_LINE, reachSteps } from './journeyWords';
import { NO_SWAP_LINE, SWAPPED_LINE } from './words';

/** A named place the outing heads toward; with none, the outing stays within a reach of where you stand. */
export interface JourneyDest {
  name: string;
  at: LngLat;
}

type Swap = { base: string; outing: Outing; offered: Record<number, string[]> };

let loaded = false;
let townRows: Promise<TownRow[]> | null = null;
/** The gazetteer's towns as plain rows, built once and only when a reach or a destination asks for towns. */
function towns(): Promise<TownRow[]> {
  townRows ??= indexOf(bundledGazetteer).then(({ pack }) => pack.names.map((name, i) => ({ name, at: [pack.lon[i] / 1e4, pack.lat[i] / 1e4] as LngLat })));
  townRows.catch(() => (townRows = null));
  return townRows;
}
const stopsOf = (o: Outing) => o.stops.map((s) => s.id).join('|');

/**
 * The outing page's state (OJ1-OJ4, OJ7, OJ12, OJ14, OJ17, OJ20, OJ21, OJ25, OJ35, OJ41-OJ45; decision 0199). One machine: the areas to
 * look at (where you stand, the towns within the reach, or the towns toward a place) are each read once and planned as chapters; the
 * journeys are recomputed as each read lands and when the chips or "Include chains" change. The page proposes as it opens, around
 * where you stood then; towns are read only when the reach or a destination asks. Nothing here is stored.
 */
export function useJourney(you: LngLat | null) {
  const prefs = useKindWalkPrefs();
  const units = useUnits();
  const ceilingM = ceilingFor(prefs.budgetM, units);
  const chains = useStore(outingPrefs.store, (s) => s.chains);
  const [pickedIds, setPicked] = useState<string[] | null>(null);
  const [dest, setDestState] = useState<JourneyDest | null>(null);
  const [reachM, setReachState] = useState(0);
  const [origin, setOrigin] = useState<LngLat | null>(you);
  // Where you stood when the page had a position first: the reads are made around it, not around every later fix.
  if (!origin && you) setOrigin(you);
  const [rows, setRows] = useState<{ towns: TownRow[]; walked: TownRow[] } | null>(null);
  const [reads, setReads] = useState<Record<string, Session | null>>({});
  const [walkId, setWalkId] = useState<string | null>(null);
  const [ui, setUi] = useState<{ leaning: string | null; opened: boolean; open: string | null; said: string | null }>({ leaning: null, opened: false, open: null, said: null });
  const [salts, setSalts] = useState<Record<string, number>>({});
  const [swaps, setSwaps] = useState<Record<string, Swap>>({});
  useEffect(() => {
    if (!loaded) {
      loaded = true;
      void outingPrefs.load();
    }
    void openWalkId().then(setWalkId);
    // OJ12: the chips on at first follow "What I'm into"; a pick made before the settings arrive is kept.
    void loadSettings().then((s) => setPicked((p) => p ?? defaultChips(KINDS, s.hidden)));
  }, []);
  const needTowns = !!dest || reachM > 0;
  useEffect(() => {
    let live = true;
    if (!needTowns || rows) return;
    void Promise.all([towns(), walkedTowns().catch(() => [])]).then(([t, w]) => live && setRows({ towns: t, walked: w }), () => {});
    return () => {
      live = false;
    };
  }, [needTowns, rows]);
  const picked = useMemo(() => CHIPS.filter((c) => (pickedIds ?? []).includes(c.id)), [pickedIds]);
  const areas: Area[] = useMemo(() => {
    if (dest) return origin && rows ? areasToward(rows.towns, origin, dest, rows.walked) : [{ name: dest.name, at: dest.at }];
    if (!origin) return [];
    return reachM > 0 && rows ? areasAround(rows.towns, origin, reachM, rows.walked) : [{ name: null, at: origin }];
  }, [dest, origin, reachM, rows]);
  const areasKey = areas.map(areaKey).join(';');
  const waiting = areas.filter((a) => !(areaKey(a) in reads));
  const hasPicks = picked.length > 0;
  // OJ35, OJ37: each area is read once, one after another, and a change of the areas stops the reads that no longer matter.
  useEffect(() => {
    let live = true;
    if (!hasPicks || !waiting.length) return;
    void (async () => {
      for (const a of waiting) {
        if (!live) return;
        const s = await outingService.open(a.at, picked).catch(() => null);
        if (!live) return;
        setReads((r) => ({ ...r, [areaKey(a)]: s }));
      }
    })();
    return () => {
      live = false;
    };
    // The areas are read through their key; the chips only gate the first read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areasKey, hasPicks]);
  const ready = useMemo(() => areas.flatMap((a) => (reads[areaKey(a)] ? [{ area: a, session: reads[areaKey(a)]! }] : [])), [areas, reads]);
  const request = useMemo(() => ({ reads: ready, origin: origin ?? dest?.at ?? null, picked, ceilingM, chains, toward: !!dest }), [ready, origin, dest, picked, ceilingM, chains]);
  const answer = useMemo(() => (ready.length && hasPicks ? outingService.journeys({ ...request, salts }) : null), [ready.length, hasPicks, request, salts]);
  const planned: Journey[] = answer?.journeys ?? [];
  const base: Journey | null = planned.find((j) => j.leaning === ui.leaning) ?? planned[0] ?? null;
  const cur = base ? planned.indexOf(base) : 0;
  // A swap made in a chapter stands while that chapter is still the one it was made on.
  const journey: Journey | null = useMemo(() => {
    if (!base) return null;
    const chapters: Chapter[] = base.chapters.map((c) => {
      const sw = swaps[`${base.leaning}|${areaKey(c.area)}`];
      return sw && sw.base === stopsOf(c.outing) ? { ...c, outing: sw.outing } : c;
    });
    return { ...base, chapters, footM: chapters.reduce((m, c) => m + c.outing.lengthM, 0) };
  }, [base, swaps]);
  const first = journey?.chapters[0] ?? null;
  const farM = origin && first?.area.name ? distanceM(origin, first.area.at) : 0;
  const pins = useMemo(() => journey?.chapters.flatMap((c) => c.outing.stops.map((s) => s.at)) ?? [], [journey]);
  const route = first && first.outing.path.length > 1 ? first.outing.path : null;
  const fit = useMemo(() => {
    if (pins.length) return boundsOf([...pins, ...(route ?? []), ...(origin && journey && journey.chapters.length > 1 ? [origin] : [])], 60);
    return dest ? boundsOf([dest.at], 1200) : null;
  }, [pins, route, origin, journey, dest]);
  const steps = reachSteps(units);
  const reading = hasPicks && waiting.length > 0;
  const failed = hasPicks && !reading && areas.length > 0 && !ready.length;
  return {
    units,
    chips: CHIPS,
    pickedIds: pickedIds ?? [],
    toggle: (id: string) => {
      setPicked((p) => ((p ?? []).includes(id) ? (p ?? []).filter((x) => x !== id) : [...(p ?? []), id]));
      // The journeys change with the chips: the row starts again at its first card.
      setUi({ leaning: null, opened: false, open: null, said: null });
    },
    chains,
    setChains: (on: boolean) => void outingPrefs.setChains(on),
    hasOrigin: !!origin,
    dest,
    /** How far the named place is in a straight line; null with none or with no position. */
    awayM: origin && dest ? distanceM(origin, dest.at) : null,
    setDest: (d: JourneyDest | null) => {
      setDestState(d);
      setUi({ leaning: null, opened: false, open: null, said: null });
    },
    /** OJ41: the reach: 0 is close by (what a walk reaches), then the steps of `reachSteps`. */
    reachM,
    reachSteps: [0, ...steps],
    setReach: (m: number) => {
      setReachState(m);
      setUi({ leaning: null, opened: false, open: null, said: null });
    },
    /** The next step out, or null at the last. */
    further: steps.find((s) => s > reachM) ?? null,
    reading,
    readingTowns: needTowns && !rows,
    failed,
    reasons: reading ? [] : answer?.reasons ?? [],
    journeys: planned,
    cur,
    setCur: (i: number) => planned[i] && setUi({ leaning: planned[i].leaning, opened: false, open: null, said: null }),
    journey,
    opened: ui.opened && !!journey,
    setOpened: (on: boolean) => setUi({ leaning: journey?.leaning ?? null, opened: on, open: null, said: null }),
    map: { route, pins, fit },
    walkId,
    open: ui.open,
    toggleOpen: (key: string) => setUi({ ...ui, open: ui.open === key ? null : key, said: null }),
    said: ui.said,
    /** QC21, OJ26: Swap within its chapter and the journey's own chips; closes any open card; none left says so and changes nothing. */
    swap(ci: number, i: number) {
      const c = journey?.chapters[ci];
      const session = c ? reads[areaKey(c.area)] : null;
      if (!journey || !base || !c || !session) return;
      const key = `${journey.leaning}|${areaKey(c.area)}`;
      const baseKey = stopsOf(base.chapters[ci].outing);
      const offered = swaps[key]?.base === baseKey ? swaps[key].offered : {};
      const mode = c.outing.loop ? 'loop' : 'oneway';
      const r = outingService.swap({ session, picked: journey.wants, mode, ceilingM, chains, outing: c.outing, cands: outingService.candidates(session, chains), index: i, offered: new Set(offered[i] ?? []) });
      setUi({ ...ui, open: null, said: r.outing ? SWAPPED_LINE : NO_SWAP_LINE });
      setSwaps({ ...swaps, [key]: { base: baseKey, outing: r.outing ?? c.outing, offered: { ...offered, [i]: [...(offered[i] ?? []), ...r.offered] } } });
    },
    /** OJ45: the journey in view planned again from other places; with none it says so and stays as it is. */
    another() {
      if (!journey) return;
      const next = { ...salts, [journey.leaning]: (salts[journey.leaning] ?? 0) + 1 };
      const found = outingService.journeys({ ...request, salts: next }).journeys.some((j) => j.leaning === journey.leaning);
      if (found) setSalts(next);
      setUi({ ...ui, leaning: journey.leaning, open: null, said: found ? null : NO_OTHER_LINE });
    },
    /** How Start is offered (0121): at once when near; with "When I get there" beside it when far; that alone past what can be walked. */
    startChoice: (farM > NAV.maxM ? 'later' : farM > GET_THERE_M ? 'ask' : 'start') as 'start' | 'ask' | 'later',
    /** Start (QC22): the first chapter, routed again from where the person is now when it is around them; positions only (QC24). */
    start(now: LngLat | null): Waypoint | null {
      const session = first ? reads[areaKey(first.area)] : null;
      if (!journey || !first || !session) return null;
      if (first.outing.stops.length < 2) return outingDest(first.outing);
      const mode = first.outing.loop ? 'loop' : 'oneway';
      const from = now && distanceM(now, session.from) <= GET_THERE_M ? now : session.from;
      return outingDest(outingService.again({ session, picked: journey.wants, mode, ceilingM, chains, stops: first.outing.stops, from }) ?? first.outing);
    },
  };
}
