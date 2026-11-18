// @layer core
import type { LngLat } from '../types';

/*
 * The road engine's own types (RE4, RE34). A `Road` is one stretch of a main road as a source gives it: its kind, whether it is a
 * link (a ramp or a slip road), its sense, and its points. The engine reads roads only through a `RoadSource`, so the map's tiles
 * are the first source and a road pack can be the next; this shape is the pack's contract too.
 */
export type RoadKind = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';

export interface Road {
  kind: RoadKind;
  link: boolean;
  /** 1: driven only in the order of its points; -1: only against it; 0: both ways. */
  oneWay: -1 | 0 | 1;
  points: LngLat[];
}

export interface RoadSource {
  /** The roads of these tiles (x, y at the engine's zoom), or null when they could not all be read or the read was stopped. */
  read(tiles: readonly [number, number][], shouldStop?: () => boolean): Promise<Road[] | null>;
}

/** A source that holds its roads in memory, for tests: every tile asked for gives them all. */
export const memoryRoads = (roads: readonly Road[]): RoadSource => ({
  read: async (_tiles, shouldStop) => (shouldStop?.() ? null : [...roads]),
});

export interface RoadLeg {
  path: LngLat[];
  lengthM: number;
}

/** One way through the points given, in order (RE10, RE12). */
export interface RoadWay {
  /** A leg per pair of points; null where no road joins them (no road within reach of one, or none between). */
  legs: (RoadLeg | null)[];
  /** The whole line: each leg's road, and a straight stretch where a leg is null. */
  path: LngLat[];
  /** Road length of the legs found, plus the straight stretches. */
  lengthM: number;
  /** Every leg was found on the road. */
  whole: boolean;
  /** Metres by kind of road, of the legs found. */
  kinds: Partial<Record<RoadKind, number>>;
}
