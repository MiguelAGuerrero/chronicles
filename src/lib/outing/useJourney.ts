// @layer view
import { useEffect, useMemo, useState } from 'react';
import { KINDS } from '../explore/explore';
import { loadSettings } from '../explore/settings';
import { indexOf } from '../gazetteer/loader';
import { bundledGazetteer } from '../gazetteer/source';
import { boundsOf, distanceM } from '../geo';
import { useKindWalkPrefs } from '../kindWalk/useKindWalk';
import { travelMode } from '../nav/handoff';
import type { Waypoint } from '../nav/types';
import { roads } from '../roads';
import type { RoadAnswer } from '../roads/service';
import { thinLine } from '../roads/thin';
import { GET_THERE_M } from '../startPlan';
import { startChoice } from './choice';
import type { LngLat } from '../types';
import { useStore } from '../useStore';
import { useUnits } from '../useUnits';
import { openWalkId } from '../walkPlanner/app';
import { ceilingFor } from '../walkPlanner/settings';
import { outingPrefs, outingService, walkedTowns } from './app';
import { areaKey, areasAround, areasToward, newTowns, withoutAreas, type Area, type TownRow } from './areas';
import { journeyPlan, type JourneyPlan } from './journeyPlan';
import { CHIPS, defaultChips } from './chips';
import { outingDest } from './dest';
import type { Chapter, Journey } from './journeys';
import type { Outing } from './plan';
import type { Session } from './service';
import { ANOTHER_LINE, leftOutLine, NO_OTHER_LINE, reachSteps } from './journeyWords';
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
/** RE1: the points a journey's road passes through: where you stand, then its towns in order. */
const roadPoints = (origin: LngLat, j: Journey): LngLat[] => [origin, ...j.chapters.filter((c) => c.area.name).map((c) => c.area.at)];
const roadKey = (pts: readonly LngLat[]): string => pts.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join(';');
/** RE16: the road reaches the map as at most this many points. */
const ROAD_POINTS = 400;

