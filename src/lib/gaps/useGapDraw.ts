import { useCallback, useMemo, useRef, useState } from 'react';
import { boundsOf } from '../geo';
import { deriveSegments, type RoadFeature } from '../streets';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';
import { addPoint, drawnLine, startDraw, undoPoint, type Draw, type DrawnLine } from './draw';
import { readDrawTiles } from './index';
import type { Gap } from './infer';

/** The paths are read this far around each tap and each end of the gap (GW7). */
const AROUND_M = 300;

export interface GapDrawing {
  /** The gap being drawn, or null when not drawing. */
  gap: Gap | null;
  /** The line so far, from the fix before the gap through every tap (GW3). */
  line: LngLat[] | null;
  /** The line as Done would keep it, with the join to the fix after (GW5, GW6). */
  done: DrawnLine | null;
  points: number;
  /** The paths around a tap couldn't be read: joins are straight (GW7). */
  unread: boolean;
  /** Paths still being read: Done waits for them (gap-drawing audit 4). */
  reading: boolean;
  saving: boolean;
  error: string | null;
  start: (g: Gap) => void;
  tap: (p: LngLat) => void;
  undo: () => void;
  cancel: () => void;
  finish: () => Promise<void>;
}

/**
 * One gap's way being drawn (GW3-GW7): the taps, the paths read around them
 * (each z14 tile once, the streets derived over every tile read so far, so a
 * piece crossing two tiles is whole), and Done, which hands the line to
 * `onKeep`, the screen's own way of keeping a stretch.
 */
export function useGapDraw(onKeep: (gap: Gap, line: DrawnLine) => Promise<void>, onEnd?: () => void): GapDrawing {
  const [draw, setDraw] = useState<Draw | null>(null);
  const [features, setFeatures] = useState<{ roads: RoadFeature[]; names: RoadFeature[]; build: string } | null>(null);
  const [unread, setUnread] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(0);
  const asked = useRef(new Set<string>());
  const session = useRef(0);

  const read = useCallback((points: LngLat[]) => {
    const want: [number, number][] = [];
    for (const p of points)
      for (const t of tilesIn(boundsOf([p], AROUND_M)!)) {
        const k = `${t[0]},${t[1]}`;
        if (asked.current.has(k)) continue;
        asked.current.add(k);
        want.push(t);
      }
    if (!want.length) return;
    const mine = session.current;
    setReading((n) => n + 1);
    void readDrawTiles(want)
      .catch(() => null)
      .then((f) => {
        if (mine !== session.current) return;
        setReading((n) => Math.max(0, n - 1));
        if (!f) {
          // Asked again on the next tap near them (gap-drawing audit 11).
          for (const [x, y] of want) asked.current.delete(`${x},${y}`);
          setUnread(true);
          return;
        }
        setUnread(false);
        setFeatures((prev) => ({ roads: [...(prev?.roads ?? []), ...f.roads], names: [...(prev?.names ?? []), ...f.names], build: f.build }));
      });
  }, []);

  const segments = useMemo(() => (features ? deriveSegments(features.roads, features.names, features.build) : []), [features]);
  // One routing pass gives both the line so far and the line done (gap-drawing audit 9).
  const done = useMemo(() => (draw ? drawnLine(draw, segments, { done: true }) : null), [draw, segments]);
  const line = done?.sofar ?? null;

  const reset = useCallback(() => {
    session.current++;
    asked.current = new Set();
    setDraw(null);
    setFeatures(null);
    setUnread(false);
    setSaving(false);
    setError(null);
    setReading(0);
  }, []);
  const start = useCallback((g: Gap) => {
    reset();
    setDraw(startDraw(g));
    read([g.from, g.to]);
  }, [read, reset]);
  const tap = useCallback((p: LngLat) => {
    setDraw((d) => (d ? addPoint(d, p) : d));
    read([p]);
  }, [read]);
  const undo = useCallback(() => setDraw((d) => (d ? undoPoint(d) : d)), []);
  const cancel = useCallback(() => {
    // Not while a save runs: its end would reset a drawing begun meanwhile (gap-drawing audit 10).
    if (saving) return;
    reset();
    onEnd?.();
  }, [saving, reset, onEnd]);
  const finish = useCallback(async () => {
    if (!draw || !done || saving || reading) return;
    const mine = session.current;
    setSaving(true);
    setError(null);
    try {
      await onKeep(draw.gap, done);
      if (mine !== session.current) return;
      reset();
      onEnd?.();
    } catch {
      if (mine !== session.current) return;
      setSaving(false);
      setError('Couldn’t save that. Try again.');
    }
  }, [draw, done, saving, reading, onKeep, reset, onEnd]);

  return { gap: draw?.gap ?? null, line, done, points: draw?.points.length ?? 0, unread, reading: reading > 0, saving, error, start, tap, undo, cancel, finish };
}
