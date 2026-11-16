// @layer adapter
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { knownFacets } from './candidates';
import { DIMENSIONS, type Store } from './stores';

/*
 * The only file that knows the stores pack's schema (QC14), as `discovery/archivePois.ts` does for the places archive. A tile feature
 * carries flat properties: `name`, `id`, `src` and one property per dimension holding its values joined by a comma. Nothing else is read.
 */
export interface PackFeature {
  lon: number;
  lat: number;
  props: Readonly<Record<string, unknown>>;
}

/** QC11, QC12, QC40: the stores of a pack's features; any other property is never read, unknown dimensions and values are dropped. */
export function storesFromFeatures(features: readonly PackFeature[], dims: Readonly<Record<string, readonly string[]>> = DIMENSIONS): Store[] {
  const out: Store[] = [];
  for (const f of features) {
    const { name, id, src } = f.props;
    if (typeof name !== 'string' || !name.trim() || typeof id !== 'string' || !id || typeof src !== 'string' || !src) continue;
    if (!Number.isFinite(f.lon) || !Number.isFinite(f.lat)) continue;
    const raw: Record<string, string[]> = {};
    for (const dim of Object.keys(dims)) {
      const v = f.props[dim];
      if (typeof v === 'string') raw[dim] = v.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const facets = knownFacets(raw, dims);
    if (!Object.keys(facets).length) continue;
    out.push({ id, name: name.trim(), at: [f.lon, f.lat], facets, src });
  }
  return out;
}

/** QC14: where stores come from; the app's instance reads the pack by tile, tests use `memoryStores`. */
export interface StoresSource {
  read(at: LngLat, radiusM: number): Promise<Store[]>;
}

export function memoryStores(stores: readonly Store[]): StoresSource {
  return { read: async (at, radiusM) => stores.filter((s) => distanceM(at, s.at) <= radiusM) };
}

/** QC14: a read that fails or finds no pack leaves nothing and says nothing. */
export async function readStores(source: StoresSource | null, at: LngLat, radiusM: number): Promise<Store[]> {
  if (!source) return [];
  try {
    return await source.read(at, radiusM);
  } catch {
    return [];
  }
}
