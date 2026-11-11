// @layer shell
import { ATLAS_LABEL, ATLAS_ORDER } from '../atlas/atlas';
import type { CategoryId, Place } from '../discovery/types';
import { barsOf, passesBy } from '../discovery/bars';
import { distanceM } from '../geo';
import { densestCells, onStreets } from '../kindWalk/density';
import { MIN_CELLS } from '../kindWalk/plan';
import type { KindWalkPrefs } from '../kindWalk/prefs';
import type { Reach } from '../kindWalk/words';
import { routeTo } from '../nav/navigator';
import { streetRouteSource } from '../nav/streetRoute';
import type { LngLat, StreetSegment } from '../types';
import { countsToward } from '../discovery/curation';
import { isMarkable } from '../discovery/noise';
import { alsoPasses, type Also } from './exposure';
import { planRoutes, type Leg, type PlannedRoute, type Reason } from './planner';
import { CONSIDERED } from './presets';
import { mergePlaces } from '../discovery/archiveMerge';

/*
 * The planner's reads (WP1, WP3, WP19, WP22): when the page opens, the tiles around the area, the routes, what lies on each for
 * someone on foot, and the places the walker has found (for pins). Nothing is read before it opens and nothing is kept.
 */

/** The most that is read around an area's point (as the kind walk's was). */
export const READ_M = 1500;

export interface PlannerDeps {
  /**
   * The places and streets around a point, read from the map's tiles now, with the places archive's places beside them
   * (`archive`, null without it); nothing read is kept.
   */
  read(at: LngLat, radiusM: number): Promise<{ places: Place[]; archive?: Place[] | null; segments: StreetSegment[] } | null>;
  /** The stretches built around cars along a path, and whether the streets could be read at all (KW10). */
  reach(path: LngLat[]): Promise<Reach>;
  /** Where the walker has found places: their captures' finds, and nothing else (WP16). */
  found(kind: CategoryId): Promise<{ at: LngLat }[]>;
}

export interface PlanRequest {
  kind: CategoryId;
  area: { at: LngLat; reachM: number };
  /** The walker; null with no position (WP3). */
  from: LngLat | null;
  prefs: Pick<KindWalkPrefs, 'budgetM' | 'pref' | 'mode' | 'density'>;
  round?: number;
  /** The paths on screen, the only memory (WP13). */
  shown?: readonly (readonly LngLat[])[];
}

export interface PlannerRoute extends PlannedRoute {
  reach: Reach;
  /** The other kinds along it, by kind and never by place (WP28). */
  also: Also[];
}

export interface PlannerResult {
  routes: PlannerRoute[];
  reasons: Reason[];
  found: { at: LngLat }[];
}


const pk = (p: LngLat) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
const edge = (a: LngLat, b: LngLat) => [pk(a), pk(b)].sort().join('>');

/**
 * Routing over `segments`; with `avoid`, over the pieces the way out did not mostly use (the way back of a loop, WP8, KW16). A long
 * piece the way out only touched stays, so a loop is not lost for a few metres shared with an avenue (walk planner audit 7).
 */
export function legOver(segments: readonly StreetSegment[]): Leg {
  const all = streetRouteSource([...segments]);
  return (a, b, avoid) => {
    if (!segments.length) return null;
    if (!avoid) return routeTo([all], a, b, 'shortest').route;
    const used = new Set<string>();
    for (let i = 1; i < avoid.length; i++) used.add(edge(avoid[i - 1], avoid[i]));
    const mostlyUsed = (s: StreetSegment): boolean => {
      let total = 0;
      let shared = 0;
      for (const line of s.geometry) {
        for (let k = 1; k < line.length; k++) {
          const d = distanceM(line[k - 1], line[k]);
          total += d;
          if (used.has(edge(line[k - 1], line[k]))) shared += d;
        }
      }
      return total > 0 && shared / total >= 0.5;
    };
    const keep = segments.filter((s) => !mostlyUsed(s));
    return keep.length ? routeTo([streetRouteSource(keep)], a, b, 'shortest').route : null;
  };
}

