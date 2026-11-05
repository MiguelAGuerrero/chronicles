// @layer core
import { DEFAULT_EXTRACTORS } from './extractors';
import { resurfaceOrder } from './pick';
import { deriveThreads } from './threads';
import type { MomentView, Pick, Prefs, SignalExtractor, Thread } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
/** Lately shows this many at first, and this many more as the end is reached (RM17). */
export const LATELY_PAGE = 20;

export interface Composed {
  /** What can be shown: the moments left after deletes (RM19). */
  moments: MomentView[];
  threads: Thread[];
  /** The resurfaced card and the ones Another steps through. */
  order: Pick[];
}

/**
 * Everything Memories shows, from the moments, the user's choices and the
 * ids hidden by a delete (a moment's, or its walk's: RM19). Pure: the clock
 * and the seed are arguments. Deleting runs this again, so a thread that
 * falls below three moments leaves the rail at once.
 */
export function compose(
  all: MomentView[],
  prefs: Prefs,
  hidden: ReadonlySet<string>,
  now: number,
  seed: string,
  extractors: SignalExtractor[] = DEFAULT_EXTRACTORS,
): Composed {
  const moments = all.filter((m) => !hidden.has(m.id) && !(m.walkId && hidden.has(m.walkId)));
  const threads = deriveThreads(moments, extractors, prefs, now);
  const order = resurfaceOrder(moments, { now, seed, prefs, threads, extractors });
  return { moments, threads, order };
}

/**
 * Lately (RM17): what was kept in the last day leads, newest first, so a walk
 * just finished is at the top (RM3, the owner's call, Nov 5). After that, week
 * by week, newest first; within a week the moments that belong to a thread come
 * before the rest. That is the only ranking. `limit` grows by a
 * page as the end is reached.
 */
export function lately(moments: MomentView[], threads: Thread[], now: number, limit: number): { items: MomentView[]; more: boolean } {
  const inThread = new Set<string>();
  for (const t of threads) for (const id of t.momentIds) inThread.add(id);
  const fresh = (m: MomentView) => now - m.t < DAY_MS;
  const week = (m: MomentView) => Math.floor(Math.max(0, now - m.t) / WEEK_MS);
  const sorted = [...moments].sort((a, b) => Number(fresh(b)) - Number(fresh(a)) || (fresh(a) ? b.t - a.t : 0) || week(a) - week(b) || Number(inThread.has(b.id)) - Number(inThread.has(a.id)) || b.t - a.t || (a.id < b.id ? -1 : 1));
  return { items: sorted.slice(0, limit), more: sorted.length > limit };
}
