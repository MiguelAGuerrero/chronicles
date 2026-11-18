// @layer core
import type { RoadKind } from './types';

/*
 * The road engine's rules (RE5-RE7, RE11, RE29), each a number the plan's measurement of real tiles gave or the owner chose
 * (decisions 0203, 0204). The cost is by kind of road and nothing else: no speed, no time.
 */
export interface RoadRules {
  zoom: number;
  kinds: readonly RoadKind[];
  joinM: number;
  snapM: number;
  cost: Readonly<Record<RoadKind, number>>;
  tilesMax: number;
  padM: number;
  yieldEvery: number;
  nodesMax: number;
}

export const ROAD_RULES: RoadRules = {
  /** The lowest zoom whose tiles say which way a road runs (measured: below it none does). */
  zoom: 12,
  kinds: ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'],
  /** Road ends this near another road's point are one junction: a tile edge leaves the halves up to about this far apart. */
  joinM: 10,
  /** A point is on the road when a road lies within this of it; a town further from every main road has no road way. */
  snapM: 3000,
  /**
   * RE11: what a metre of each kind costs. The roads through the towns cost their length; a motorway half as much again, so it
   * is taken only when the way without it is more than half as long again; a trunk road a little more than a town's road.
   */
  cost: { motorway: 1.5, trunk: 1.15, primary: 1, secondary: 1, tertiary: 1 },
  /** RE7: a plan reads at most this many tiles, about 150 km of road (decision 0204). */
  tilesMax: 60,
  /** RE7: the corridor reaches this far to each side of the straight stretches between the points. */
  padM: 4000,
  /** RE29: the search gives the screen a turn after this many junctions looked at, and gives up after this many. */
  yieldEvery: 2000,
  nodesMax: 500_000,
};
