// @layer view
// The long press's hint on Explore (out of explore.tsx, a file over the size limit; decision 0178): shown once,
// marked seen after HINT_MS on screen or at the first long press, used or not (explore-carousel audit 10). The
// flag is the app's own bookkeeping, so a failed write is recorded as cache work (EH9).
import { useEffect, useRef, useState } from 'react';
import { caught } from '../diagnostics/sink';
import type { Db } from '../db/types';

const PRESS_HINT_KEY = 'atlas_press_seen';
const HINT_MS = 5000;

/** `showing`: nothing else holds the hint's row. The meta methods come from the screen, which may hold the db. */
export function usePressHint(meta: Pick<Db, 'getMeta' | 'setMeta'>, showing: boolean) {
  const [seen, setSeen] = useState(true);
  const shown = !seen && showing;
  const markSeen = () => {
    setSeen(true);
    meta.setMeta(PRESS_HINT_KEY, '1').catch(caught('cache', 'lib/atlas/usePressHint · markSeen'));
  };
  const markRef = useRef(markSeen);
  useEffect(() => {
    markRef.current = markSeen;
  });
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => markRef.current(), HINT_MS);
    return () => clearTimeout(t);
  }, [shown]);
  useEffect(() => {
    let live = true;
    meta.getMeta(PRESS_HINT_KEY).then((v) => live && setSeen(v === '1'), caught('cache', 'lib/atlas/usePressHint · read'));
    return () => {
      live = false;
    };
  }, [meta]);
  return { shown, seen, markSeen };
}
