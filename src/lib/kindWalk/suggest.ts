// @layer shell
import type { CategoryId, Place } from '../discovery/types';
import { distanceM } from '../geo';
import { routeTo } from '../nav/navigator';
import { streetRouteSource } from '../nav/streetRoute';
import type { Route, Waypoint } from '../nav/types';
import { ATLAS_LABEL } from '../atlas/atlas';
import type { LngLat, StreetSegment } from '../types';
import { densestCells, onStreets } from './density';
import { planKindWalk, type KindWalk } from './plan';
import type { KindWalkPrefs } from './prefs';
import type { Reach } from './words';

/*
 * The suggestion for one kind in one area (KW2, KW4-KW11): read when the walker taps the kind, never before (KW14). The
 * places and streets come from the cache; what lies on the way for someone on foot comes from `reach`, which the app wires
 * to the walkability reader. Nothing is stored here.
 */

export interface KindWalkDeps {
  /**
   * The places and streets around a point, read from the map's tiles now (the atlas keeps only a ring's profile, not its
   * places or streets: explore-atlas audit 6). Nothing read is kept.
   */
  read(at: LngLat, radiusM: number): Promise<{ places: Place[]; segments: StreetSegment[] } | null>;
  /** The stretches built around cars along a path, and whether the streets could be read at all (KW10). */
  reach(path: LngLat[]): Promise<Reach>;
}

export type Suggestion =
  | { state: 'walk'; walk: KindWalk; reach: Reach; dest: Waypoint }
  | { state: 'none' | 'few' | 'far' | 'noRoute' | 'skipped' };

export interface SuggestInput {
  kind: CategoryId;
  /** The area's point and reach: where the places of the kind are counted (KW5). */
  area: { at: LngLat; reachM: number };
  /** The walker, or null with no fix: the start is then the area (KW9). */
  from: LngLat | null;
  prefs: KindWalkPrefs;
}

/** The most that is read around an area's point: a town's reach is wider, and the walk stays near its point (as Explore's read, 1.5 km). */
export const READ_M = 1500;

export function createKindWalk(deps: KindWalkDeps) {
  return {
    async suggest(i: SuggestInput): Promise<Suggestion> {
      const radiusM = Math.min(i.area.reachM, READ_M);
      const read = await deps.read(i.area.at, radiusM).catch(() => null);
      // A read that failed has no streets to walk on: said as a way not found, not as an empty kind.
      if (!read) return { state: 'noRoute' };
      const places = read.places.filter((p) => p.category === i.kind && distanceM(p.at, i.area.at) <= radiusM);
      if (!places.length) return { state: 'none' };
      const cells = densestCells(places, i.area.at);
      const from = i.from ?? i.area.at;
      const segments = read.segments;
      if (!segments.length) return { state: 'noRoute' };
      const source = streetRouteSource(segments);
      // The walk goes along streets: each cell's middle is moved onto the street nearest it, in the cell's own order.
      const onWay = onStreets(cells, segments.flatMap((sg) => sg.geometry));
      const leg = (a: LngLat, b: LngLat): Route | null => (segments.length ? routeTo([source], a, b, 'shortest').route : null);
      const planned = planKindWalk(onWay, from, i.prefs.budgetM, leg);
      if (planned.kind !== 'walk') return { state: planned.kind };
      const { walk } = planned;
      const reach = await deps.reach(walk.path).catch((): Reach => ({ cars: [], unknown: true }));
      // KW11b: one chain. With don't-suggest it is not swapped for another; it is not offered.
      if (i.prefs.pref === 'skip' && reach.cars.length) return { state: 'skipped' };
      const stops = walk.stops;
      const dest: Waypoint = {
        at: stops[stops.length - 1],
        label: `Through ${ATLAS_LABEL[i.kind].toLowerCase()}`,
        kind: 'point',
        via: stops.slice(0, -1),
        suggested: true,
      };
      return { state: 'walk', walk, reach, dest };
    },
  };
}
