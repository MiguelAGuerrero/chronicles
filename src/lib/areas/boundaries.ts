import { boundarySource, type BoundaryPack } from './boundaryPack';
import type { BoundarySource } from './types';

/**
 * The boundary packs the app ships with: the United States, where the owner
 * walks. A walk elsewhere takes its state from the map's own state points.
 * Add a country by building its pack (scripts/build-boundaries.js), listing
 * it here and adding its id below; downloaded regions can add theirs the
 * same way.
 */
const loadPacks = (): BoundaryPack[] => [require('../../../assets/boundaries/us.json')];

/**
 * The shipped packs' ids, known without loading them (577 KB), so app launch
 * doesn't pay for them; a test checks they match the packs.
 */
export const BOUNDARY_PACKS_ID = 'naturalearth-10m-admin1-v5.1.1/US';

let source: BoundarySource | null = null;
/** The shipped boundaries, loaded the first time a walk is placed. */
export function appBoundaries(): BoundarySource {
  source ??= boundarySource(loadPacks());
  return source;
}
