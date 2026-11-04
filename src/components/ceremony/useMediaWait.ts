import { useEffect, useRef, useState } from 'react';
import { trackWait, type WaitBook } from '../../lib/ceremony/media';
import type { StageCtx } from './layout';

/** Re-checked every frame while a medium might need waiting for, so a slot's end never runs on a beat (audit 34). */
const CHECK_MS = 33;

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
    // The bookkeeping is `trackWait` (core): how long it has been waited for, and stood still (audit 32).
    let book: WaitBook = { waited: 0, stalled: 0, lastPos: -1, last: Date.now() };
    const id = setInterval(() => {
      const c = live.current;
      const r = trackWait(book, { ...c, t: Date.now(), pos: c.positionMs() });
      book = r.book;
      setWaiting(r.wait);
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
