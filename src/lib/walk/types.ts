// @layer core
import type { LngLat } from '../types';

/*
 * Walkability's contract (WK1, WK1b). A WalkSource turns a z14 tile into the ways in it with what is
 * known about them; the bands are judged from those facts (bands.ts) and never stored (WK9). The
 * sources (Overture, Overpass) each bring their own adapter; this file knows neither schema.
 */

/** How a street treats someone on foot. `unknown` draws as nothing and counts as nothing (WK12). */
export type Band = 'foot' | 'mixed' | 'car' | 'unknown';

/** A sidewalk as the map data states it, where it states it (Overpass tags; Overture has none, WK8b). */
export type Side = 'both' | 'left' | 'right' | 'separate' | 'none';

/** One way in a tile, reduced to what the bands need. */
export interface WayFacts {
  id: string;
  /** The road or path class, as OpenStreetMap's `highway` value: motorway, trunk, primary, residential, footway... */
  cls: string;
  /** A finer kind where the source has one: `sidewalk` and `crosswalk` for footways, `link` for ramps, `alley`... */
  sub?: string;
  /** The speed limit in km/h, where tagged. */
  speedKmh?: number;
  /** An explicit sidewalk tag on a road. */
  sidewalk?: Side;
  /** The street's name, for the heads-up line (WK15). */
  name?: string;
  /** 0 on the ground; a bridge or tunnel is above or below (NB1). */
  level: number;
  line: LngLat[];
}

/** One z14 tile's ways, and which source they came from (WK1b). */
export interface TileFacts {
  x: number;
  y: number;
  ways: WayFacts[];
  /** Where streets meet: Overture's connector points, or the nodes two ways of an Overpass tile share (UF3). */
  junctions: LngLat[];
  from: 'overture' | 'overpass';
}

export interface WalkSource {
  /** The tile's facts, or null when this source can't give them (WK3). */
  read(x: number, y: number, signal?: AbortSignal): Promise<TileFacts | null>;
}

/** A read tile as kept (WK2): a cache tagged with the source's build and `WALK_CODE`, cleared with the derived stores (WK19). */
export interface WalkTile {
  /** `x/y` at z14. */
  key: string;
  x: number;
  y: number;
  /** The Overture release it was read from (or the day, for Overpass: its data has no release). */
  build: string;
  code: string;
  from: TileFacts['from'];
  read_at: number;
  ways: WayFacts[];
  junctions: LngLat[];
}
