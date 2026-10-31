import { boundarySource, type BoundaryPack } from './boundaryPack';

/**
 * The boundary packs the app ships with: the United States, where the owner
 * walks. A walk elsewhere takes its state from the map's own state points.
 * Add a country by building its pack (scripts/build-boundaries.js) and
 * listing it here; downloaded regions can add theirs the same way.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PACKS: BoundaryPack[] = [require('../../../assets/boundaries/us.json')];

export const appBoundaries = boundarySource(PACKS);
