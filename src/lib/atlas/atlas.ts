import { AREA_REACH_M } from '../areas/rules';
import type { Area, WalkArea } from '../areas/types';
import type { CategoryId, Kind } from '../discovery/types';
import { distanceM, projector } from '../geo';
import type { LngLat } from '../types';

/*
 * Explore atlas (AT1-AT14), the pure part: which areas are near, how much of
 * each kind sits in an area's ring, what is still waiting there, and the
 * same-scale picture of the ring. Nothing here reads storage or the map; the
 * reader (`read.ts`) and the screen call in.
 */

/** Bumped by hand when what a ring read keeps, or how it is judged, changes (AT12). */
export const ATLAS_CODE = 'a1';

export const ATLAS_RULES = {
  /** Every area is measured inside this ring around its point, whatever its level (AT4). */
  ringM: 800,
  /** Neighborhoods are listed within this of you (AT1), towns within the other (AT14). */
  nearNeighborhoodM: 2500,
  nearTownM: 12_000,
  /** At most this many tiles per level. */
  cap: 12,
  /** A new near read once you are this far from the last one, under the same build. */
  renearM: 1000,
  /** A failed read waits this long before it is tried again (AT5). */
  retryMs: 120_000,
  /** Walking pace, and how much longer streets are than a straight line. */
  metresPerMin: 80,
  detour: 1.25,
  /** Areas listed next door on a card. */
  nextDoor: 4,
} as const;

export type AtlasLevel = 'neighborhood' | 'town';
export type Step = 0 | 1 | 2 | 3;
export type Steps = Record<CategoryId, Step>;

/** The kinds in one fixed order on every tile (AT3), so tiles compare at a glance. */
export const ATLAS_ORDER: readonly CategoryId[] = ['history', 'art', 'culture', 'parks', 'viewpoints', 'food', 'shops', 'nightlife'];
export const ATLAS_LABEL: Record<CategoryId, string> = {
  history: 'History', art: 'Art', culture: 'Culture', parks: 'Green', viewpoints: 'Views', food: 'Food', shops: 'Shops', nightlife: 'Nightlife',
};
export const STEP_WORDS = ['none', 'some', 'plenty', 'lots'] as const;

/**
 * Fixed steps per kind (AT4): places inside the ring for one, two and three
 * bars. Each about three times the last, because density spans orders of
 * magnitude; rarer kinds have lower steps. Never relative to the neighbors.
 */
export const STEPS: Record<CategoryId, readonly [number, number, number]> = {
  history: [1, 4, 12],
  art: [1, 4, 12],
  culture: [1, 3, 8],
  parks: [1, 3, 6],
  viewpoints: [1, 2, 5],
  food: [4, 15, 50],
  shops: [4, 15, 50],
  nightlife: [2, 6, 20],
};

/** A place as the atlas counts it. */
export interface AtlasPlace {
  key: string;
  category: CategoryId;
  at: LngLat;
}

/** A place that could be found (a mark's place): never named on the tab (AT7). */
export interface AtlasMark extends AtlasPlace {
  kind?: Kind;
}

/** The same-scale picture of a ring (AT6), in a 200 x 150 frame with the ring's point at its middle. */
export interface Sketch {
  streets: { id: string; pts: number[] }[];
  strips: number[][];
  parks: number[];
}

/** What a full ring read leaves (cache). */
export interface AtlasProfile {
  steps: Steps;
  /** Busy streets, busiest first. */
  strips: string[];
  /** The busiest strip's peak, where Walk to goes (AT8). */
  stripAt: LngLat | null;
  marks: AtlasMark[];
  sketch: Sketch;
}

/** Cache (AT12): one area the atlas listed, and once its ring is read, its profile. */
export interface AtlasArea {
  key: string;
  level: AtlasLevel;
  name: string;
  at: LngLat;
  /** How far from its point you are still in it. */
  reachM: number;
  build: string;
  code: string;
  listed_at: number;
  read_at: number | null;
  failed_at: number | null;
  profile: AtlasProfile | null;
}

