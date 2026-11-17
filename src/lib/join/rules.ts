// @layer core
import { dayKey } from '../days';
import { distanceM } from '../geo';
import type { Moment } from '../types';

/**
 * Stack with previous (decision 0196): which moment is "previous" for an entry, and whether the entry may be joined
 * into it. Pure: the caller reads what points at the entry (`refs`) and what was kept in this sitting.
 */

/** The previous moment must be this near the entry's own place, so the stack's one place is true of every piece (SW6). */
export const JOIN_NEAR_M = 100;

/** Whatever else points at a moment by its id; a join would orphan any of them (SW8). */
export type Refs = Partial<Record<'thread' | 'link' | 'reminder' | 'find' | 'reaction' | 'hidden' | 'pick' | 'mention', boolean>>;

const placed = (m: Pick<Moment, 'lat' | 'lon'>): m is { lat: number; lon: number } => m.lat != null && m.lon != null;

/**
 * The latest moment made before the entry on the same local day, on the same walk or both off any walk, and within
 * `JOIN_NEAR_M` of the entry's own place (a moment or entry with no place counts as near); else null (SW6).
 */
export function previousFor(moments: readonly Moment[], entry: Moment): Moment | null {
  const day = dayKey(entry.t);
  let best: Moment | null = null;
  for (const m of moments) {
    if (m.id === entry.id || m.t >= entry.t || dayKey(m.t) !== day) continue;
    if ((m.walk_id ?? null) !== (entry.walk_id ?? null)) continue;
    if (placed(m) && placed(entry) && distanceM([m.lon, m.lat], [entry.lon, entry.lat]) > JOIN_NEAR_M) continue;
    if (!best || m.t > best.t) best = m;
  }
  return best;
}

/** Whether the entry may be joined: the last one kept in this sitting, not being written, with nothing pointing at it (SW8). */
export function joinable(entry: Moment, ctx: { refs: Refs; lastKept: string | null; writing: string | null }): boolean {
  if (ctx.lastKept !== entry.id || ctx.writing === entry.id) return false;
  return !Object.values(ctx.refs).some(Boolean);
}
