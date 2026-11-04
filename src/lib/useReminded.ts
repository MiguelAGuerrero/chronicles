// @layer view
import { useEffect, useState } from 'react';
import { nextExpiry, remindedIds } from './discovery/recall';
import { onRecallsChanged, readRecalls } from './discovery/recallCheck';

const NONE: ReadonlySet<string> = new Set();
/** setTimeout's ceiling (about 24.8 days); a later end re-arms from there. */
const MAX_DELAY_MS = 2 ** 31 - 1;

/**
 * The ids of captures with a live reminder, for the bell on their pins (RB1,
 * RB3): read once, then again whenever a reminder is set, fired, stopped or
 * deleted (RB5), and when the next one's end passes with the map still open
 * (audit 2). One read per map, never per pin; the latest read wins.
 */
export function useReminded(): ReadonlySet<string> {
  const [ids, setIds] = useState<ReadonlySet<string>>(NONE);
  useEffect(() => {
    let alive = true;
    let seq = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const read = () => {
      const mine = ++seq;
      readRecalls().then((rs) => {
        if (!alive || mine !== seq) return;
        const now = Date.now();
        const next = remindedIds(rs, now);
        // The same set keeps its identity, so the pins don't redraw for nothing.
        setIds((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
        if (timer) clearTimeout(timer);
        const end = nextExpiry(rs, now);
        // `until` is the last live moment: re-read just after it.
        timer = end == null ? null : setTimeout(read, Math.min(end - now + 1, MAX_DELAY_MS));
      }, () => {});
    };
    read();
    const off = onRecallsChanged(read);
    return () => {
      alive = false;
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return ids;
}
