import type { AreaLevel, PlaceCandidate } from '../areas/types';
import { CATEGORIES, categoryOf } from '../discovery/categories';
import { isMarkable } from '../discovery/noise';
import { isOffered } from '../discovery/places';
import type { CategoryId, Kind, Place } from '../discovery/types';
import { distanceM, nearPoints, projector } from '../geo';
import type { LngLat } from '../types';

export type { Kind } from '../discovery/types';

/*
 * Explore (v1 slice 5), the pure part: every area walked gets a checklist of
 * its attractions, and a "?" shows only for those within your range. Nothing
 * here reads storage or the map; the runtime (`exploreRun.ts`) and the
 * screens call in.
 */

/** Meta: the walk that is exploring (E1). Any other walk is quiet (E9): no layers, no reminders. */
export const EXPLORE_KEY = 'explore_walk';
/** Meta, per walk: it explored at some point, so its replay counts what it passed (E11). */
export const exploredKey = (walkId: string) => `explored:${walkId}`;

export const EXPLORE_RULES = {
  /** One read covers this much around its centre (E2), with the tile decoder. */
  readM: 1500,
  /** A fix this far from every read of the current build is read again (E5). */
  rereadM: 1000,
  /** The "?" range setting (E20). */
  rangeDefault: 100,
  rangeMin: 60,
  rangeMax: 300,
  rangeStep: 20,
  /** At most this many "?" near you (E6), and along a route (E23). */
  cap: 8,
  routeCap: 20,
  /** A "?" is named within this of an accepted fix, and a capture this close finds it (E7, E8). */
  revealM: 60,
  /** A failed read waits this long and this far before trying again (E5). */
  retryMs: 120_000,
  retryM: 100,
} as const;

export interface KindInfo {
  id: Kind;
  label: string;
  /** Ionicons name. */
  icon: string;
}

/** The "What I'm into" switches, in their order (E16). */
export const KINDS: readonly KindInfo[] = [
  { id: 'public_art', label: 'Public art', icon: 'color-palette-outline' },
  { id: 'museums', label: 'Museums and galleries', icon: 'images-outline' },
  { id: 'theatres', label: 'Theatres', icon: 'ticket-outline' },
  { id: 'monuments', label: 'Monuments and ruins', icon: 'flag-outline' },
  { id: 'churches', label: 'Historic churches', icon: 'business-outline' },
  { id: 'cemeteries', label: 'Cemeteries', icon: 'rose-outline' },
  { id: 'parks', label: 'Parks and gardens', icon: 'leaf-outline' },
  { id: 'viewpoints', label: 'Viewpoints and attractions', icon: 'eye-outline' },
];

export const kindOf = (id: Kind): KindInfo => KINDS.find((k) => k.id === id) ?? KINDS[0];

/** The checklist an area keeps: kept, never purged; rebuilt when its build is old (E4, E13). */
export interface ChecklistArea {
  key: string;
  level: Extract<AreaLevel, 'neighborhood' | 'town'>;
  name: string;
  /** The area's own map point: the home's Area rows carry the same one. */
  at: LngLat;
  build: string;
  built_at: number;
  count: number;
}

/** One attraction on a checklist: a snapshot of the place, so a cache purge leaves it whole (E13). */
export interface ChecklistItem {
  key: string;
  /** Null for a place no area reaches (E3): shown as you pass, never counted. */
  area_key: string | null;
  name: string;
  category: CategoryId;
  kind: Kind;
  at: LngLat;
  generic: boolean;
}

/** A capture that found a place (E8): kept. */
export interface Find {
  key: string;
  area_key: string | null;
  walk_id: string | null;
  capture_id: string;
  found_at: number;
  name: string;
  category: CategoryId;
  kind: Kind;
  at: LngLat;
  generic: boolean;
}

/** Where a read happened, under which build (derived: a build change clears it, so areas are read again). */
export interface ExploreRead {
  key: string;
  centre: LngLat;
  build: string;
  read_at: number;
  candidates: PlaceCandidate[];
}

export type AreaRef = { level: ChecklistArea['level']; name: string; at: LngLat };

/** How far around its point an area's checklist reaches: its own reach, at most one read (E3, audit 2). */
const coverM = (c: { reachM: number }) => Math.min(c.reachM, EXPLORE_RULES.readM);

/** The same area seen twice: one level and name, points within 1 km (audit 5: a town's point moves with the zoom it came from). */
export const SAME_AREA_M = 1000;
export const sameArea = (a: { level: string; name: string; at: LngLat }, b: { level: string; name: string; at: LngLat }) =>
  a.level === b.level && a.name === b.name && distanceM(a.at, b.at) <= SAME_AREA_M;