export const atlasKey = (a: { level: string; name: string; at: LngLat }) =>
  JSON.stringify([a.level, a.name.normalize('NFC').trim().toLowerCase(), a.at[0].toFixed(3), a.at[1].toFixed(3)]);

/** Whether a row was made under this build and these rules (AT12). */
export const rowCurrent = (r: { build: string; code: string }, build: string | null) => !!build && r.build === build && r.code === ATLAS_CODE;

const SAME_M = { neighborhood: 1000, town: 3000 } as const;
const sameArea = (a: { level: AtlasLevel; name: string; at: LngLat }, b: { level: AtlasLevel; name: string; at: LngLat }) =>
  a.level === b.level && a.name === b.name && distanceM(a.at, b.at) <= SAME_M[a.level];

/** AT4: the bars of each kind from the places inside the ring, against the fixed steps. */
export function presenceSteps(places: AtlasPlace[], centre: LngLat): Steps {
  const seen = new Set<string>();
  const counts = Object.fromEntries(ATLAS_ORDER.map((c) => [c, 0])) as Record<CategoryId, number>;
  for (const p of places) {
    if (seen.has(p.key) || distanceM(p.at, centre) > ATLAS_RULES.ringM) continue;
    seen.add(p.key);
    counts[p.category] += 1;
  }
  return Object.fromEntries(ATLAS_ORDER.map((c) => [c, STEPS[c].filter((s) => counts[c] >= s).length as Step])) as Steps;
}

/** New rows for the candidates no current row already stands for. */
export function newRows(
  existing: AtlasArea[],
  candidates: { level: string; name: string; at: LngLat; reachM: number }[],
  build: string,
  now: number,
): AtlasArea[] {
  const out: AtlasArea[] = [];
  const have = existing.filter((r) => rowCurrent(r, build));
  for (const c of candidates) {
    if (c.level !== 'neighborhood' && c.level !== 'town') continue;
    const a = { level: c.level as AtlasLevel, name: c.name, at: c.at };
    if ([...have, ...out].some((r) => sameArea(r, a))) continue;
    out.push({ key: atlasKey(a), ...a, reachM: c.reachM, build, code: ATLAS_CODE, listed_at: now, read_at: null, failed_at: null, profile: null });
  }
  return out;
}

export interface Listed {
  area: AtlasArea;
  distanceM: number;
  /** You are in it (AT1): the nearest area of its level, within its reach. */
  here: boolean;
}

/** AT1, AT14: the current areas of a level near you, nearest first, the one you are in leading. */
export function nearList(rows: AtlasArea[], from: LngLat, level: AtlasLevel, build: string | null): Listed[] {
  const within = level === 'neighborhood' ? ATLAS_RULES.nearNeighborhoodM : ATLAS_RULES.nearTownM;
  const list: Listed[] = [];
  for (const area of rows) {
    if (area.level !== level || !rowCurrent(area, build)) continue;
    const d = distanceM(area.at, from);
    if (d > within || list.some((l) => sameArea(l.area, area))) continue;
    list.push({ area, distanceM: d, here: false });
  }
  list.sort((a, b) => a.distanceM - b.distanceM);
  const out = list.slice(0, ATLAS_RULES.cap);
  if (out[0] && out[0].distanceM <= Math.min(out[0].area.reachM, level === 'neighborhood' ? AREA_REACH_M.neighborhood : AREA_REACH_M.city)) out[0].here = true;
  return out;
}

/** AT5: the next ring to read, nearest first, skipping one that failed less than the retry wait ago. */
export function readQueue(list: Listed[], now: number): AtlasArea | null {
  for (const l of list) {
    const a = l.area;
    if (a.profile) continue;
    if (a.failed_at != null && now - a.failed_at < ATLAS_RULES.retryMs) continue;
    return a;
  }
  return null;
}

/** Where the last near read of a level happened. */
export interface NearRead {
  at: LngLat;
  build: string;
  code: string;
}

