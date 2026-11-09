// @layer shell
import { boundsOf } from '../../geo';
import type { Ports } from '../../ports/types';
import type { LngLat } from '../../types';
import { KNOWN_M, wayNear } from './rule';

/**
 * RP20: whether a place to find has a street or path close by, from the street segments the reads already cached
 * (`db.getSegmentsIn`); nothing is fetched. Null when none is cached around it.
 */
export function createReach(p: Pick<Ports, 'db'>) {
  return {
    async near(at: LngLat): Promise<boolean | null> {
      const segments = await p.db.getSegmentsIn(boundsOf([at], KNOWN_M)!).catch(() => []);
      return wayNear(at, segments.flatMap((s) => s.geometry));
    },
  };
}
