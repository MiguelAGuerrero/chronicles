import { useEffect, useRef, useState } from 'react';
import { mediaWait } from '../../lib/ceremony/media';
import type { StageCtx } from './layout';

/** Re-checked this often while a medium might need waiting for. */
const CHECK_MS = 100;

/**
 * Holds the stage's clock while a memo or video catches up with its slot
 * (audits 20, 23): `mediaWait` decides, from where the player is against
 * where the slot says it should be. Returns whether the stage is waiting for
 * it, so the medium keeps playing while the clock stands still.
 */
export function useMediaWait(
  key: string,
  ctx: StageCtx,
  o: { inSlot: boolean; slotOver: boolean; started: boolean; ended: boolean; positionMs: () => number; planMs: number; lenMs: number; stopped: boolean },
): boolean {
  const [waiting, setWaiting] = useState(false);
  const live = useRef(o);
  useEffect(() => {
    live.current = o;
  });
  const active = o.inSlot || o.slotOver;
  useEffect(() => {
    if (!active) return;
    let waited = 0;
    let stalled = 0;
    let last = Date.now();
    let lastPos = -1;
    const id = setInterval(() => {
      const t = Date.now();
      const c = live.current;
      const pos = c.positionMs();
      const w = mediaWait({ inSlot: c.inSlot, slotOver: c.slotOver, started: c.started, ended: c.ended, behindMs: Math.max(0, c.planMs - pos), waitedMs: waited, lenMs: c.lenMs, stalledMs: stalled });
      // Held or under a viewer, the wait doesn't count against it, nor does standing still.
      if (w && !c.stopped) {
        waited += t - last;
        stalled = c.started && pos === lastPos ? stalled + (t - last) : 0;
      }
      lastPos = pos;
      last = t;
      setWaiting(w);
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [active]);
  const on = waiting && active;
  const { wait } = ctx;
  useEffect(() => {
    wait(key, on);
  }, [wait, key, on]);
  useEffect(() => () => wait(key, false), [wait, key]);
  return on;
}