/** Whether to list the areas around you again (AT1, AT12): never read here, under this build and these rules. */
export function needsNear(last: NearRead | null, from: LngLat, build: string): boolean {
  return !last || last.build !== build || last.code !== ATLAS_CODE || distanceM(last.at, from) > ATLAS_RULES.renearM;
}

/** AT3: how far, as a walking time, or a distance once it is over an hour. */
export function distanceWords(m: number, here: boolean, fmt: (m: number) => string): string {
  if (here) return 'You’re here';
  const min = Math.max(1, Math.round((m * ATLAS_RULES.detour) / ATLAS_RULES.metresPerMin));
  return min < 60 ? `${min} min walk` : `${fmt(m)} away`;
}

/** The walks that went through an area, and when last. */
export interface Familiarity {
  walks: number;
  last: number | null;
}

/** AT3: how many walks went through the area, from the home's placed walks (the same area: level, name, within reach). */
export function familiarity(area: { level: AtlasLevel; name: string; at: LngLat }, areas: Area[], walkAreas: WalkArea[]): Familiarity {
  const keys = new Set(areas.filter((a) => a.level === area.level && a.name === area.name && distanceM([a.lon, a.lat], area.at) <= SAME_M[area.level]).map((a) => a.key));
  const walks = new Map<string, number>();
  for (const w of walkAreas) if (keys.has(w.area_key)) walks.set(w.walk_id, Math.max(walks.get(w.walk_id) ?? 0, w.last_t));
  return { walks: walks.size, last: walks.size ? Math.max(...walks.values()) : null };
}

/** "New to you", "Walked once", "Walked 3 times": the only progress there is. */
export function familiarityWords(f: Familiarity): string {
  if (!f.walks) return 'New to you';
  return f.walks === 1 ? 'Walked once' : `Walked ${f.walks} times`;
}

/** AT7, AT10: the kinds still waiting in the ring, in the tiles' order, never their names; kinds switched off are left out. */
export function waitingKinds(marks: AtlasMark[], found: Set<string>, hidden: Set<Kind> = new Set()): CategoryId[] {
  const kinds = new Set<CategoryId>();
  for (const m of marks) if (!found.has(m.key) && !(m.kind && hidden.has(m.kind))) kinds.add(m.category);
  return ATLAS_ORDER.filter((c) => kinds.has(c));
}

/** The finds inside an area's ring, by name, once each. */
export function findsIn<T extends { key: string; name: string; at: LngLat; category: CategoryId }>(finds: T[], centre: LngLat): T[] {
  const seen = new Set<string>();
  return finds.filter((f) => distanceM(f.at, centre) <= ATLAS_RULES.ringM && !seen.has(f.key) && !!seen.add(f.key));
}

/** The sketch frame: 200 x 150, the ring's point at the middle, the ring this many units across its radius (AT6). */
export const SKETCH = { w: 200, h: 150, ringR: 64 } as const;

/** Lon/lat to the sketch frame of an area (AT6): the same scale for every area. */
export function toSketch(centre: LngLat): (p: LngLat) => [number, number] {
  const xy = projector(centre);
  const k = SKETCH.ringR / ATLAS_RULES.ringM;
  return (p) => {
    const [x, y] = xy(p);
    return [Math.round(SKETCH.w / 2 + x * k), Math.round(SKETCH.h / 2 - y * k)];
  };
}

const inFrame = (x: number, y: number, pad = 10) => x >= -pad && x <= SKETCH.w + pad && y >= -pad && y <= SKETCH.h + pad;

function flat(line: LngLat[], to: (p: LngLat) => [number, number]): number[] | null {
  const pts: number[] = [];
  let any = false;
  for (const p of line) {
    const [x, y] = to(p);
    if (pts.length && pts[pts.length - 2] === x && pts[pts.length - 1] === y) continue;
    pts.push(x, y);
    if (inFrame(x, y)) any = true;
  }
  return any && pts.length >= 4 ? pts : null;
}

