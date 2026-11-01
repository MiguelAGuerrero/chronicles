import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { LANDING_RULES, type AreaAnalysis } from './analyze';

/** Bumped by hand when the analysis or the main-street list changes, as SNAP_RULES is (audit). */
/** l3: areas analyzed from streets with collapsed junctions (the fog streaks, Nov 1) are stale. */
export const LANDING_CODE = 'l3';
/** Changes whenever the rules or the code do, so remembered areas show as stale until analyzed again (L11). */
export const LANDING_VERSION = `${LANDING_CODE}:${JSON.stringify(LANDING_RULES)}`;

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

/** An area centred this close to a remembered one mostly overlaps it: analyzing it replaces that row (L12, audit). */
export const SAME_AREA_M = 1000;
export function keyFor(rows: LandingRow[], centre: LngLat): string {
  let best: LandingRow | null = null;
  let bestD = SAME_AREA_M;
  for (const r of rows) {
    const d = distanceM(r.centre, centre);
    if (d <= bestD) [best, bestD] = [r, d];
  }
  return best?.key ?? landingKey(centre);
}

/** Stale rows still show (offline too), dimmed; the next long press there analyzes again, never silently (L11). */
export const isStale = (r: LandingRow, build: string) => r.build !== build || r.rules !== LANDING_VERSION;
export const staleNote = (r: LandingRow, build: string) => (isStale(r, build) ? 'Analyzed before an update: press and hold to look again.' : null);

export interface LandingView {
  pockets: { hull: LngLat[]; name: string; stale: boolean }[];
  strips: { lines: LngLat[][]; name: string; at: LngLat; stale: boolean }[];
  /** Names of pockets with no strip of their own (a neighbourhood, "A busy pocket"), at their centre (L9). */
  labels: { name: string; at: LngLat }[];
  pins: { at: LngLat; label: 'Start here'; street: string | null; key: string }[];
}

/** A strip's name keeps at least this far from its area's Start here pin, so the two never stack (audit). */
const LABEL_CLEAR_M = 80;

/** Where a strip's name goes: its busiest point, unless the pin is there; then the line's point furthest along from it. */
function labelAt(lines: LngLat[][], peak: LngLat, pin: LngLat | null): LngLat {
  if (!pin || distanceM(peak, pin) >= LABEL_CLEAR_M) return peak;
  let best = peak;
  let bestD = distanceM(peak, pin);
  for (const line of lines)
    for (let i = 1; i < line.length; i++)
      for (let k = 0; k <= 4; k++) {
        const t = k / 4;
        const p: LngLat = [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
        const d = distanceM(p, pin);
        // The nearest point that is clear of the pin: close to the busy part, not at the far end.
        if (d >= LABEL_CLEAR_M && (bestD < LABEL_CLEAR_M || d < bestD)) [best, bestD] = [p, d];
      }
  return best;
}

/**
 * Areas analyzed before l3 drew their strips from streets whose junctions had
 * collapsed onto one spot (the fog streaks, Nov 1): they are left off the map
 * until a long press analyzes them again.
 */
const FIRST_SOUND_CODE = 3;
export const predatesStreetFix = (r: LandingRow) => Number(/^l(\d+):/.exec(r.rules)?.[1] ?? 0) < FIRST_SOUND_CODE;

/** What the map draws for remembered areas (L9): shapes and names only, never a score or rank; stale ones dimmed. */
export function landingView(rows: LandingRow[], build: string | null): LandingView {
  const v: LandingView = { pockets: [], strips: [], labels: [], pins: [] };
  for (const r of rows) {
    if (predatesStreetFix(r)) continue;
    const stale = build != null && isStale(r, build);
    const pin = r.analysis.landing?.at ?? null;
    for (const p of r.analysis.pockets) {
      v.pockets.push({ hull: p.hull, name: p.name, stale });
      if (!p.strips.length) v.labels.push({ name: p.name, at: p.centre });
    }
    for (const s of r.analysis.strips) v.strips.push({ lines: s.lines, name: s.name, at: labelAt(s.lines, s.peak, pin), stale });
    if (r.analysis.landing) v.pins.push({ at: r.analysis.landing.at, label: 'Start here', street: r.analysis.landing.street, key: r.key });
  }
  return v;
}

/**
 * A current area (this build, these rules) centred within 1 km of a scan
 * covers it: the sweep shows that one rather than reading again, so it never
 * replaces a "What's good here" area or refetches its tiles (audit).
 */
export function sweepCovered(rows: LandingRow[], at: LngLat, build: string): LandingRow | null {
  let best: LandingRow | null = null;
  let bestD = SAME_AREA_M;
  for (const r of rows) {
    if (isStale(r, build)) continue;
    const d = distanceM(r.centre, at);
    if (d <= bestD) [best, bestD] = [r, d];
  }
  return best;
}

/** The walk map draws only areas centred within this of the walker (audit: every area ever seen, as DOM labels). */
export const NEAR_AREA_M = 3000;
export const nearAreas = (rows: LandingRow[], here: LngLat | null): LandingRow[] =>
  here ? rows.filter((r) => distanceM(r.centre, here) <= NEAR_AREA_M) : [];