/** Candidates with each area once, the first seen standing for the rest. */
export function uniqueAreas(cs: PlaceCandidate[]): PlaceCandidate[] {
  const out: PlaceCandidate[] = [];
  for (const c of cs) if (!out.some((o) => sameArea(o, c))) out.push(c);
  return out;
}

/** The key of an area's checklist: level, name and its point to 4 decimals, as the home's Area rows have them. */
export const checklistKey = (a: AreaRef): string => JSON.stringify([a.level, a.name, a.at[0].toFixed(4), a.at[1].toFixed(4)]);

/**
 * The area a point belongs to (E3): the nearest neighborhood within its
 * reach; else the town or city within reach, the closer for its size; else none.
 */
export function areaFor(at: LngLat, candidates: PlaceCandidate[]): AreaRef | null {
  let hood: PlaceCandidate | null = null;
  let hoodD = Infinity;
  let town: PlaceCandidate | null = null;
  let townScore = Infinity;
  for (const c of candidates) {
    const d = distanceM(at, c.at);
    // Only as far as a checklist can see (audit 2): a city's 10 km outskirts are orphans, not lost.
    if (d > coverM(c)) continue;
    if (c.level === 'neighborhood' && d < hoodD) [hood, hoodD] = [c, d];
    else if (c.level === 'town' && d / c.reachM < townScore) [town, townScore] = [c, d / c.reachM];
  }
  const c = hood ?? town;
  return c ? { level: c.level as AreaRef['level'], name: c.name, at: c.at } : null;
}


/** Whether a read around `centre` saw all of the area, so its checklist is whole. */
const covers = (centre: LngLat, c: PlaceCandidate) => distanceM(centre, c.at) + coverM(c) <= EXPLORE_RULES.readM + 1;

/**
 * One read's checklists (E2, E3): each attraction (markable, with a kind)
 * goes to its area; only areas the read saw whole are built, with 0 when they
 * hold nothing, so they aren't read again. Places no area reaches are kept as
 * orphans (area null), shown but never counted. Areas already built for this
 * build are never rebuilt or stolen from (audit 3): `built` holds them, and
 * `known` the candidates earlier reads found, so a place keeps its area even
 * when this read can't see that area's point.
 */
export function buildChecklists(o: {
  places: Place[];
  candidates: PlaceCandidate[];
  centre: LngLat;
  build: string;
  now: number;
  built?: Pick<ChecklistArea, 'level' | 'name' | 'at'>[];
  known?: PlaceCandidate[];
}): { areas: ChecklistArea[]; items: ChecklistItem[] } {
  const built = o.built ?? [];
  const all = uniqueAreas([...o.candidates, ...(o.known ?? [])]);
  const areas = new Map<string, ChecklistArea>();
  for (const c of uniqueAreas(o.candidates)) {
    if ((c.level !== 'neighborhood' && c.level !== 'town') || !covers(o.centre, c)) continue;
    if (built.some((b) => sameArea(b, c))) continue;
    const ref: AreaRef = { level: c.level, name: c.name, at: c.at };
    areas.set(checklistKey(ref), { key: checklistKey(ref), ...ref, build: o.build, built_at: o.now, count: 0 });
  }
  const items: ChecklistItem[] = [];
  for (const p of o.places) {
    if (!p.kind || !isMarkable(p)) continue;
    // A place keyed twice (it straddles a rounding line) is one place.
    if (isOffered(p, items)) continue;
    const ref = areaFor(p.at, all);
    let key: string | null = null;
    if (ref) {
      const mine = [...areas.values()].find((x) => sameArea(x, ref));
      // Its area is built already (it holds it), or not seen whole here (its own read builds it).
      if (!mine) continue;
      key = mine.key;
    } else if (distanceM(p.at, o.centre) > EXPLORE_RULES.readM) continue;
    items.push({ key: p.key, area_key: key, name: p.name, category: p.category, kind: p.kind, at: p.at, generic: p.generic });
    if (key) areas.get(key)!.count++;
  }
  return { areas: [...areas.values()], items };
}

/**
 * Where to read next, or null (E2, E4, E5): around the fix's area point when
 * that area has no checklist of this build; around the fix itself when no
 * read of this build is within 1 km of it.
 */
export function readCentre(o: {
  fix: LngLat;
  candidates: PlaceCandidate[];
  areas: Pick<ChecklistArea, 'level' | 'name' | 'at' | 'build'>[];
  reads: Pick<ExploreRead, 'centre' | 'build'>[];
  build: string;
}): LngLat | null {
  const near = o.reads.some((r) => r.build === o.build && distanceM(r.centre, o.fix) <= EXPLORE_RULES.rereadM);
  if (!near) return o.fix;
  const ref = areaFor(o.fix, uniqueAreas(o.candidates));
  if (!ref) return null;
  return o.areas.some((a) => a.build === o.build && sameArea(a, ref)) ? null : ref.at;
}

