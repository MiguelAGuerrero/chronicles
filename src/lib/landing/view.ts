import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { LANDING_RULES, type AreaAnalysis } from './analyze';

/** Changes whenever the rules do, so remembered areas show as stale until analyzed again (L11). */
export const LANDING_VERSION = `l1:${JSON.stringify(LANDING_RULES)}`;

/** A remembered area (L11): a cache, tagged with the tile build and the rules. */
export interface LandingRow {
  key: string;
  centre: LngLat;
  analysis: AreaAnalysis;
  build: string;
  rules: string;
  analyzed_at: number;
}

/** A new area's key, from its centre. */
export const landingKey = ([lon, lat]: LngLat) => `${lon.toFixed(5)},${lat.toFixed(5)}`;

/** An area this close to a remembered one is the same area: analyzing it replaces that row (L12). */
export const SAME_AREA_M = 300;
export function keyFor(rows: LandingRow[], centre: LngLat): string {
  let best: LandingRow | null = null;
  let bestD = SAME_AREA_M;
  for (const r of rows) {
    const d = distanceM(r.centre, centre);
    if (d <= bestD) [best, bestD] = [r, d];
  }
  return best?.key ?? landingKey(centre);
}

/** Stale rows still show (offline too); the next long press there analyzes again, never silently (L11). */
export const isStale = (r: LandingRow, build: string) => r.build !== build || r.rules !== LANDING_VERSION;

export interface LandingView {
  pockets: { hull: LngLat[]; name: string }[];
  strips: { lines: LngLat[][]; name: string; at: LngLat }[];
  pins: { at: LngLat; label: 'Start here'; street: string | null; key: string }[];
}

/** What the map draws for remembered areas (L9): shapes and names only, never a score or rank. */
export function landingView(rows: LandingRow[]): LandingView {
  const v: LandingView = { pockets: [], strips: [], pins: [] };
  for (const r of rows) {
    for (const p of r.analysis.pockets) v.pockets.push({ hull: p.hull, name: p.name });
    for (const s of r.analysis.strips) v.strips.push({ lines: s.lines, name: s.name, at: s.peak });
    if (r.analysis.landing) v.pins.push({ at: r.analysis.landing.at, label: 'Start here', street: r.analysis.landing.street, key: r.key });
  }
  return v;
}
