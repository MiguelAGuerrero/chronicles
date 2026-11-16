// @layer adapter
import type { LngLat } from '../types';
import type { Store } from './stores';

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
export function storesFromFeatures(_features: readonly PackFeature[], _dims?: Readonly<Record<string, readonly string[]>>): Store[] {
  throw new Error('not built: quick-circuit QC14');
}

/** QC14: where stores come from; the app's instance reads the pack by tile, tests use `memoryStores`. */
export interface StoresSource {
  read(at: LngLat, radiusM: number): Promise<Store[]>;
}

export function memoryStores(_stores: readonly Store[]): StoresSource {
  throw new Error('not built: quick-circuit QC14');
}

/** QC14: a read that fails or finds no pack leaves nothing and says nothing. */
export async function readStores(_source: StoresSource | null, _at: LngLat, _radiusM: number): Promise<Store[]> {
  throw new Error('not built: quick-circuit QC14');
}
