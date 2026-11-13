// @layer view
import { useEffect } from 'react';
import type { Faced } from '../moment';
import { shownStill, wantsThumb } from '../thumbPlan';
import { useStore } from '../useStore';
import { thumbs } from './index';

/**
 * A preview's piece with the still it should show (video thumbnails VS2, VS3; the audit's 2-5, 9): the row's own, or
 * one the thumbs shell made or replaced since the row was read (`shownStill`). With none, it asks once (`ask: false`
 * for a map pin and the replay's pile, which make none themselves, VS2).
 */
export function useStill<T extends Faced>(c: T, opts: { ask?: boolean } = {}): T {
  const made = useStore(thumbs.store, (s) => s.made[c.piece_id]);
  const ref = shownStill(c.thumb_path, made);
  const row = ref === (c.thumb_path ?? null) ? c : { ...c, thumb_path: ref };
  const wants = opts.ask !== false && wantsThumb(row);
  useEffect(() => {
    if (wants) void thumbs.ask(c.id, c.piece_id);
  }, [wants, c.id, c.piece_id]);
  return row;
}
