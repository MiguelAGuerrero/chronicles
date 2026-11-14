// @layer view
import { useEffect, useMemo, useState } from 'react';
import type { LngLat } from '../types';
import { drawNow, tilesAround, type WalkStatus } from '../walk/layer';
import { darkApp } from './darkApp';
import { darkDraw, hoursReadHere, type DarkDraw, type When } from './draw';
import { readingAt } from './sun';
import type { DarkTile } from './types';

/** How far around the centre the layer reads, as walkability does. */
export const DARK_RADIUS_M = 1500;
/** The reading's time is looked at again this often, so a place closing is noticed (DK15). */
const TICK_MS = 60_000;

export interface AfterDark {
  status: WalkStatus;
  /** What the map draws; null when off, still reading or nothing could be read. */
  draw: DarkDraw | null;
  /** The panel's words while drawn (DK5): "Open now", "Open after sunset", "No dark tonight", "Hours read only near you". */
  words: string | null;
}

const localWhen = (t: number): When => {
  const d = new Date(t);
  return { weekday: d.getDay(), minute: d.getHours() * 60 + d.getMinutes() };
};

/**
 * The After dark layer for a map centred on `centre` (DK1-DK5, DK13-DK15): read only while `on`. The tiles around it are read from
 * the device where kept, else from Overpass under the app's one gate; the lit ways are drawn, and the places open at the reading's
 * time: now after dark, an hour after tonight's sunset by day. `you`, where known, tells whether the map is near enough to read
 * hours on this phone's clock (steward S8). The clock is read here, in the view; the decisions are core.
 */
export function useAfterDark(centre: LngLat | null, on: boolean, you: LngLat | null): AfterDark {
  const tilesKey = centre ? tilesAround(centre, DARK_RADIUS_M).map((t) => t.join('/')).join(',') : '';
  const [result, setResult] = useState<{ key: string; draw: DarkTile[] | null } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on || !tilesKey) return;
    let live = true;
    void (async () => {
      const tiles = tilesKey.split(',').map((t) => t.split('/').map(Number) as [number, number]);
      const read = await darkApp.reader.read(tiles, () => !live);
      if (!live) return;
      setResult({ key: tilesKey, draw: read.tiles.length || !read.failed ? read.tiles : null });
      setNow(Date.now());
    })();
    return () => {
      live = false;
    };
  }, [on, tilesKey]);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [on]);
  const { draw: tiles, status } = drawNow(on, result, tilesKey);
  const reading = centre ? readingAt(centre, now) : null;
  const near = centre ? hoursReadHere(centre, you, -new Date(now).getTimezoneOffset()) : false;
  const when = reading && reading.at !== null && near ? localWhen(reading.at) : null;
  const whenKey = when ? `${when.weekday}:${when.minute}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draw = useMemo(() => (tiles ? darkDraw(tiles, when) : null), [tiles, whenKey]);
  const words = !reading ? null : reading.at !== null && !near ? 'Hours read only near you' : reading.words;
  return { status, draw, words };
}