/**
 * The outing page's state (OJ1-OJ4, OJ7, OJ12, OJ14, OJ17, OJ20, OJ21, OJ25, OJ35, OJ41-OJ45; decision 0205). One machine: the areas to
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
  // `walked` is null when the towns of the recorded outings could not be read: then nothing is said to be new (audit 49).
  const [rows, setRows] = useState<{ towns: TownRow[]; walked: TownRow[] | null } | null>(null);
  const [reads, setReads] = useState<Record<string, Session | null>>({});
  const [walkId, setWalkId] = useState<string | null>(null);
  const [ui, setUi] = useState<{ leaning: string | null; opened: boolean; open: string | null; said: string | null }>({ leaning: null, opened: false, open: null, said: null });
  const [salts, setSalts] = useState<Record<string, number>>({});
  const [swaps, setSwaps] = useState<Record<string, Swap>>({});
  // The last swap or "Another like this", so it can be taken back (ui 3).
  const [undo, setUndo] = useState<{ swaps: Record<string, Swap>; salts: Record<string, number>; left: ReadonlySet<string>; line: string } | null>(null);
  const [townsFailed, setTownsFailed] = useState(false);
  // OJ26: the towns left out of this look, by the page's own memory.
  const [left, setLeft] = useState<ReadonlySet<string>>(new Set());
  // RE1: the way by road of each journey asked for, by its points; held by the page alone.
  const [ways, setWays] = useState<Record<string, RoadAnswer>>({});
  // Audit 1: what was asked of one set of journeys (other places, a swap) does not carry to the next set.
  const fresh = () => {
    setUi({ leaning: null, opened: false, open: null, said: null });
    setSalts({});
    setSwaps({});
    setUndo(null);
  };
  useEffect(() => {
    if (!loaded) {
      loaded = true;
      void outingPrefs.load();
    }
    // A new look: the traces visited is read from are read again (audit 6).
    outingService.forget();
    void openWalkId().then(setWalkId);
    // OJ12: the chips on at first follow "What I'm into"; a pick made before the settings arrive is kept.
    void loadSettings().then((s) => setPicked((p) => p ?? defaultChips(KINDS, s.hidden)));
  }, []);
  const needTowns = !!dest || reachM > 0;
  useEffect(() => {
    let live = true;
    if (!needTowns || rows || townsFailed) return;
    // Audit 8: a list of towns that cannot be read says so and can be asked again.
    void Promise.all([towns(), walkedTowns().then((w) => w as TownRow[] | null, () => null)]).then(([t, w]) => live && setRows({ towns: t, walked: w }), () => live && setTownsFailed(true));
    return () => {
      live = false;
    };
  }, [needTowns, rows, townsFailed]);
  const picked = useMemo(() => CHIPS.filter((c) => (pickedIds ?? []).includes(c.id)), [pickedIds]);
  const areas: Area[] = useMemo(() => {
    const all: Area[] = dest
      ? origin && rows ? areasToward(rows.towns, origin, dest, rows.walked ?? []) : [{ name: dest.name, at: dest.at }]
      : !origin ? [] : reachM > 0 && rows ? areasAround(rows.towns, origin, reachM, rows.walked ?? []) : [{ name: null, at: origin }];
    return withoutAreas(all, left, dest ? areaKey(dest) : null);
  }, [dest, origin, reachM, rows, left]);
  const areasKey = areas.map(areaKey).join(';');
  const fresher = useMemo(() => newTowns(areas, rows ? (rows.walked ? rows.walked.length : null) : null), [areas, rows]);
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
  const planned: Journey[] = useMemo(() => answer?.journeys ?? [], [answer]);
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
  // RE8: roads are read only for a journey toward a place the person picked; the one in view first, then the other cards'.
  const asks = useMemo(() => {
    if (!dest || !origin) return [];
    const order = base ? [base, ...planned.filter((j) => j !== base)] : planned;
    return order.map((j) => roadPoints(origin, j)).filter((p) => p.length > 1);
  }, [dest, origin, planned, base]);
  const asksKey = asks.map(roadKey).join('|');
  useEffect(() => {
    let live = true;
    const todo = asks.filter((p) => !(roadKey(p) in ways));
    if (!todo.length) return;
    void (async () => {
      for (const p of todo) {
        const a = await roads.way(p, () => !live);
        if (!live || !a) return;
        setWays((w) => ({ ...w, [roadKey(p)]: a }));
      }
    })();
    return () => {
      live = false;
    };
    // The asks are read through their key; an answer already held is not asked for again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asksKey]);
  // The graph is the page's: dropped when it closes.
  useEffect(() => () => roads.forget(), []);
  const wayOf = (j: Journey | null): RoadAnswer | null => (j && dest && origin ? ways[roadKey(roadPoints(origin, j))] ?? null : null);
  /** RE2, RE13: a journey's length by road, where every stretch of it is on the road. */
  const roadMOf = (j: Journey | null): number | null => {
    const a = wayOf(j);
    return a?.state === 'found' && a.way.whole ? a.way.lengthM : null;
  };
  const road = wayOf(journey);
  const asked = !!journey && !!dest && !!origin && roadPoints(origin, journey).length > 1;
  // OJ51, RE1, RE16: the towns joined by one faint line from where you stand: the road where it is known, else straight.
  const link = useMemo(() => {
    if (road?.state === 'found') return [thinLine(road.way.path, ROAD_POINTS)];
    const pts = journey?.chapters.filter((c) => c.area.name).map((c) => c.area.at) ?? [];
    return origin && pts.length ? [[origin, ...pts]] : [];
  }, [journey, origin, road]);
  const pins = useMemo(() => journey?.chapters.flatMap((c) => c.outing.stops.map((s) => s.at)) ?? [], [journey]);
  const route = first && first.outing.path.length > 1 ? first.outing.path : null;
  const fit = useMemo(() => {
    if (pins.length) return boundsOf([...pins, ...(route ?? []), ...(origin && journey && journey.chapters.length > 1 ? [origin, ...(road?.state === 'found' ? link[0] ?? [] : [])] : [])], 60);
    return dest ? boundsOf([dest.at], 1200) : null;
  }, [pins, route, origin, journey, dest, road, link]);
  const steps = reachSteps(units);
  const reading = hasPicks && waiting.length > 0;
  const failedKeys = areas.filter((a) => reads[areaKey(a)] === null).map(areaKey);
  const failed = hasPicks && !reading && failedKeys.length > 0;
  return {
    units,
    chips: CHIPS,
    pickedIds: pickedIds ?? [],
    toggle: (id: string) => {
      setPicked((p) => ((p ?? []).includes(id) ? (p ?? []).filter((x) => x !== id) : [...(p ?? []), id]));
      // The journeys change with the chips: the row starts again at its first card, from the first places.
      fresh();
    },
    chains,
    setChains: (on: boolean) => {
      fresh();
      void outingPrefs.setChains(on);
    },
    hasOrigin: !!origin,
    dest,
    /** How far the named place is in a straight line; null with none or with no position. */
    awayM: origin && dest ? distanceM(origin, dest.at) : null,
    /** RE2: how far the named place is by road, when the journey in view ends there and its road is known; else null. */
    awayRoadM: journey && dest && areaKey(journey.chapters[journey.chapters.length - 1].area) === areaKey(dest) ? roadMOf(journey) : null,
    /** RE17: a card's distance by road; null where the road is not known. */
    roadMOf,
    /** RE15, RE18: what the page says of the road: null when none was asked for. */
    road: !asked ? null : road ? road.state : ('reading' as const),
    /** RE19: how the maps app is asked to reach a town: by road when it is a drive away. */
    travel: (a: Area) => travelMode(origin ? distanceM(origin, a.at) : null),
    setDest: (d: JourneyDest | null) => {
      setDestState(d);
      setLeft(new Set());
      fresh();
    },
    /** OJ41: the reach: 0 is close by (what a walk reaches), then the steps of `reachSteps`. */
    reachM,
    reachSteps: [0, ...steps],
    setReach: (m: number) => {
      setReachState(m);
      setLeft(new Set());
      fresh();
    },
    /** The next step out, or null at the last. */
    further: steps.find((s) => s > reachM) ?? null,
    reading,
    readingTowns: needTowns && !rows && !townsFailed,
    townsFailed: needTowns && townsFailed,
    /** Audit 7, 8: asks again for what could not be read: the list of towns, and each area whose read failed. */
    retry() {
      setTownsFailed(false);
      // A road that could not be read is asked for again with the rest.
      setWays((w) => Object.fromEntries(Object.entries(w).filter(([, a]) => a.state !== 'failed')));
      setReads((r) => Object.fromEntries(Object.entries(r).filter(([, s]) => s !== null)));
    },
    /** OJ41 (ui 1): with a wider reach and its reads done, the towns that were looked at, by name; null otherwise. */
    looked: !dest && reachM > 0 && rows && !reading ? areas.flatMap((a) => (a.name && reads[areaKey(a)] ? [a.name] : [])) : null,
    failed,
    reasons: reading ? [] : answer?.reasons ?? [],
    journeys: planned,
    cur,
    setCur: (i: number) => planned[i] && setUi({ leaning: planned[i].leaning, opened: false, open: null, said: null }),
    journey,
    opened: ui.opened && !!journey,
    setOpened: (on: boolean) => setUi({ leaning: journey?.leaning ?? null, opened: on, open: null, said: null }),
    map: { route, pins, fit, link },
    /** OJ26: leaves a town out of this look; never the destination's, never where you stand. */
    leaveOut: (a: Area) => {
      // It acts at once and can be taken back (the second audit); it holds across a change of chips, and goes with the place or the reach.
      setUndo({ swaps, salts, left, line: leftOutLine(a.name ?? '') });
      setLeft(new Set([...left, areaKey(a)]));
      setUi({ ...ui, open: null, said: leftOutLine(a.name ?? '') });
    },
    /** OJ50: a town that may say "New to you.". */
    isNewTown: (a: Area) => !!a.name && fresher.has(a.name),
    canLeaveOut: (a: Area) => !!a.name && (!dest || areaKey(a) !== areaKey(dest)) && (journey?.chapters.length ?? 0) > 1,
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
      // Audit 13: an earlier change stays undoable when this one changed nothing.
      if (r.outing) setUndo({ swaps, salts, left, line: SWAPPED_LINE });
      setSwaps({ ...swaps, [key]: { base: baseKey, outing: r.outing ?? c.outing, offered: { ...offered, [i]: [...(offered[i] ?? []), ...r.offered] } } });
    },
    /** OJ45: the journey in view planned again from other places; with none it says so and stays as it is. */
    another() {
      if (!journey) return;
      const next = { ...salts, [journey.leaning]: (salts[journey.leaning] ?? 0) + 1 };
      const found = outingService.journeys({ ...request, salts: next }).journeys.some((j) => j.leaning === journey.leaning);
      if (found) setSalts(next);
      if (found) setUndo({ swaps, salts, left, line: ANOTHER_LINE });
      setUi({ ...ui, leaning: journey.leaning, open: null, said: found ? ANOTHER_LINE : NO_OTHER_LINE });
    },
    /** ui 3: takes back the last swap or "Another like this"; offered only right after one. */
    canUndo: !!undo,
    /** The line beside Undo: what was last said, or what the change that can be taken back was. */
    undoLine: ui.said ?? undo?.line ?? null,
    dismiss() {
      setUndo(null);
      setUi({ ...ui, said: null });
    },
    undo() {
      if (!undo) return;
      setSwaps(undo.swaps);
      setSalts(undo.salts);
      setLeft(undo.left);
      setUndo(null);
      setUi({ ...ui, open: null, said: null });
    },
    /** How Start is offered (0121): at once when near; with "When I get there" beside it when far; that alone past what can be walked. */
    startChoice: first ? startChoice({ origin, first: first.area.at, named: !!first.area.name }) : ('start' as const),
    /**
     * Start (QC22, OJ28): the way on foot for the first chapter when it is around you (routed again from where you are now), none
     * when it is far; and the plan the session carries when the journey names a town (OJ48). Positions only (QC24).
     */
    start(now: LngLat | null): { dest: Waypoint | null; plan: JourneyPlan | null } | null {
      const session = first ? reads[areaKey(first.area)] : null;
      if (!journey || !first || !session) return null;
      const plan = journey.chapters.some((c) => c.area.name) ? journeyPlan(journey) : null;
      const from = now ?? origin;
      if (first.area.name && (!from || distanceM(from, first.area.at) > GET_THERE_M)) return { dest: null, plan };
      if (first.outing.stops.length < 2) return { dest: outingDest(first.outing), plan };
      const mode = first.outing.loop ? 'loop' : 'oneway';
      const near = now && distanceM(now, session.from) <= GET_THERE_M ? now : session.from;
      return { dest: outingDest(outingService.again({ session, picked: journey.wants, mode, ceilingM, chains, stops: first.outing.stops, from: near }) ?? first.outing), plan };
    },
    /** "When I get there" (0121): the first chapter kept as Navigate's destination; nothing starts and no plan is carried. */
    later: (): Waypoint | null => (first ? outingDest(first.outing) : null),
  };
}
