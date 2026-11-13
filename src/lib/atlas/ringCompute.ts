// @layer core
import type { CollectedFeatures } from '../../components/map/types';
import type { ActivityPoint } from '../activity/points';
import type { ArchiveRead } from '../discovery/archive/shell';
import { decodeTile } from '../discovery/tileDecode';
import type { LngLat } from '../types';
import type { AtlasProfile } from './atlas';
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
  archive: ArchiveRead;
  finds: { key: string; name: string; at: LngLat }[];
}

/** The ring's profile from its tiles: decode, then `profileFrom`, yielding before each tile and the profile. */
function* stages(input: RingInput): Generator<void, AtlasProfile, void> {
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
  return profileFrom(input.at, f, input.build, input.overture, input.extent, input.archive, input.finds).profile;
}

/** At once (a worker's run). */
export function computeRing(input: RingInput): AtlasProfile {
  const run = stages(input);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
  }
}

/** Awaiting `pause` before each tile and the profile (the page's run, DC11). */
export async function computeRingPaced(input: RingInput, pause: () => Promise<void>): Promise<AtlasProfile> {
  const run = stages(input);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
    await pause();
  }
}