/** After a failed read, the next waits 2 min and 100 m walked (E5). */
export function retryAllowed(fail: { at: LngLat; t: number } | null, fix: LngLat, now: number): boolean {
  if (!fail) return true;
  return now - fail.t >= EXPLORE_RULES.retryMs && distanceM(fail.at, fix) >= EXPLORE_RULES.retryM;
}

/** Points every 500 m along a route, each checked with `readCentre`, so each area on the way is read once (E23). */
export function routeProbes(route: LngLat[], stepM = EXPLORE_RULES.readM / 3): LngLat[] {
  if (!route.length) return [];
  const out: LngLat[] = [route[0]];
  let carried = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const len = distanceM(a, b);
    let along = stepM - carried;
    while (along <= len) {
      const f = along / len;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      along += stepM;
    }
    carried = len - (along - stepM);
  }
  // The destination too: its own area matters most.
  const end = route[route.length - 1];
  if (distanceM(out[out.length - 1], end) > stepM / 5) out.push(end);
  return out;
}

/** The range setting, clamped to 60-300 m in 20 m steps (E20). */
export function clampRange(m: number): number {
  const r = EXPLORE_RULES;
  if (!Number.isFinite(m)) return r.rangeDefault;
  const stepped = r.rangeMin + Math.round((m - r.rangeMin) / r.rangeStep) * r.rangeStep;
  return Math.max(r.rangeMin, Math.min(r.rangeMax, stepped));
}

export type MarkState = 'unknown' | 'named' | 'found';
export interface ShownMark {
  item: ChecklistItem;
  state: MarkState;
}

/**
 * The marks to draw on an exploring walk (E6-E8, E17): found places at any
 * distance; unfound ones of shown kinds within range, nearest first, at most
 * 8, named within 60 m or once revealed on this walk.
 */
export function visibleMarks(o: {
  items: ChecklistItem[];
  here: LngLat | null;
  rangeM: number;
  found: Set<string>;
  hidden: Set<Kind>;
  revealed: Set<string>;
}): ShownMark[] {
  const out: ShownMark[] = [];
  const near: { item: ChecklistItem; d: number }[] = [];
  for (const item of o.items) {
    if (o.found.has(item.key)) {
      out.push({ item, state: 'found' });
      continue;
    }
    if (!o.here || o.hidden.has(item.kind)) continue;
    const d = distanceM(o.here, item.at);
    if (d <= o.rangeM) near.push({ item, d });
  }
  near.sort((a, b) => a.d - b.d);
  for (const { item, d } of near.slice(0, EXPLORE_RULES.cap)) {
    out.push({ item, state: d <= EXPLORE_RULES.revealM || o.revealed.has(item.key) ? 'named' : 'unknown' });
  }
  return out;
}

/** The unfound place a capture at `at` finds: the nearest within 60 m, whatever its kind (E8, E18). */
export function findFor(at: LngLat, items: ChecklistItem[], found: Set<string>): ChecklistItem | null {
  let best: ChecklistItem | null = null;
  let bestD = Infinity;
  for (const x of items) {
    if (found.has(x.key)) continue;
    const d = distanceM(at, x.at);
    if (d <= EXPLORE_RULES.revealM && d < bestD) [best, bestD] = [x, d];
  }
  return best;
}

/** The places an accepted fix came within 60 m of: named, never found, by walking past (E7). */
export function revealedKeys(items: ChecklistItem[], fixes: LngLat[]): Set<string> {
  const near = nearPoints(fixes, EXPLORE_RULES.revealM);
  return new Set(items.filter((x) => near(x.at)).map((x) => x.key));
}

/**
 * Faint marks on the way (E22, E23): unfound places of shown kinds within
 * range of the route ahead, in the order the route reaches them, at most 20,
 * leaving out the ones already shown near you.
 */
export function routeMarks(o: {
  items: ChecklistItem[];
  route: LngLat[];
  rangeM: number;
  exclude: Set<string>;
  found: Set<string>;
  hidden: Set<Kind>;
}): ChecklistItem[] {
  if (o.route.length < 2) return [];
  const proj = projector(o.route[0]);
  const pts = o.route.map(proj);
  const starts: number[] = [0];
  for (let i = 1; i < pts.length; i++) starts.push(starts[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const hits: { item: ChecklistItem; along: number }[] = [];
  for (const item of o.items) {
    if (o.exclude.has(item.key) || o.found.has(item.key) || o.hidden.has(item.kind)) continue;
    const p = proj(item.at);
    let best = Infinity;
    let along = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const dx = pts[i][0] - ax;
      const dy = pts[i][1] - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2));
      const d = Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy));
      if (d < best) [best, along] = [d, starts[i - 1] + t * Math.sqrt(len2)];
    }
    if (best <= o.rangeM) hits.push({ item, along });
  }
  return hits.sort((a, b) => a.along - b.along).slice(0, EXPLORE_RULES.routeCap).map((h) => h.item);
}

