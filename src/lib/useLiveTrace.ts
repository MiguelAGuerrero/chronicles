import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { db } from './db';
import { isBreak, splitAtGaps, type PauseSpan } from './geo';
import { headingOf } from './nav/navigator';
import { recorder } from './recorder';
import { keptFixes, readTrace, rideRuns, ridingAt, traceDistances } from './rides';
import type { LngLat, TracePoint } from './types';

/** How often the screen (and the map) is refreshed from the live trace. */
const PUBLISH_MS = 2000;

export interface LiveTrace {
  /** The walked trace, split at gaps, pauses and rides: drawn solid. */
  runs: LngLat[][];
  /** Each ride, joined to the walk either side: drawn dashed (rides, R5). */
  rides: LngLat[][];
  /** The newest kept fix, walked or ridden. */
  here: LngLat | null;
  /** Walked distance; rides are counted apart (R6). */
  distanceM: number;
  rideM: number;
  /** Time of the newest kept fix, walked or ridden. */
  lastFixAt: number | null;
  /** Time of the newest fix inside the accuracy gate, kept or not: weak GPS is judged by this (R11). */
  lastGoodAt: number | null;
  /** On a ride now, through stops (R11, R12). */
  riding: boolean;
  /** The way the walker is going, in degrees from north; null when standing still. */
  heading: number | null;
}

const EMPTY: LiveTrace = { runs: [], rides: [], here: null, distanceM: 0, rideM: 0, lastFixAt: null, lastGoodAt: null, riding: false, heading: null };

/** The newest gap in the kept trace that isn't a pause: the app was closed or the page hidden. */
function newestGap(kept: TracePoint[], pauses: PauseSpan[]): { ms: number; at: number } | null {
  for (let i = kept.length - 1; i > 0; i--) {
    const a = kept[i - 1];
    const b = kept[i];
    if (isBreak(a, b, pauses) && !isBreak(a, b, pauses, Infinity)) return { ms: b.t - a.t, at: b.t };
  }
  return null;
}

/**
 * The open walk's trace. Raw fixes are collected as they come; every couple
 * of seconds (not per fix, and not at all in the background) they are read
 * again into the walked trace and the rides, since a ride is only told once
 * it has lasted a while, and then from where it began (R1).
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
  const refreshRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    pausesRef.current = pauses;
    refreshRef.current?.();
  }, [pauses]);
  const gapCb = useRef(onGap);
  useEffect(() => {
    gapCb.current = onGap;
  }, [onGap]);
  const reportedGap = useRef<number | null>(null);
  const dirty = useRef(false);
  const riding = useRef(false);

  useEffect(() => {
    if (!walkId) return;
    const raw: TracePoint[] = [];
    const seen = new Set<number>();
    const add = (p: TracePoint) => {
      if (seen.has(p.t)) return; // a fix can arrive both live and from the initial load
      seen.add(p.t);
      // Fixes come in order; one out of order is put in its place.
      if (raw.length && raw[raw.length - 1].t > p.t) {
        const i = raw.findIndex((q) => q.t > p.t);
        raw.splice(i, 0, p);
      } else raw.push(p);
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
      const ps = pausesRef.current;
      const tr = readTrace(raw, startedAt, ps);
      const kept = keptFixes(tr);
      const last = kept[kept.length - 1];
      const here: LngLat | null = last ? [last.lon, last.lat] : null;
      const gap = newestGap(kept, ps);
      if (gap && gap.at !== reportedGap.current && Date.now() - gap.at < 60_000) {
        reportedGap.current = gap.at;
        gapCb.current?.(gap.ms);
      }
      // The same measure as the walk's card: no jitter while standing still, nothing across a pause or ride.
      const { walkedM, rideM } = traceDistances(tr);
      riding.current = ridingAt(tr, here, Date.now());
      setState({
        runs: splitAtGaps(tr.walked, 60_000, tr.breaks),
        rides: rideRuns(tr),
        here,
        distanceM: walkedM,
        rideM,
        lastFixAt: last?.t ?? null,
        lastGoodAt: tr.lastGoodAt,
        riding: riding.current,
        heading: headingOf(kept.slice(-30)),
      });
    }
    refreshRef.current = () => {
      dirty.current = true;
      publish();
    };
    // On a ride, "On a ride" ends by the clock too, after a long stop with no fixes.
    const timer = setInterval(() => {
      if (riding.current) dirty.current = true;
      publish();
    }, PUBLISH_MS);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        dirty.current = true;
        publish();
      }
    });
    return () => {
      refreshRef.current = null;
      unsub();
      clearInterval(timer);
      appState.remove();
    };
  }, [walkId, startedAt]);

  return state;
}
