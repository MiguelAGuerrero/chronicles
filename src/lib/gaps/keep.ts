// @layer shell
import type { Db } from '../db/types';
import type { GapDecision } from '../types';
import type { Stretch } from './infer';

/**
 * Settling gaps at a walk's end (Filling gaps, G15): the decision a card's Keep or
 * Not this way stores, every offer kept at once, and the stored note that the
 * question was asked. Takes its db as an argument, so `npm test` loads it
 * without the app's singleton.
 */

/** The decision stored for a stretch (G10). */
export function decisionOf(walkId: string, s: Stretch, state: GapDecision['state'], now: number): GapDecision {
  return { walk_id: walkId, t0: s.t0, t1: s.t1, state, path: s.path, length_m: s.lengthM, street: s.street, decided_at: now };
}

/**
 * Keeps each offer in turn (G15). A write that fails is counted, never stops the others, so the
 * caller can always snap again from what was stored (audit 2). Returns how many failed.
 */
export async function keepAll(put: (d: GapDecision) => Promise<void>, walkId: string, offers: Stretch[], now: number): Promise<number> {
  let failed = 0;
  for (const s of offers) {
    try {
      await put(decisionOf(walkId, s, 'kept', now));
    } catch {
      failed++;
    }
  }
  return failed;
}

type MetaDb = Pick<Db, 'getMeta' | 'setMeta'>;

/** The meta key noting a walk's question was asked. */
export const askedKey = (walkId: string): `gaps_asked:${string}` => `gaps_asked:${walkId}`;

/** The first replay asks once per walk, even after a reload or Back (G15, audit 1). */
export async function wasAsked(db: MetaDb, walkId: string): Promise<boolean> {
  return (await db.getMeta(askedKey(walkId)).catch(() => null)) === '1';
}

export async function markAsked(db: MetaDb, walkId: string): Promise<void> {
  await db.setMeta(askedKey(walkId), '1').catch(() => {});
}
