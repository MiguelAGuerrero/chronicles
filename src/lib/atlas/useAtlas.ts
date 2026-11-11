// @layer view
import { ensureOvertureRelease } from '../activity/overture';
import { useEffect, useMemo, useRef, useState } from 'react';
import { outlines } from '../areas/outlineReader';
import { BORDER_ZOOM, coveredBy, outlineTileKey, outlineTileOf, type OutlineSet } from '../areas/outlines';
import { useOutlineSet } from '../areas/useOutlineSet';
import type { Area, WalkArea } from '../areas/types';
import { db } from '../db';
import type { Find, Kind } from '../explore/explore';
import { exploreBuild } from '../explore/exploreRun';
import { loadSettings, onSettings } from '../explore/settings';
import type { LngLat } from '../types';
import { ATLAS_RULES, atlasStep, nearList, rowCurrent, townNeighborhoods, townReachM, type AtlasArea, type Listed, type NearTarget } from './atlas';
import { nearReads, readNear, readRing } from './read';
import { townsListedAfter } from './carousel';
import { borderReach } from './hoods';
import { placesArchive } from '../discovery/archive';

/** Another read is running (the walk's, or the other level's): look again shortly. */
const BUSY_MS = 1500;

export type AtlasStatus = 'idle' | 'listing' | 'reading' | 'offline';

export interface AtlasData {
  build: string | null;
  rows: AtlasArea[];
  /** The neighborhoods on screen: around you, or the chosen town's own (AT2). */
  neighborhoods: Listed[];
  /** Towns and cities around you (AT14). */
  towns: Listed[];
  /** The town you are in, when known. */
  home: Listed | null;
  status: AtlasStatus;
  /** A town read of this build has covered you (fix explore-town-scope audits 9, 10): only then may neighborhoods stand in for towns. */
  townsListed: boolean;
  areas: Area[];
  walkAreas: WalkArea[];
  finds: Find[];
  walked: Set<string>;
  hidden: Set<Kind>;
  /** The z12 outlines kept under you, which decided your town (TO10): the borders drawn tint the same one (TB1). */
  outlines: OutlineSet | null;
}

/**
 * The atlas's data and its reads (AT1, AT2, AT5, AT14). While Explore is in
 * front and a position is known, it lists the areas the view needs (the
 * neighborhoods around you or of the chosen town, and the towns around you)
 * where it hasn't under this build, then reads their rings in screen order,
 * one at a time and with no button. A failed read waits before it is tried again.
 */
