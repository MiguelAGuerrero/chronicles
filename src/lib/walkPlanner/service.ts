// @layer shell
import { ATLAS_LABEL, ATLAS_ORDER } from '../atlas/atlas';
import type { CategoryId, Place } from '../discovery/types';
import { distanceM } from '../geo';
import { densestCells, onStreets } from '../kindWalk/density';
import type { KindWalkPrefs } from '../kindWalk/prefs';
import type { Reach } from '../kindWalk/words';
import { routeTo } from '../nav/navigator';
import { streetRouteSource } from '../nav/streetRoute';
import type { LngLat, StreetSegment } from '../types';
import { isMarkable } from '../discovery/noise';
import { alsoPasses, type Also } from './exposure';
import { planRoutes, type Leg, type PlannedRoute, type Reason } from './planner';

/*
 * The planner's reads (WP1, WP3, WP19, WP22): when the page opens, the tiles around the area, the routes, what lies on each for
 * someone on foot, and the places the walker has found (for pins). Nothing is read before it opens and nothing is kept.
 */

/** The most that is read around an area's point (as the kind walk's was). */
export const READ_M = 1500;

export interface PlannerDeps {
  /** The places and streets around a point, read from the map's tiles now; nothing read is kept. */
  read(at: LngLat, radiusM: number): Promise<{ places: Place[]; segments: StreetSegment[] } | null>;
  /** The stretches built around cars along a path, and whether the streets could be read at all (KW10). */
  reach(path: LngLat[]): Promise<Reach>;
  /** Where the walker has found places: their captures' finds, and nothing else (WP16). */
  found(): Promise<{ at: LngLat }[]>;
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

const MARK_KINDS = new Set<CategoryId>(['history', 'art', 'culture', 'parks', 'viewpoints']);

const pk = (p: LngLat) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
const edge = (a: LngLat, b: LngLat) => [pk(a), pk(b)].sort().join('>');

/** Routing over `segments`; with `avoid`, over the pieces that path does not use (the way back of a loop, WP8, KW16). */
export function legOver(segments: readonly StreetSegment[]): Leg {
  const all = streetRouteSource([...segments]);
  return (a, b, avoid) => {
    if (!segments.length) return null;
    if (!avoid) return routeTo([all], a, b, 'shortest').route;
    const used = new Set<string>();
    for (let i = 1; i < avoid.length; i++) used.add(edge(avoid[i - 1], avoid[i]));
    const keep = segments.filter((s) => !s.geometry.some((line) => line.some((p, i) => i > 0 && used.has(edge(line[i - 1], p)))));
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
      const places = read.places.filter((p) => p.category === i.kind && distanceM(p.at, i.area.at) <= radiusM);
      if (!places.length) return { routes: [], reasons: ['few'], found: [] };
      const cells = onStreets(densestCells(places, i.area.at), read.segments.flatMap((s) => s.geometry));
      const planned = planRoutes({ cells, from: i.from, mode: i.prefs.mode, ceilingM: i.prefs.budgetM, density: i.prefs.density, round: i.round, shown: i.shown }, legOver(read.segments));
      // Every other kind's dense cells, at the cells' resolution and counting every place found or not (WP28): a presence along the
      // route, never a place. A kind that can be found counts only places that could be (as the atlas does).
      const inRange = read.places.filter((p) => distanceM(p.at, i.area.at) <= radiusM && (p.markable === undefined ? isMarkable(p) : p.markable !== false || !MARK_KINDS.has(p.category)));
      const cellsByKind: Partial<Record<CategoryId, ReturnType<typeof densestCells>>> = {};
      for (const k of ATLAS_ORDER) if (k !== i.kind) cellsByKind[k] = densestCells(inRange.filter((p) => p.category === k), i.area.at);
      const withReach = await Promise.all(planned.routes.map(async (r): Promise<PlannerRoute> => ({
        ...r,
        reach: await deps.reach(r.path).catch((): Reach => ({ cars: [], unknown: true })),
        also: alsoPasses(r.path, cellsByKind, ATLAS_ORDER, i.kind),
      })));
      // With "don't suggest", a route with a stretch built around cars is left out, not swapped for another (KW11).
      const routes = i.prefs.pref === 'skip' ? withReach.filter((r) => !r.reach.cars.length) : withReach;
      const reasons = [...planned.reasons];
      if (routes.length < withReach.length) reasons.push('cars');
      const found = await deps.found().catch(() => []);
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