/** At most this many street lines in a sketch, so a dense downtown stays small. */
const SKETCH_LINES = 900;

/** AT6: the ring's picture from what one read found: streets with their ids (to show the walked ones), busy streets, parks. */
export function sketchOf(o: { centre: LngLat; segments: { id: string; geometry: LngLat[][] }[]; strips: LngLat[][][]; parks: LngLat[] }): Sketch {
  const to = toSketch(o.centre);
  const streets: Sketch['streets'] = [];
  for (const s of o.segments) {
    for (const line of s.geometry) {
      const pts = flat(line, to);
      if (pts && streets.length < SKETCH_LINES) streets.push({ id: s.id, pts });
    }
  }
  const strips = o.strips.flatMap((lines) => lines.map((l) => flat(l, to)).filter((p): p is number[] => !!p));
  const parks = o.parks.flatMap((p) => {
    const [x, y] = to(p);
    return inFrame(x, y, 0) ? [x, y] : [];
  });
  return { streets, strips, parks };
}

const path = (pts: number[]) => {
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
  return d;
};

/** SVG paths for a sketch: the streets, the ones you walked (AT6), the busy ones. */
export function sketchPaths(s: Sketch, walked: Set<string>): { streets: string; walked: string; strips: string } {
  let streets = '';
  let mine = '';
  for (const l of s.streets) {
    if (walked.has(l.id)) mine += path(l.pts);
    else streets += path(l.pts);
  }
  return { streets, walked: mine, strips: s.strips.map(path).join('') };
}

/** AT8: the other areas of its level nearest to this one, with the distance from it. */
export function nextDoor(area: AtlasArea, rows: AtlasArea[], build: string | null): { area: AtlasArea; distanceM: number }[] {
  return rows
    .filter((r) => r.level === area.level && rowCurrent(r, build) && !sameArea(r, area))
    .map((r) => ({ area: r, distanceM: distanceM(r.at, area.at) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .filter((r, i, all) => all.findIndex((o) => sameArea(o.area, r.area)) === i)
    .slice(0, ATLAS_RULES.nextDoor);
}

/** AT8: Walk to the busiest street, else the area's own point. */
export function walkTarget(area: AtlasArea): { at: LngLat; label: string } {
  const p = area.profile;
  return p?.stripAt && p.strips[0] ? { at: p.stripAt, label: p.strips[0] } : { at: area.at, label: area.name };
}

/** AT13: one sentence a screen reader says for a tile; how far and the walked count are its only numbers (AT11). */
export function tileLabel(l: Listed, fam: Familiarity, fmt: (m: number) => string): string {
  const a = l.area;
  const head = `${a.name}. ${distanceWords(l.distanceM, l.here, fmt)}. ${familiarityWords(fam)}.`;
  if (!a.profile) return `${head} Being read.`;
  const kinds = ATLAS_ORDER.filter((c) => a.profile!.steps[c]).map((c) => `${ATLAS_LABEL[c]}: ${STEP_WORDS[a.profile!.steps[c]]}`);
  return [head, kinds.length ? `${kinds.join(', ')}.` : 'Quiet: little of any kind.', a.profile.strips[0] ? `Busy along ${a.profile.strips[0]}.` : '']
    .filter(Boolean).join(' ');
}

/** AT6, AT7: one "?" per kind waiting in the ring, at its place nearest the area's point; never named. */
export function waitingMarks(marks: AtlasMark[], found: Set<string>, centre: LngLat, hidden: Set<Kind> = new Set()): AtlasMark[] {
  const best = new Map<CategoryId, { m: AtlasMark; d: number }>();
  for (const m of marks) {
    if (found.has(m.key) || (m.kind && hidden.has(m.kind))) continue;
    const d = distanceM(m.at, centre);
    const b = best.get(m.category);
    if (!b || d < b.d) best.set(m.category, { m, d });
  }
  return ATLAS_ORDER.filter((c) => best.has(c)).map((c) => best.get(c)!.m);
}
