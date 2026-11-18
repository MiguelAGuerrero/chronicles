import { useEffect, useRef, useState } from 'react';
import { nextStop, reanchor, seekClock, tickClock } from '../../lib/ceremony/clock';
import type { Jump, Showing } from '../../lib/ceremony/types';

/** ~30 fps: the walker reads as a slider, not as steps. */
const FRAME_MS = 33;

/** The clock's time, read against the telling it was last read with. */
type Clock = { epoch: number; ms: number; held: boolean; ended: boolean; showing: Showing | null; /** The moment the last press of Next went to, and the press itself (RY13, RY21). */ aimed: number | null; jump: Jump | null };

/**
 * The time into a ceremony (RR7). It starts from 0 at each new `epoch` (the
 * beat's start), runs while `running`, stands still while held or `paused`
 * (a viewer open over it, a medium catching up), and calls `onEnd` once per
 * epoch when the time is up: `tickClock` decides, so a total of 0 or one that
 * shrank ends too, and a locked screen waits rather than skipping (audits 2,
 * 6). A telling rebuilt mid-path (a moment deleted, Undo, a note edited)
 * takes up from the same place, `reanchor`, already in the render that first
 * shows it, so no card unmounts for a frame (audits 22, 31, 33). `next` goes to
 * the next moment (replay pace RY13-RY17): held stays held, a wait never stops
 * it, and the frame is given the jump so it can say what lay between (RY21).
 */
export function useCeremonyClock(o: { epoch: number; running: boolean; paused: boolean; showing: Showing | null; onEnd: () => void }) {
  const fresh = (epoch: number, showing: Showing | null): Clock => ({ epoch, ms: 0, held: false, ended: false, showing, aimed: null, jump: null });
  /** The clock read against `showing`: re-anchored if the telling was rebuilt, afresh if the epoch moved on. */
  const against = (c: Clock, epoch: number, showing: Showing | null): Clock => {
    if (c.epoch !== epoch) return fresh(epoch, showing);
    // A rebuilt telling has other times: the last press no longer says anything of it.
    if (c.showing && showing && c.showing !== showing) return { ...c, ms: reanchor(c.showing, showing, c.ms), showing, aimed: null, jump: null };
    return c.showing === showing ? c : { ...c, showing };
  };
  const [state, setState] = useState<Clock>(() => fresh(o.epoch, o.showing));
  const now = useRef<Clock>(fresh(o.epoch, o.showing));
  const last = useRef(0);
  const live = useRef({ epoch: o.epoch, paused: o.paused, showing: o.showing, onEnd: o.onEnd });
  useEffect(() => {
    live.current = { epoch: o.epoch, paused: o.paused, showing: o.showing, onEnd: o.onEnd };
  });
  const current = (): Clock => against(now.current, live.current.epoch, live.current.showing);
  const set = (next: Clock) => {
    now.current = next;
    setState(next);
  };
  useEffect(() => {
    if (!o.running) return;
    last.current = Date.now();
    const id = setInterval(() => {
      const t = Date.now();
      const dt = t - last.current;
      last.current = t;
      const c = current();
      const { paused, showing, onEnd } = live.current;
      const { clock, end } = tickClock(c, dt, { paused, total: showing?.total ?? 0 });
      const next = { ...c, ...clock, ended: c.ended || end };
      if (next.ms !== c.ms || next.ended !== c.ended || c !== now.current) set(next);
      if (end && !c.ended) onEnd();
    }, FRAME_MS);
    return () => clearInterval(id);
    // The interval reads the rest through refs; only starting and stopping it matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.running]);
  const shown = against(state, o.epoch, o.showing);
  return {
    ms: shown.ms,
    held: shown.held,
    /** The last press of Next, for the frame (RY21). */
    jump: shown.jump,
    /** A moment lies ahead (RY17). */
    canNext: !shown.ended && !!shown.showing && nextStop(shown.showing.stops, shown.ms, shown.aimed) != null,
    toggleHold: () => {
      const c = current();
      set({ ...c, held: !c.held });
    },
    next: () => {
      const c = current();
      const to = c.showing && !c.ended ? nextStop(c.showing.stops, c.ms, c.aimed) : null;
      if (to) set({ ...c, ...seekClock(c, to.ms), aimed: to.t0, jump: { from: c.ms, at: to.ms } });
    },
  };
}
