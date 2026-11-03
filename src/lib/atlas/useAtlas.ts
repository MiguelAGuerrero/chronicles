import { useEffect, useMemo, useRef, useState } from 'react';
import type { Area, WalkArea } from '../areas/types';
import { db } from '../db';
import type { Find, Kind } from '../explore/explore';
import { exploreBuild } from '../explore/exploreRun';
import { loadSettings, onSettings } from '../explore/settings';
import type { LngLat } from '../types';
import { ATLAS_RULES, nearList, needsNear, readQueue, type AtlasArea, type AtlasLevel, type Listed } from './atlas';
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
      setBuild(b === 'unknown' ? null : b);
      if (b === 'unknown') setStatus('offline');
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [focused]);

  // One step of reading per run; each step that read something asks for the next.
  useEffect(() => {
    if (!focused || !from || !build) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const again = (ms: number) => {
      timer = setTimeout(() => !stop && setTick((t) => t + 1), ms);
    };
    (async () => {
      if (needsNear(await lastNear(level), from, build)) {
        if (stop) return;
        setStatus('listing');
        const ok = await readNear(from, level, () => stop);
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
      const list = nearList(rowsRef.current, from, level, build);
      const next = readQueue(list, Date.now());
      if (!next) {
        setStatus('idle');
        // A ring that failed is tried again once its wait is over (AT5).
        const waits = list.filter((l) => !l.area.profile && l.area.failed_at != null).map((l) => l.area.failed_at! + ATLAS_RULES.retryMs - Date.now());
        if (waits.length) again(Math.max(0, Math.min(...waits)));
        return;
      }
      setStatus('reading');
      const row = await readRing(next, () => stop);
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
