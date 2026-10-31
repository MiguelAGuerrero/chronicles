import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { db } from './db';
import { FixFilter, isBreak, smoothDwells, traceDistanceM, withoutPauses, type PauseSpan } from './geo';
import { recorder } from './recorder';
import type { LngLat, TracePoint } from './types';

/** How often the screen (and the map) is refreshed from the live trace. */
const PUBLISH_MS = 2000;

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
  /** The walk's pauses: nothing inside one is drawn, and the trace breaks across each. */
  pauses: PauseSpan[],
  /** Called once per gap in the trace (not a pause), when it is first published. */
  onGap?: (ms: number) => void,
): LiveTrace {
  const [state, setState] = useState<LiveTrace>(EMPTY);
  const pausesRef = useRef(pauses);
  const rebuildRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    pausesRef.current = pauses;
    rebuildRef.current?.();
  }, [pauses]);
  const gapCb = useRef(onGap);
  useEffect(() => {
    gapCb.current = onGap;
  }, [onGap]);
  const reportedGap = useRef<number | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!walkId) return;
    const a: Acc = { filter: new FixFilter(startedAt), runs: [], seen: new Set(), gap: null };

    const rebuild = () => {
      // A re-anchor can remove the newest fix, and a new pause changes where
      // the trace breaks; rebuilding the runs from the accepted list keeps
      // those rare cases simple and correct.
      a.runs = [];
      const fixes = a.filter.accepted;
      for (let i = 0; i < fixes.length; i++) addRun(fixes[i], fixes[i - 1]);
    };
    const addRun = (p: TracePoint, prev: TracePoint | undefined) => {
      const ps = pausesRef.current;
      if (withoutPauses([p], ps).length === 0) return; // recorded as the pause began
      const pos: LngLat = [p.lon, p.lat];
      if (!prev || !a.runs.length || isBreak(prev, p, ps)) {
        if (prev && !isBreak(prev, p, ps, Infinity)) a.gap = { ms: p.t - prev.t, at: p.t };
        a.runs.push([pos]);
      } else {
        a.runs[a.runs.length - 1].push(pos);
      }
    };
    rebuildRef.current = () => {
      rebuild();
      dirty.current = true;
      publish();
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
        // The same measure as the walk's card: no jitter while standing still, nothing across a pause.
        distanceM: traceDistanceM(smoothDwells(withoutPauses(fixes, pausesRef.current)), pausesRef.current),
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
      rebuildRef.current = null;
      unsub();
      clearInterval(timer);
      appState.remove();
    };
  }, [walkId, startedAt]);

  return state;
}
