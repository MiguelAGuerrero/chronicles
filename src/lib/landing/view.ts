// @layer core
import { PRESENCE_CODE } from '../presence/presence';
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { LANDING_RULES, type AreaAnalysis } from './analyze';

/**
 * Bumped by hand when the analysis or the main-street list changes, as SNAP_RULES is (audit).
 * l3: areas analyzed from streets with collapsed junctions (the fog streaks, Nov 1) are stale.
 * l4: activity density (AD1-AD16): graded streets from every kind of place, OSM and Overture.
 */
export const LANDING_CODE = 'l4';
/** Changes whenever the rules or the code do, so remembered areas show as stale until analyzed again (L11). */
/** What a landing row was derived under: its rules and presence's classes (PR6), so a reclassification re-derives it. */
export const LANDING_VERSION = `${LANDING_CODE}:${PRESENCE_CODE}:${JSON.stringify(LANDING_RULES)}`;
/**
 * Versions whose rows stand under the current one (presence audit 1): presence p1 moved density's table and changed no
 * weight, so a row from just before it reads the same. Empty it when a weight or a landing rule changes.
 */
const LANDING_CARRIED: readonly string[] = [`${LANDING_CODE}:${JSON.stringify(LANDING_RULES)}`];
/** Whether a row's rules are the current ones, or carried by them. */
export const rulesCurrent = (rules: string): boolean => rules === LANDING_VERSION || LANDING_CARRIED.includes(rules);

/** A remembered area (L11): a cache, tagged with the tile build and the rules. */
export interface LandingRow {
  key: string;
  centre: LngLat;
  analysis: AreaAnalysis;
  build: string;
  rules: string;
  analyzed_at: number;
  /** The Overture release its places came from; null when measured from OpenStreetMap alone (AD6, AD7). Missing before l4. */
  overture?: string | null;
}

/**
 * Whether a new reading replaces the area remembered here (activity-density audit 6): a read without Overture
 * never replaces one measured with it, even an older release's, which stays (dimmed) until Overture answers.
 */
export const replacesRow = (existing: LandingRow | undefined, overture: string | null) => !existing || overture != null || existing.overture == null;

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

/**
 * Stale rows still show (offline too), dimmed; the next long press there analyzes again, never silently (L11).
 * With an Overture release known, a row measured with another release, or without Overture, is stale too (AD6, AD7).
 */
export const isStale = (r: LandingRow, build: string, release: string | null = null) =>
  r.build !== build || !rulesCurrent(r.rules) || (release != null && (r.overture ?? null) !== release);
export const staleNote = (r: LandingRow, build: string, release: string | null = null) =>
  isStale(r, build, release) ? 'Analyzed before an update: press and hold to look again.' : null;

export interface LandingView {
  pockets: { hull: LngLat[]; name: string; stale: boolean }[];
  strips: { lines: LngLat[][]; name: string; at: LngLat; stale: boolean }[];
  /** Graded stretches to draw (AD12): every grade, named or not by a busy street. */
  graded: { lines: LngLat[][]; grade: 1 | 2 | 3; stale: boolean }[];
  /** Names of pockets with no strip of their own (a neighbourhood, "A busy pocket"), at their centre (L9). */
  labels: { name: string; at: LngLat }[];
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

/**
 * What the map draws for remembered areas (L9): shapes and names only, never
 * a score or rank; stale ones dimmed. Information only: no Start here pin
 * (retired by explore), though a strip's name still keeps clear of where the
 * pin was, its busiest point.
 */
export function landingView(rows: LandingRow[], build: string | null, release: string | null = null): LandingView {
  const v: LandingView = { pockets: [], strips: [], graded: [], labels: [] };
  const drawn: Drawn[] = [];
  for (const [i, r] of rows.entries()) {
    if (predatesStreetFix(r)) continue;
    const stale = build != null && isStale(r, build, release);
    // Areas analyzed before grades draw their busy streets as medium, until analyzed again.
    if (r.analysis.graded) for (const g of r.analysis.graded) v.graded.push({ lines: g.lines, grade: g.grade, stale });
    else for (const s of r.analysis.strips) v.graded.push({ lines: s.lines, grade: 2, stale });
    const pin = r.analysis.landing?.at ?? null;
    for (const p of r.analysis.pockets) {
      v.pockets.push({ hull: p.hull, name: p.name, stale });
      if (!p.strips.length) place(v.labels, drawn, { name: p.name, at: p.centre }, i, stale);
    }
    for (const s of r.analysis.strips) {
      place(v.strips, drawn, { lines: s.lines, name: s.name, at: labelAt(s.lines, s.peak, pin), stale }, i, stale);
    }
  }
  return v;
}

/** Two remembered areas may cover the same street; its name is drawn once, not once per area (fix street-label-double). */
const SAME_LABEL_M = 300;
interface Named { name: string; at: LngLat }
interface Drawn extends Named { row: number; stale: boolean; list: Named[]; item: Named }

/** Adds a label unless another row already names it nearby (strip or pocket); a current row's label replaces a stale row's. */
function place<T extends Named>(list: T[], drawn: Drawn[], item: T, row: number, stale: boolean) {
  const dup = drawn.find((d) => d.row !== row && d.name === item.name && distanceM(d.at, item.at) < SAME_LABEL_M);
  if (dup) {
    if (!dup.stale || stale) return;
    dup.list.splice(dup.list.indexOf(dup.item), 1);
    drawn.splice(drawn.indexOf(dup), 1);
  }
  list.push(item);
  drawn.push({ name: item.name, at: item.at, row, stale, list, item });
}

/**
 * A current area (this build, these rules) centred within 1 km of a scan
 * covers it: the sweep shows that one rather than reading again, so it never
 * replaces a "What's good here" area or refetches its tiles (audit).
 */
export function sweepCovered(rows: LandingRow[], at: LngLat, build: string, release: string | null = null): LandingRow | null {
  let best: LandingRow | null = null;
  let bestD = SAME_AREA_M;
  for (const r of rows) {
    if (isStale(r, build, release)) continue;
    const d = distanceM(r.centre, at);
    if (d <= bestD) [best, bestD] = [r, d];
  }
  return best;
}

/** The walk map draws only areas centred within this of the walker (audit: every area ever seen, as DOM labels). */
export const NEAR_AREA_M = 3000;
export const nearAreas = (rows: LandingRow[], here: LngLat | null): LandingRow[] =>
  here ? rows.filter((r) => distanceM(r.centre, here) <= NEAR_AREA_M) : [];