/** The places that just came into range as a "?", each alerting once a walk (E19). */
export const alertsDue = (unknownKeys: string[], alerted: Set<string>): string[] => unknownKeys.filter((k) => !alerted.has(k));

export interface HomeCount {
  found: number;
  total: number;
  builtAt: number;
}

/** An area's count for the place view (E10); null for an empty checklist, which the home leaves out. */
export const homeCount = (a: Pick<ChecklistArea, 'count' | 'built_at'>, found: number): HomeCount | null =>
  a.count > 0 ? { found: Math.min(found, a.count), total: a.count, builtAt: a.built_at } : null;

/**
 * A home place's count and found places (E10): its checklist is found by the
 * area's level, name and point, which the home's Area rows carry too.
 */
export function placeCount(
  a: { level: AreaLevel; name: string; lon: number; lat: number },
  areas: ChecklistArea[],
  finds: Find[],
): { count: HomeCount; found: Find[] } | null {
  if (a.level !== 'neighborhood' && a.level !== 'town') return null;
  const here = { level: a.level, name: a.name, at: [a.lon, a.lat] as LngLat };
  // The nearest same-named list: a town's point differs with the zoom it was read at (audit 5).
  const list = areas.filter((x) => sameArea(x, here)).sort((x, y) => distanceM(x.at, here.at) - distanceM(y.at, here.at))[0];
  if (!list) return null;
  const found = finds.filter((f) => f.area_key === list.key);
  const count = homeCount(list, found.length);
  return count ? { count, found } : null;
}

/** "12 of 87 · list from Nov 1" (E10). */
export function countLine(c: HomeCount, locale?: string, timeZone?: string): string {
  const date = new Date(c.builtAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone });
  return `${c.found} of ${c.total} · list from ${date}`;
}

type Found = { name: string; category: CategoryId; generic: boolean; kind?: Kind };

/**
 * At a capture's stop in the replay: the place it found (E11); an unnamed one
 * by its label alone. Labelled by its kind, as on the walk's card (audit, UI);
 * a mark found before explore has only its category.
 */
export const foundLine = (f: Found): string =>
  f.generic ? `Found: ${f.name}` : `Found: ${f.name} · ${f.kind ? kindOf(f.kind).label : categoryOf(f.category).label}`;

/** The card's finds, by category, most first (E11): "Found 2 art · 1 culture". Null with none. */
export function findsLine(found: { category: CategoryId }[]): string | null {
  if (!found.length) return null;
  const order = CATEGORIES.map((c) => c.id);
  const by = new Map<CategoryId, number>();
  for (const x of found) by.set(x.category, (by.get(x.category) ?? 0) + 1);
  return `Found ${[...by]
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([c, n]) => `${n} ${categoryOf(c).noun}`)
    .join(' · ')}`;
}

/** The card's finds by name (E11): "Found RISD Museum · Old North Church", three at most, then how many more. */
export function foundList(names: string[]): string | null {
  if (!names.length) return null;
  const shown = names.slice(0, names.length > 4 ? 3 : 4).join(' · ');
  const more = names.length - (names.length > 4 ? 3 : names.length);
  return `Found ${shown}${more > 0 ? ` and ${more} more` : ''}`;
}

/**
 * What a walk passed without stopping (E11, audit 9): places of shown kinds
 * named by a fix after exploring began, not found on this walk.
 */
export function passedCount(o: { items: ChecklistItem[]; fixes: { at: LngLat; t: number }[]; since: number; hidden: Set<Kind>; foundHere: Set<string> }): number {
  const named = revealedKeys(o.items.filter((i) => !o.hidden.has(i.kind)), o.fixes.filter((f) => f.t >= o.since).map((f) => f.at));
  return [...named].filter((k) => !o.foundHere.has(k)).length;
}

/** The card's low (E11): places revealed on the walk but not captured. */
export const passedLine = (n: number): string | null =>
  n > 0 ? `Passed ${n} ${n === 1 ? 'place' : 'places'} you didn’t stop for` : null;

/** The "What I'm into" filter as stored (meta `explore_hidden`): the kinds switched off. */
export function parseHidden(raw: string | null): Set<Kind> {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return new Set((Array.isArray(v) ? v : []).filter((k): k is Kind => KINDS.some((x) => x.id === k)));
  } catch {
    return new Set();
  }
}
