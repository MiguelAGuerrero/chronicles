import { useEffect, useRef, useState } from 'react';
import { msAtClock, tickClock } from '../../lib/ceremony/clock';
import type { Showing } from '../../lib/ceremony/types';

/** ~30 fps: the walker reads as a slider, not as steps. */
const FRAME_MS = 33;

type Clock = { epoch: number; ms: number; held: boolean; ended: boolean };

/**
 * The time into a ceremony (RR7). It starts from 0 at each new `epoch` (the
 * beat's start), runs while `running`, stands still while held or `paused`
 * (a viewer open over it), and calls `onEnd` once per epoch when the time is
 * up: `tickClock` decides, so a total of 0 or one that shrank ends too, and a
 * locked screen waits rather than skipping (audits 2 and 6). A telling
 * rebuilt mid-path (a moment deleted, Undo, a note edited) carries on from the
 * same time of day, so nothing ahead is skipped (audit 22).
 */
export function useCeremonyClock(o: { epoch: number; running: boolean; paused: boolean; showing: Showing | null; onEnd: () => void }) {
  const fresh = (epoch: number): Clock => ({ epoch, ms: 0, held: false, ended: false });
  const [state, setState] = useState<Clock>(() => fresh(o.epoch));
  const now = useRef<Clock>(fresh(o.epoch));
  const last = useRef(0);
  const live = useRef({ epoch: o.epoch, paused: o.paused, showing: o.showing, onEnd: o.onEnd });
  useEffect(() => {
    live.current = { epoch: o.epoch, paused: o.paused, showing: o.showing, onEnd: o.onEnd };
  });
  /** The telling the clock's time was last read against, and in which epoch. */
  const told = useRef<{ epoch: number; showing: Showing | null }>({ epoch: o.epoch, showing: o.showing });
  /** The clock as it stands, started afresh if the epoch moved on. */
  const current = (): Clock => (now.current.epoch === live.current.epoch ? now.current : fresh(live.current.epoch));
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
      let c = current();
      const { paused, showing, onEnd } = live.current;
      const was = told.current;
      if (was.epoch === c.epoch && was.showing && showing && was.showing !== showing) {
        const at = was.showing.frame(c.ms).clock;
        if (at != null) c = { ...c, ms: msAtClock(showing, at) };
      }
      told.current = { epoch: c.epoch, showing };
      const { clock, end } = tickClock(c, dt, { paused, total: showing?.total ?? 0 });
      const next = { ...c, ...clock, ended: c.ended || end };
      if (next.ms !== c.ms || next.ended !== c.ended || c !== now.current) set(next);
      if (end && !c.ended) onEnd();
    }, FRAME_MS);
    return () => clearInterval(id);
    // The interval reads the rest through refs; only starting and stopping it matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.running]);
  const shown = state.epoch === o.epoch ? state : fresh(o.epoch);
  return {
    ms: shown.ms,
    held: shown.held,
    toggleHold: () => {
      const c = current();
      set({ ...c, held: !c.held });
    },
  };
}
