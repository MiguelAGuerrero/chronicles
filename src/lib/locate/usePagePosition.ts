// @layer view
import { useEffect, useState } from 'react';
import { getLastFix } from '../lastFix';
import { locateOnce } from '.';
import { pagePosition, type PagePosition } from './pagePosition';

/**
 * A planning page's own position (fix outing-current-position, decision 0273): one fresh fix read as the page opens, through the
 * app's one-fix path (foreground permission only; its watch is cleared as the fix comes or after ten seconds), never kept up to
 * date after. Each opening reads again. Nothing is written back: the fix stays the page's, so Explore's own fix and its
 * "You're here" are untouched.
 */
export function usePagePosition(): PagePosition {
  const [pos, setPos] = useState<PagePosition>({ state: 'finding' });
  useEffect(() => {
    let live = true;
    locateOnce(undefined, { fresh: true })
      .catch(() => ({ at: null, reason: 'unavailable' as const }))
      .then((r) => {
        if (live) setPos(pagePosition(r, getLastFix(), Date.now()));
      });
    return () => {
      live = false;
    };
  }, []);
  return pos;
}
