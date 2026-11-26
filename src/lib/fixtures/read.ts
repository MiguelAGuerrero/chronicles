// @layer adapter
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { Bounds } from '../geo';
import { tilesIn } from '../tileMath';
import { FIXTURE_KINDS, type Fixture, type FixtureKind } from './kinds';

/*
 * The only file that knows the fixtures pack's schema (TF4, TF5), as `discovery/archivePois.ts` does for the places archive.
 * A tile feature carries flat properties `kind`, `id`, `src` and `name` (absent when it has none), layer `fixtures`, z12;
 * nothing else is read, and an unknown kind is dropped, never an error.
 */
export interface PackFeature {
  lon: number;
  lat: number;
  props: Readonly<Record<string, unknown>>;
}

/** The pack's tile zoom (the contract: layer `fixtures`, zoom 12). */
export const FIXTURES_ZOOM = 12;
/** TF14: a read over more z12 tiles than this (wider than a town's view) reads nothing. */
export const FIXTURE_TILES_MAX = 9;

const KINDS: ReadonlySet<string> = new Set(FIXTURE_KINDS);

/** TF4: a pack tile's `fixtures` layer as features; a tile without the layer has none. */
export function decodeFixturesTile(bytes: ArrayBuffer, x: number, y: number): (PackFeature & { id: string })[] {
  const layer = new VectorTile(new PbfReader(new Uint8Array(bytes))).layers.fixtures;
  if (!layer) return [];
  const out: (PackFeature & { id: string })[] = [];
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i).toGeoJSON(x, y, FIXTURES_ZOOM);
    if (f.geometry?.type !== 'Point') continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const [lon, lat] = f.geometry.coordinates as [number, number];
    out.push({ lon, lat, props, id: typeof props.id === 'string' ? props.id : `${lon},${lat}` });
  }
  return out;
}

/** TF5: the fixtures of a pack's features: kind, id, src and a name where it has one; any other property is never read. */
export function fixturesFromFeatures(features: readonly PackFeature[]): Fixture[] {
  const out: Fixture[] = [];
  for (const f of features) {
    const { kind, id, src, name } = f.props;
    if (typeof kind !== 'string' || !KINDS.has(kind) || typeof id !== 'string' || !id || typeof src !== 'string' || !src) continue;
    if (!Number.isFinite(f.lon) || !Number.isFinite(f.lat)) continue;
    const named = typeof name === 'string' && name.trim() ? name.trim() : undefined;
    out.push({ id, kind: kind as FixtureKind, at: [f.lon, f.lat], ...(named ? { name: named } : {}), src });
  }
  return out;
}

/** TF14: the z12 tiles of a view, each once; null when there are more than FIXTURE_TILES_MAX. */
export function fixtureTiles(bounds: Bounds): [number, number][] | null {
  const tiles = tilesIn(bounds, FIXTURES_ZOOM);
  return tiles.length > FIXTURE_TILES_MAX ? null : tiles;
}

export const inBounds = ([w, s, e, n]: Bounds, [lon, lat]: [number, number]) => lon >= w && lon <= e && lat >= s && lat <= n;

/** TF4, TF14: where fixtures come from; the app's will read the pack by tile, tests use `memoryFixtures`. */
export interface FixturesSource {
  read(bounds: Bounds, shouldStop?: () => boolean): Promise<Fixture[]>;
}

export function memoryFixtures(fixtures: readonly Fixture[]): FixturesSource {
  return { read: async (bounds) => fixtures.filter((f) => inBounds(bounds, f.at)) };
}

/** TF4: a read that fails, finds no pack or has no source leaves nothing and says nothing. */
export async function readFixtures(source: FixturesSource | null, bounds: Bounds, shouldStop?: () => boolean): Promise<Fixture[]> {
  if (!source) return [];
  try {
    return await source.read(bounds, shouldStop);
  } catch {
    return [];
  }
}
