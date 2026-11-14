// @layer core
import type { LngLat } from '../types';
import { openAt, parseHours } from './hours';
import { litOf } from './overpass';
import type { DarkPlace, DarkWay } from './types';

/*
 * What the After dark layer draws (DK3, DK4, DK15): the ways tagged lit, each its own line of one width, and the places whose
 * hours say they are open at the reading's time, as bare points. Nothing is drawn as dark, and no place's name, kind or count
 * goes to the map. A way or place in two tiles is drawn once. Pure.
 */

export interface DarkDraw {
  lit: LngLat[][];
  open: LngLat[];
  /** Changes only when the picture does, so a map sends its data again only then (DK15). */
  key: string;
}

/** The weekday (0 Sunday) and minute of the local day the hours are judged at; null for no marks. */
export interface When {
  weekday: number;
  minute: number;
}

const hash = (ids: readonly string[]) => {
  let h = 0;
  for (const id of ids) for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1_000_000_007;
  return h;
};

export function darkDraw(tiles: readonly { ways: readonly DarkWay[]; places: readonly DarkPlace[] }[], when: When | null): DarkDraw {
  const lit = new Map<string, LngLat[]>();
  const open = new Map<string, LngLat>();
  for (const t of tiles) {
    for (const w of t.ways) if (!lit.has(w.id) && litOf(w.lit) === 'lit') lit.set(w.id, w.line);
    if (!when) continue;
    for (const p of t.places) if (!open.has(p.id) && openAt(parseHours(p.hours), when.weekday, when.minute) === 'open') open.set(p.id, p.at);
  }
  const litIds = [...lit.keys()].sort();
  const openIds = [...open.keys()].sort();
  return {
    lit: litIds.map((id) => lit.get(id) as LngLat[]),
    open: openIds.map((id) => open.get(id) as LngLat),
    key: `${litIds.length}:${hash(litIds)}|${openIds.length}:${hash(openIds)}`,
  };
}

/** Within this much solar time of where you are, a place keeps your clock (steward S8). */
const NEAR_YOU_MIN = 45;
/** With no position, the device's offset may be this far from the map's solar time: daylight saving and a wide zone. */
const NEAR_OFFSET_MIN = 150;

/**
 * DK4, steward S8: whether hours can be read on the device's clock at the map's centre. By your position when there is one (a
 * centre more than 45 minutes of solar time from you is likely another zone); else by the device's UTC offset in minutes. No
 * timezone lookup: a far town's marks are left out rather than drawn wrong.
 */
export function hoursReadHere(centre: LngLat, you: LngLat | null, deviceOffsetMin: number): boolean {
  if (you) return Math.abs(centre[0] - you[0]) * 4 <= NEAR_YOU_MIN;
  return Math.abs(centre[0] * 4 - deviceOffsetMin) <= NEAR_OFFSET_MIN;
}
