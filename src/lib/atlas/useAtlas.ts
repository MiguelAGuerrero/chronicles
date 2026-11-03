// @layer view
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Area, WalkArea } from '../areas/types';
import { db } from '../db';
import type { Find, Kind } from '../explore/explore';
import { exploreBuild } from '../explore/exploreRun';
import { loadSettings, onSettings } from '../explore/settings';
import type { LngLat } from '../types';
import { ATLAS_RULES, atlasStep, nearList, type AtlasArea, type AtlasLevel, type Listed } from './atlas';
import { lastNear, readNear, readRing } from './read';

/** Another read is running (the walk's, or the other level's): look again shortly. */
const BUSY_MS = 1500;

export type AtlasStatus = 'idle' | 'listing' | 'reading' | 'offline';

export interface AtlasData {
  build: string | null;
  rows: AtlasArea[];
  list: Listed[];
  status: AtlasStatus;
  areas: Area[];
  walkAreas: WalkArea[];
  finds: Find[];
  walked: Set<string>;
  hidden: Set<Kind>;
}

/**
 * The atlas's data and its reads (AT1, AT5, AT14). While Explore is in front
 * and a position is known, it lists the level's areas around you when it
 * hasn't here under this build, then reads their rings nearest first, one at
 * a time and with no button. A failed read waits before it is tried again.
 */
export function useAtlas(focused: boolean, level: AtlasLevel, from: LngLat | null): AtlasData {
  const [rows, setRows] = useState<AtlasArea[]>([]);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const [build, setBuild] = useState<string | null>(null);
  const [status, setStatus] = useState<AtlasStatus>('idle');
  const [tick, setTick] = useState(0);
  const [extra, setExtra] = useState<Pick<AtlasData, 'areas' | 'walkAreas' | 'finds' | 'walked'>>(() => ({ areas: [], walkAreas: [], finds: [], walked: new Set() }));
  const [hidden, setHidden] = useState<Set<Kind>>(() => new Set());

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
      const last = await lastNear(level);
      if (stop) return;
      const step = atlasStep({ build, latest, last, from, list: nearList(rowsRef.current, from, level, build), now: Date.now() });
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
        const ok = await readNear(from, level, build!, () => stop);
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
  }, [focused, from, level, build, tick]);

  const list = useMemo(() => (from ? nearList(rows, from, level, build) : []), [rows, from, level, build]);
  return useMemo(() => ({ build, rows, list, status, hidden, ...extra }), [build, rows, list, status, hidden, extra]);
}