export function useAtlas(focused: boolean, from: LngLat | null, town: AtlasArea | null): AtlasData {
  const [rows, setRows] = useState<AtlasArea[]>([]);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const [build, setBuild] = useState<string | null>(null);
  const [status, setStatus] = useState<AtlasStatus>('idle');
  const [tick, setTick] = useState(0);
  // Kept with the build it was judged under, so a new build starts again at false (`townsListedAfter`).
  const [townsKnown, setTownsKnown] = useState<{ build: string | null; listed: boolean }>({ build: null, listed: false });
  const [extra, setExtra] = useState<Pick<AtlasData, 'areas' | 'walkAreas' | 'finds' | 'walked'>>(() => ({ areas: [], walkAreas: [], finds: [], walked: new Set() }));
  const [hidden, setHidden] = useState<Set<Kind>>(() => new Set());
  // Town outlines kept around you (TO10): which town you are in, at once across a border.
  const [borders, setBorders] = useState<OutlineSet | null>(null);
  const fromRef = useRef(from);
  useEffect(() => {
    fromRef.current = from;
  }, [from]);
  const failedRef = useRef<{ key: string; t: number } | null>(null);
  const tileKey = from ? outlineTileKey(...outlineTileOf(from)) : null;
  const townKey = town?.key ?? null;
  const townAtRef = useRef(town?.at ?? null);
  useEffect(() => {
    townAtRef.current = town?.at ?? null;
  }, [town]);

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setHidden(s.hidden), () => {});
    const off = onSettings((s) => setHidden(s.hidden));
    return () => {
      alive = false;
      off();
    };
  }, []);

  // Everything stored, again each time Explore comes to the front.
  useEffect(() => {
    if (!focused) return;
    let live = true;
    (async () => {
      const [r, areas, walkAreas, finds, walked, b] = await Promise.all([
        db.listAtlasAreas().catch(() => [] as AtlasArea[]),
        db.listAreas().catch(() => [] as Area[]),
        db.listWalkAreas().catch(() => [] as WalkArea[]),
        db.listFinds().catch(() => [] as Find[]),
        db.visitedSegmentIds().catch(() => new Set<string>()),
        exploreBuild().catch(() => 'unknown'),
      ]);
      if (!live) return;
      rowsRef.current = r;
      setRows(r);
      setExtra({ areas, walkAreas, finds, walked });
      // An unknown build (offline) leaves the last known one; the loop checks again (audit 4).
      if (b !== 'unknown') setBuild(b);
      else setStatus('offline');
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [focused]);

  // The outlines under you (and the open town), from the phone; the tile under you is read once when missing.
  useEffect(() => {
    const at = fromRef.current;
    if (!focused || !at || !tileKey) return;
    let live = true;
    (async () => {
      const points = townAtRef.current ? [at, townAtRef.current] : [at];
      const known = await outlines.known(points);
      if (!live) return;
      setBorders(known);
      const failed = failedRef.current;
      if (coveredBy(known, at) || (failed?.key === tileKey && Date.now() - failed.t < ATLAS_RULES.retryMs)) return;
      const read = await outlines.read([at], () => !live);
      if (!live) return;
      if (read.complete) setBorders(await outlines.known(points));
      else failedRef.current = { key: tileKey, t: Date.now() };
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [focused, tileKey, townKey, rows.length]);

  const towns = useMemo(() => (from ? nearList(rows, from, 'town', build, borders) : []), [rows, from, build, borders]);
  // WT1: the open town's whole border (the z10 read the borders use): its page lists every neighborhood inside it.
  const firstBorders = useOutlineSet(town ? [town.at] : [], BORDER_ZOOM, focused && !!town);
  // Whole-towns audit 1: a border cut at the tile's edge is read on across it.
  const beyond = useMemo(() => (town ? borderReach(town, firstBorders) : []), [town, firstBorders]);
  const wider = useOutlineSet(town && beyond.length ? [town.at, ...beyond] : [], BORDER_ZOOM, focused && !!town && beyond.length > 0);
  const townBorders = beyond.length && wider ? wider : firstBorders;
  const neighborhoods = useMemo(() => {
    if (!from) return [];
    if (!town) return nearList(rows, from, 'neighborhood', build);
    const all = rows.filter((r) => r.level === 'town' && rowCurrent(r, build));
    return townNeighborhoods(rows, town, all, from, build, borders, townBorders);
  }, [rows, from, town, build, borders, townBorders]);
  const home = useMemo(() => towns.find((l) => l.here) ?? null, [towns]);
  const own = useMemo(() => {
    const t = town ? rows.find((r) => r.key === town.key) ?? town : null;
    return t && from ? [{ area: t, distanceM: 0, here: false }] : [];
  }, [rows, town, from]);
  // Read in the row's order (AT5): near you the towns are the row, so they come before the neighborhoods (fix explore-town-scope audit 4).
  const queue = useMemo(() => (town ? [...own, ...neighborhoods, ...towns] : [...towns, ...neighborhoods]), [town, own, neighborhoods, towns]);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // One step of reading per run (`atlasStep`); each step that did something asks for the next.
  useEffect(() => {
    if (!focused || !from) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const again = (ms: number) => {
      timer = setTimeout(() => !stop && setTick((t) => t + 1), ms);
    };
    (async () => {
      const latest = await exploreBuild().catch(() => 'unknown');
      // Checked at most once a day (AD6): rings measured with another release, or none, are read again.
      const release = await ensureOvertureRelease().catch(() => null);
      const [nb, tw] = await Promise.all([nearReads('neighborhood'), nearReads('town')]);
      if (stop) return;
      setTownsKnown((k) => ({ build, listed: townsListedAfter(k.build === build ? k.listed : false, { reads: tw, at: from, build }) }));
      const nears: NearTarget[] = [
        town
          ? { level: 'neighborhood', at: town.at, radiusM: townReachM(town), reads: nb, town: town.key }
          : { level: 'neighborhood', at: from, radiusM: ATLAS_RULES.nearNeighborhoodM, reads: nb },
        { level: 'town', at: from, radiusM: ATLAS_RULES.nearTownM, reads: tw },
      ];
      const step = atlasStep({ build, latest, nears, list: queueRef.current, now: Date.now(), release, archiveAt: (at) => placesArchive.versionAt(at) });
      if (step.kind === 'adopt') {
        // A new map build (or the first known one): its rows are listed afresh, never chased (audit 2, 4).
        setBuild(step.build);
        setStatus('idle');
        return;
      }
      if (step.kind === 'wait') {
        if (!build) setStatus('offline');
        return again(step.ms);
      }
      if (step.kind === 'idle') return setStatus('idle');
      if (step.kind === 'near') {
        setStatus('listing');
        const ok = await readNear(step.at, step.level, build!, step.radiusM, () => stop, step.town && town?.key === step.town ? town : null);
        if (stop) return;
        if (ok === null) return again(BUSY_MS);
        if (!ok) {
          setStatus('offline');
          return again(ATLAS_RULES.retryMs);
        }
        const r = await db.listAtlasAreas().catch(() => rowsRef.current);
        if (stop) return;
        rowsRef.current = r;
        setRows(r);
        return again(0);
      }
      setStatus('reading');
      const row = await readRing(step.area, () => stop);
      if (stop) return;
      if (!row) return again(BUSY_MS);
      const r = [...rowsRef.current.filter((x) => x.key !== row.key), row];
      rowsRef.current = r;
      setRows(r);
      again(0);
    })().catch(() => again(BUSY_MS));
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [focused, from, town, build, tick]);

  return useMemo(
    () => ({ build, rows, neighborhoods, towns, home, status, townsListed: townsKnown.build === build && townsKnown.listed, hidden, outlines: borders, ...extra }),
    [build, rows, neighborhoods, towns, home, status, townsKnown, hidden, borders, extra],
  );
}
