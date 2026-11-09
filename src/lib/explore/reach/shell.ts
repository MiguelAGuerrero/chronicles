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
  /** The latest place asked about: an earlier ask that answers late is dropped (remarkable-and-public audit 6). */
  let latest: string | null = null;
  const near = async (at: LngLat): Promise<boolean | null> => {
    const segments = await p.db.getSegmentsIn(boundsOf([at], KNOWN_M)!).catch(() => []);
    return wayNear(at, segments.flatMap((s) => s.geometry));
  };
  return {
    near,
    /** Asks for `key`'s reach and answers only if no later ask came first. */
    ask(key: string, at: LngLat, answer: (a: { key: string; near: boolean | null }) => void) {
      latest = key;
      near(at)
        .then((n) => {
          if (latest === key) answer({ key, near: n });
        })
        .catch(() => {});
    },
  };
}
