import { useEffect, useRef, useState } from 'react';

/** ~30 fps: the walker reads as a slider, not as steps. */
const FRAME_MS = 33;

type Clock = { epoch: number; ms: number; held: boolean };

/**
 * The time into a ceremony (RR7). It starts from 0 at each new `epoch` (the
 * beat's start), runs while `running`, stands still while held or `paused`
 * (a viewer open over it), and calls `onEnd` once on reaching `total`. A
 * frame is a function of this time alone, so holding it holds everything.
 */
export function useCeremonyClock(o: { epoch: number; running: boolean; paused: boolean; total: number; onEnd: () => void }) {
  const [state, setState] = useState<Clock>(() => ({ epoch: o.epoch, ms: 0, held: false }));
  const now = useRef<Clock>({ epoch: o.epoch, ms: 0, held: false });
  const last = useRef(0);
  const live = useRef({ epoch: o.epoch, paused: o.paused, total: o.total, onEnd: o.onEnd });
  useEffect(() => {
    live.current = { epoch: o.epoch, paused: o.paused, total: o.total, onEnd: o.onEnd };
  });
  /** The clock as it stands, started afresh if the epoch moved on. */
  const current = (): Clock => (now.current.epoch === live.current.epoch ? now.current : { epoch: live.current.epoch, ms: 0, held: false });
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
      const { paused, total, onEnd } = live.current;
      if (c.held || paused || c.ms >= total) {
        if (c !== now.current) set(c);
        return;
      }
      const next = { ...c, ms: Math.min(total, c.ms + dt) };
      set(next);
      if (next.ms >= total) onEnd();
    }, FRAME_MS);
    return () => clearInterval(id);
    // The interval reads everything else through refs.
  }, [o.running]);
  const shown = state.epoch === o.epoch ? state : { epoch: o.epoch, ms: 0, held: false };
  return {
    ms: shown.ms,
    held: shown.held,
    toggleHold: () => {
      const c = current();
      set({ ...c, held: !c.held });
    },
  };
}
