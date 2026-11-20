// @layer shell
import type { Ports } from '../../ports/types';
import { offerLeftKey } from '../placeOffer';

/** The kept list, or none: anything else read back counts as none. */
const keysOf = (raw: string | null): string[] => {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
};

/**
 * A place offered after the moment, its effects (specs/moment-assignment-fallback): Undo of a tie (PO12) and the places
 * left with Leave it on a walk (PO4), kept in meta (`offer_left:<walk>`, gone with the walk) so a reload never asks about
 * them again. A Yes is the walk screen's ordinary find (`useExplore`'s `record`), the one Capture here makes (PO9).
 */
export function createPlaceOffer(p: Pick<Ports, 'db'>) {
  const left = async (walkId: string): Promise<Set<string>> => new Set(keysOf(await p.db.getMeta(offerLeftKey(walkId)).catch(() => null)));
  return {
    /** Undoes a tie: the place's find goes only if this moment made it; the moment stays (PO12). */
    async untie(key: string, captureId: string): Promise<void> {
      await p.db.removeFind(key, captureId);
    },
    /** The places left on a walk. */
    left,
    /** Keeps more places left on a walk, with those already kept. */
    async leave(walkId: string, keys: string[]): Promise<void> {
      const was = await left(walkId);
      for (const k of keys) was.add(k);
      await p.db.setMeta(offerLeftKey(walkId), JSON.stringify([...was]));
    },
  };
}
