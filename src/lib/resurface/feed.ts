// @layer core
import { DEFAULT_EXTRACTORS } from './extractors';
import { resurfaceOrder } from './pick';
import { deriveThreads } from './threads';
import type { MomentView, Pick, Prefs, SignalExtractor, Thread } from './types';

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
  // With the switch off there is no top card and no Another; the rail and Lately stay (MC9).
  const order = prefs.off ? [] : resurfaceOrder(moments, { now, seed, prefs, threads, extractors });
  return { moments, threads, order };
}
