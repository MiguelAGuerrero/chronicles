// @layer core
import type { CollectedFeatures } from '../../components/map/types';
import type { ActivityPoint } from '../activity/points';
import type { ArchiveRead } from '../discovery/archive/shell';
import { decodeTile } from '../discovery/tileDecode';
import type { LngLat } from '../types';
import type { AtlasProfile } from './atlas';
import { hoodExtent } from '../areas/hoods';
import type { OutlineSet } from '../areas/outlines';
import { hamletsFromTiles, placesFromTiles } from '../areas/tilePlaces';
import { profileFrom, type Extent } from './profile';

/** What an atlas ring read hands the compute (explore-dense-city audit 2): the tiles' bytes and what else it read. */
export interface RingInput {
  bodies: ArrayBuffer[];
  tiles: [number, number][];
  zoom: number;
  build: string;
  at: LngLat;
  overture: { release: string; points: ActivityPoint[] } | null;
  extent: Extent | null;
  /** A neighborhood with no shape of its own (hood boundaries, audit 4): its share is worked out from the places read. */
  share: { area: { level: string; name: string; at: LngLat }; set: OutlineSet } | null;
  archive: ArchiveRead;
  finds: { key: string; name: string; at: LngLat }[];
}

/** What a ring compute gives: its profile, and the extent it was counted across (a neighborhood's share, when found). */
export interface RingOutput { profile: AtlasProfile; extent: Extent | null }

/** The ring's profile from its tiles: decode, the share, then `profileFrom`, yielding before each tile and the profile. */
function* stages(input: RingInput): Generator<void, RingOutput, void> {
  const f: CollectedFeatures = { roads: [], names: [], places: [], pois: [], landcover: [], complete: true };
  for (let k = 0; k < input.tiles.length; k++) {
    yield;
    const [x, y] = input.tiles[k];
    const d = decodeTile(new Uint8Array(input.bodies[k]), input.zoom, x, y);
    f.roads.push(...d.roads);
    f.names.push(...d.names);
    f.places.push(...d.places);
    f.pois.push(...d.pois);
    f.landcover!.push(...(d.landcover ?? []));
  }
  yield;
  let extent = input.extent;
  if (!extent && input.share) {
    const share = hoodExtent(input.share.area, [...placesFromTiles(f.places), ...hamletsFromTiles(f.places)], input.share.set);
    if (share) extent = { outline: share.outline, partial: share.partial, shape: true };
  }
  return { profile: profileFrom(input.at, f, input.build, input.overture, extent, input.archive, input.finds).profile, extent };
}

/** At once (a worker's run). */
export function computeRing(input: RingInput): RingOutput {
  const run = stages(input);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
  }
}

/** Awaiting `pause` before each tile and the profile (the page's run, DC11). */
export async function computeRingPaced(input: RingInput, pause: () => Promise<void>): Promise<RingOutput> {
  const run = stages(input);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
    await pause();
  }
}
