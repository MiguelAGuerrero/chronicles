// @layer core
import type { CollectedFeatures } from '../../components/map/types';
import { activityFromTilePois, mergeSources, type ActivityPoint } from '../activity/points';
import { placesFromTiles } from '../areas/tilePlaces';
import type { PlaceCandidate } from '../areas/types';
import { mergePlaces } from '../discovery/archiveMerge';
import { refineRead } from '../discovery/refinements';
import { decodeTile } from '../discovery/tileDecode';
import { placesFromTilePois, transitFromTilePois } from '../discovery/tilePois';
import type { Place } from '../discovery/types';
import { deriveSegments } from '../streets';
import type { LngLat, StreetSegment } from '../types';
import { analyzeArea, type AreaAnalysis } from './analyze';

/** What a read hands the compute (DC13): the tiles' bytes as fetched, and what Overture and the archive gave. */
export interface ComputeInput {
  bodies: ArrayBuffer[];
  tiles: [number, number][];
  zoom: number;
  build: string;
  overturePoints: ActivityPoint[];
  archivePlaces: Place[] | null;
  /** When set, the area is measured around it (What's good here, the Busy layer); otherwise not (a quiet walk's read). */
  analyzeAt: LngLat | null;
}

export interface ComputeOutput {
  segments: StreetSegment[];
  /** The map's own places, as stored (L2). */
  tilePlaces: Place[];
  /** The map's and the archive's places, refined (PW8, PW13, PC21). */
  places: Place[];
  points: ActivityPoint[];
  towns: PlaceCandidate[];
  transit: LngLat[];
  analysis: AreaAnalysis | null;
}

/** The tiles decoded and gathered, as `fetchTiles` gives them. */
function gather(input: ComputeInput, k: number, out: CollectedFeatures) {
  const [x, y] = input.tiles[k];
  const f = decodeTile(new Uint8Array(input.bodies[k]), input.zoom, x, y);
  out.roads.push(...f.roads);
  out.names.push(...f.names);
  out.places.push(...f.places);
  out.pois.push(...f.pois);
  out.landcover!.push(...(f.landcover ?? []));
}

/**
 * Everything a read derives from its tiles (DC13): today's `readAround` after its fetches, then the area measured when
 * asked. A generator, so one function serves both runs: it yields before each tile and each stage (DC11).
 */
function* stages(input: ComputeInput): Generator<void, ComputeOutput, void> {
  const features: CollectedFeatures = { roads: [], names: [], places: [], pois: [], landcover: [], complete: true };
  for (let k = 0; k < input.tiles.length; k++) {
    yield;
    gather(input, k, features);
  }
  yield;
  const segments = deriveSegments(features.roads, features.names, input.build);
  yield;
  const tilePlaces = placesFromTilePois(features.pois, input.build);
  // PW8, PW13: one mark per place across the map and the archive, then the owner's removals and adds.
  // community-parks PC21: merged first, then refined with the tiles' outlines and the archive's places.
  const archive = input.archivePlaces ?? undefined;
  const places = refineRead(archive ? mergePlaces(tilePlaces, archive) : tilePlaces, { landcover: features.landcover, archive });
  yield;
  const points = mergeSources(activityFromTilePois(features.pois), input.overturePoints);
  const towns = placesFromTiles(features.places);
  const transit = transitFromTilePois(features.pois);
  yield;
  const analysis = input.analyzeAt ? analyzeArea({ centre: input.analyzeAt, points, segments, towns, transit }) : null;
  return { segments, tilePlaces, places, points, towns, transit, analysis };
}

/** Everything a read derives from its tiles, at once (a worker's run, or the page's when it has to). */
export function computeRead(input: ComputeInput): ComputeOutput {
  const run = stages(input);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
  }
}

/** The same, awaiting `pause` before each tile and each stage, so a JS thread can draw between them (DC11). Core never times it. */
export async function computeReadPaced(input: ComputeInput, pause: () => Promise<void>): Promise<ComputeOutput> {
  const run = stages(input);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
    await pause();
  }
}

/** Whether a message is a compute input (the worker's side checks before it reads one). */
const isInput = (d: unknown): d is ComputeInput => {
  const o = d as Partial<ComputeInput> | null;
  return !!o && Array.isArray(o.bodies) && Array.isArray(o.tiles) && o.bodies.length === o.tiles.length && typeof o.zoom === 'number' && typeof o.build === 'string' && Array.isArray(o.overturePoints);
};

/** The worker's side of the exchange (DC7): a message in, a message out; never throws. */
export function handleComputeMessage(data: unknown): { ok: true; out: ComputeOutput } | { ok: false; error: string } {
  if (!isInput(data)) return { ok: false, error: 'not a compute input' };
  try {
    return { ok: true, out: computeRead(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
