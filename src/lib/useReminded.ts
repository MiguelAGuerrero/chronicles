import { useEffect, useState } from 'react';
import { remindedIds } from './discovery/recall';
import { listRecalls, onRecallsChanged } from './discovery/recallCheck';

const NONE: ReadonlySet<string> = new Set();

/**
 * The ids of captures with a live reminder, for the bell on their pins (RB1,
 * RB3): read once, then again whenever a reminder is set, fired, stopped or
 * deleted (RB5). One read per map, never per pin.
 */
export function useReminded(): ReadonlySet<string> {
  const [ids, setIds] = useState<ReadonlySet<string>>(NONE);
  useEffect(() => {
    let alive = true;
    const read = () => {
      listRecalls().then((rs) => {
        if (!alive) return;
        const next = remindedIds(rs, Date.now());
        // The same set keeps its identity, so the pins don't redraw for nothing.
        setIds((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
      }, () => {});
    };
    read();
    const off = onRecallsChanged(read);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return ids;
}
