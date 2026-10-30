import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { db } from './db';
import { distanceM, FixFilter } from './geo';
import { recorder } from './recorder';
import type { LngLat, TracePoint } from './types';

/** How often the screen (and the map) is refreshed from the live trace. */
const PUBLISH_MS = 2000;
const GAP_MS = 60_000;

export interface LiveTrace {
  runs: LngLat[][];
  here: LngLat | null;
  distanceM: number;
  /** Time of the newest accepted fix. */
  lastFixAt: number | null;
}

interface Acc {
  filter: FixFilter;
  runs: LngLat[][];
  distance: number;
  seen: Set<number>;
  gap: { ms: number; at: number } | null;
}

const EMPTY: LiveTrace = { runs: [], here: null, distanceM: 0, lastFixAt: null };

/**
 * The open walk's trace, kept incrementally: each fix is filtered and added
 * once, and the screen is refreshed every couple of seconds instead of per
 * fix, and not at all while the app is in the background.
 */
export function useLiveTrace(
  walkId: string | null,
  startedAt: number | null,
  /** Called once per gap in the trace, when it is first published. */
  onGap?: (ms: number) => void,
): LiveTrace {
  const [state, setState] = useState<LiveTrace>(EMPTY);
  const gapCb = useRef(onGap);
  useEffect(() => {
    gapCb.current = onGap;
  }, [onGap]);
  const reportedGap = useRef<number | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!walkId) return;
    const a: Acc = { filter: new FixFilter(startedAt), runs: [], distance: 0, seen: new Set(), gap: null };

    const rebuild = () => {
      // A re-anchor can remove the newest fix; rebuilding the runs from the
      // accepted list keeps that rare case simple and correct.
      a.runs = [];
      a.distance = 0;
      const fixes = a.filter.accepted;
      for (let i = 0; i < fixes.length; i++) addRun(fixes[i], fixes[i - 1]);
    };
    const addRun = (p: TracePoint, prev: TracePoint | undefined) => {
      const pos: LngLat = [p.lon, p.lat];
      if (!prev || p.t - prev.t > GAP_MS) {
        if (prev) a.gap = { ms: p.t - prev.t, at: p.t };
        a.runs.push([pos]);
      } else {
        a.runs[a.runs.length - 1].push(pos);
        a.distance += distanceM([prev.lon, prev.lat], pos);
      }
    };
    const add = (p: TracePoint) => {
      if (a.seen.has(p.t)) return; // a fix can arrive both live and from the initial load
      a.seen.add(p.t);
      const before = a.filter.accepted[a.filter.accepted.length - 1];
      const { added, removed } = a.filter.push(p);
      if (removed || added.length > 1) rebuild();
      else if (added.length === 1) addRun(added[0], before);
      dirty.current = true;
    };

    // Subscribe before loading so nothing emitted during the load is lost.
    const buffered: TracePoint[] = [];
    let loaded = false;
    const unsub = recorder.subscribe((p) => (loaded ? add(p) : buffered.push(p)));
    db.getPoints(walkId).then((stored) => {
      for (const p of [...stored, ...buffered].sort((x, y) => x.t - y.t)) add(p);
      loaded = true;
      publish();
    });

    function publish() {
      if (!dirty.current || AppState.currentState !== 'active') return;
      dirty.current = false;
      const fixes = a.filter.accepted;
      const last = fixes[fixes.length - 1];
      if (a.gap && a.gap.at !== reportedGap.current && Date.now() - a.gap.at < 60_000) {
        reportedGap.current = a.gap.at;
        gapCb.current?.(a.gap.ms);
      }
      setState({
        runs: a.runs.map((r) => r.slice()),
        here: last ? [last.lon, last.lat] : null,
        distanceM: a.distance,
        lastFixAt: last?.t ?? null,
      });
    }
    const timer = setInterval(publish, PUBLISH_MS);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        dirty.current = true;
        publish();
      }
    });
    return () => {
      unsub();
      clearInterval(timer);
      appState.remove();
    };
  }, [walkId, startedAt]);

  return state;
}