export function createPlanner(deps: PlannerDeps) {
  return {
    async plan(i: PlanRequest): Promise<PlannerResult> {
      if (!i.from) return { routes: [], reasons: ['noPosition'], found: [] };
      const radiusM = Math.min(i.area.reachM, READ_M);
      const read = await deps.read(i.area.at, radiusM).catch(() => null);
      if (!read || !read.segments.length) return { routes: [], reasons: ['noRoute'], found: [] };
      // The same rule for every kind, the opened one too: a kind that can be found counts only places that could be, by the atlas's
      // own rule (`countsToward`, PS5), so a cell of churches that cannot be found is not dense (walk planner audit 5).
      // presence-and-kinds audit 1: the archive's places with the map's, one place each, as the atlas ring merges them (PW8).
      const places0 = read.archive ? mergePlaces(read.places, read.archive) : read.places;
      // presence-readers audit 3: a place read before `markable` existed is judged as the atlas's ring judges it (`ringOf`).
      const counted = places0
        .map((p) => (p.markable === undefined ? { ...p, markable: isMarkable(p) } : p))
        .filter((p) => distanceM(p.at, i.area.at) <= radiusM && countsToward(p));
      // PK8, PS5: the places that light the bar by their classes, a museum the data calls historic among History's.
      const places = counted.filter((p) => barsOf(p).includes(i.kind));
      if (!places.length) return { routes: [], reasons: ['few'], found: [] };
      const lines = read.segments.flatMap((s) => s.geometry);
      const all = onStreets(densestCells(places, i.area.at), lines);
      // PK9: the places you pass choose the stops when they make the minimum; every place of the bar grades the route.
      const passed = onStreets(densestCells(places.filter(passesBy), i.area.at), lines);
      const lean = passed.length >= MIN_CELLS && passed.length < all.length;
      const plan = (cells: typeof all, graded?: typeof all) =>
        planRoutes({ cells, graded, from: i.from, mode: i.prefs.mode, ceilingM: i.prefs.budgetM, density: i.prefs.density, round: i.round, shown: i.shown }, legOver(read.segments));
      // audit 2: with no lean the route is graded by its own considered cells, as before; with one, by the bar's.
      // audit 3: places you pass that make no route (far, out of reach, too little) give way to every place of the bar.
      let planned = lean ? plan(passed, all.slice(0, CONSIDERED)) : plan(all);
      if (lean && !planned.routes.length) planned = plan(all);
      // Every other kind's dense cells, at the cells' resolution and counting every place found or not (WP28): a presence along the
      // route, never a place. A kind that can be found counts only places that could be (as the atlas does).
      const inRange = counted;
      const cellsByKind: Partial<Record<CategoryId, ReturnType<typeof densestCells>>> = {};
      // PK10: a place counts toward every bar it lights.
      for (const k of ATLAS_ORDER) if (k !== i.kind) cellsByKind[k] = densestCells(inRange.filter((p) => barsOf(p).includes(k)), i.area.at);
      const withReach = await Promise.all(planned.routes.map(async (r): Promise<PlannerRoute> => ({
        ...r,
        reach: await deps.reach(r.path).catch((): Reach => ({ cars: [], unknown: true })),
        also: alsoPasses(r.path, cellsByKind, ATLAS_ORDER, i.kind),
      })));
      // With "don't suggest", a route with a stretch built around cars is left out, not swapped for another (KW11).
      const routes = i.prefs.pref === 'skip' ? withReach.filter((r) => !r.reach.cars.length) : withReach;
      const reasons = [...planned.reasons];
      if (routes.length < withReach.length) reasons.push('cars');
      const found = await deps.found(i.kind).catch(() => []);
      return { routes, reasons: routes.length ? reasons : [...new Set<Reason>([...reasons, ...(reasons.length ? [] : ['noRoute' as const])])], found };
    },
  };
}

/** Start (WP24): plans again from where the walker stands now with the same settings, and takes the route of the same preset. */
export async function startFrom(planner: ReturnType<typeof createPlanner>, req: PlanRequest, chosen: PlannerRoute): Promise<PlannerRoute> {
  const again = await planner.plan({ ...req, round: 0, shown: [] });
  return again.routes.find((r) => r.preset === chosen.preset) ?? chosen;
}

export const kindName = (k: CategoryId): string => ATLAS_LABEL[k].toLowerCase();
