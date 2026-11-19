import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { frameMsFor, freshLoop, holdLoop, loopAgainst, loopCanNext, nextLoop, stepLoop, type LoopState } from '../../lib/ceremony/clock';
import { createStageLive, type StageLive } from '../../lib/ceremony/live';
import { createMeter, meterOn, type Meter } from '../../lib/ceremony/meter';
import { revealOf, runLengths } from '../../lib/ceremony/reveal';
import type { Jump, Showing, Story } from '../../lib/ceremony/types';
import { REPLAY_ENGINE } from '../../lib/motionTokens';
import { perfCount } from '../../lib/perfCount';
import type { LngLat } from '../../lib/types';
import type { WalkMapHandle } from '../map/types';

/** What the screen itself shows of the loop: it renders when one of these changes, and at no other time. */
type Shown = { epoch: number; held: boolean; canNext: boolean; pinsKey: string; pins: string[] };
const NO_PINS: string[] = [];

/**
 * The time into a ceremony, kept by one frame loop outside the screen's rendering (replay ceremony RC2, RC5-RC8;
 * decision 0206). Each display frame the loop asks `stepLoop` (core) for the time: it starts from 0 at each new `epoch`
 * (the beat's start), runs while `running`, stands still while held or `paused` (a viewer open over it, a medium
 * catching up), moves by the time that really passed, a quarter second at most, and calls `onEnd` once per epoch when
 * the time is up. A time that moved is handed to `onFrame`, which draws it (the map, the stage) and answers with the
 * pins the map shows then. The screen renders only when those pins change, Next comes or goes, or Hold is pressed.
 *
 * A telling rebuilt mid-path (a moment deleted, Undo, a note edited) takes up from the same place (`loopAgainst`),
 * drawn before the render that brought it is painted, so no card unmounts for a frame (audits 22, 31, 33); so is a
 * beat's first frame. `next` goes to the next moment (RY13-RY17): held stays held, a wait never stops it, and the
 * frame is given the jump so it can say what lay between (RY21).
 */
export function useCeremonyLoop(o: {
  epoch: number;
  running: boolean;
  paused: boolean;
  showing: Showing | null;
  /** The least time between two frames drawn (RC6): 0 is every display frame. */
  frameMs: number;
  onEnd: () => void;
  onFrame: (showing: Showing, ms: number, jump: Jump | null) => string[];
  /** Told of every frame the display offers, when the frames are being counted (`lib/ceremony/meter`). */
  meter?: Meter | null;
}) {
  const [shown, setShown] = useState<Shown>(() => ({ epoch: o.epoch, held: false, canNext: false, pinsKey: '', pins: NO_PINS }));
  const loop = useRef<LoopState | null>(null);
  const seen = useRef<Shown>(shown);
  /** What was last drawn, and the pins it left on the map. */
  const drawn = useRef<{ ms: number; showing: Showing; jump: Jump | null; pins: string[]; pinsKey: string } | null>(null);
  const live = useRef(o);
  // Before paint, and before the effect below draws: a handler or a frame never reads the render before.
  useLayoutEffect(() => {
    live.current = o;
  });
  const current = (): LoopState => loopAgainst(loop.current ?? freshLoop(live.current.epoch, live.current.showing), live.current.epoch, live.current.showing);
  /** Draws the loop's time if it moved (or its telling, or the press it carries). */
  const draw = (c: LoopState) => {
    loop.current = c;
    const d = drawn.current;
    if (!c.showing || (d && d.ms === c.ms && d.showing === c.showing && d.jump === c.jump)) return;
    // Counted for the e2e and the harness (only when measuring).
    perfCount('replay:frame');
    const pins = live.current.onFrame(c.showing, c.ms, c.jump);
    drawn.current = { ms: c.ms, showing: c.showing, jump: c.jump, pins, pinsKey: pins.join('\n') };
  };
  /** Draws, then renders the screen if what it shows itself changed. */
  const show = (c: LoopState) => {
    draw(c);
    const pins = drawn.current?.pins ?? NO_PINS;
    const pinsKey = drawn.current?.pinsKey ?? '';
    const canNext = loopCanNext(c);
    const was = seen.current;
    if (was.epoch === c.epoch && was.held === c.held && was.canNext === canNext && was.pinsKey === pinsKey) return;
    seen.current = { epoch: c.epoch, held: c.held, canNext, pinsKey, pins: pinsKey === was.pinsKey ? was.pins : pins };
    setShown(seen.current);
  };
  // A beat's first frame, and a rebuilt telling's, drawn before the render that brought them is painted.
  useLayoutEffect(() => {
    if (o.running) draw(current());
    // draw and current read the rest through refs.
  }, [o.running, o.epoch, o.showing]);
  useEffect(() => {
    if (!o.running) return;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const { paused, showing, onEnd, frameMs, meter } = live.current;
      const c = current();
      const r = stepLoop(c, now, { paused, total: showing?.total ?? 0, frameMs });
      // Sooner than the ceiling allows after the last frame, and nothing else changed: not taken.
      if (r.state === c && c === loop.current) {
        meter?.note(now, false, 0);
        return;
      }
      if (meter) {
        // Counted only when asked (the preview address): how long drawing this frame took, the map's own draw included.
        const before = performance.now();
        const was = drawn.current;
        show(r.state);
        meter.note(now, drawn.current !== was, performance.now() - before);
      } else show(r.state);
      if (r.end) onEnd();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      drawn.current = null;
    };
    // The loop reads the rest through refs; only starting and stopping it matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.running]);
  // A beat begun again (Watch again) is not held and shows no pin until its first frame says so.
  const fresh = shown.epoch !== o.epoch;
  return {
    held: fresh ? false : shown.held,
    /** A moment lies ahead (RY17). */
    canNext: fresh ? false : shown.canNext,
    /** The captures whose pins are on the map, by id, as of the screen's last render. */
    pins: fresh ? NO_PINS : shown.pins,
    toggleHold: () => show(holdLoop(current())),
    next: () => show(nextLoop(current())),
  };
}

/**
 * A replay's path, driven: the loop above, drawing each frame on the map (the walker, the camera, how much of the line
 * shows: `WalkMapHandle.replayFrame`) and on the stage (`StageLive`), with no render of the screen that hosts them. Both
 * replays use it (RC9); neither imports a ceremony. `fps` is the link's own ceiling on frames a second, if it asks one;
 * `meter` the frames it really draws, counted for a readout at the preview address.
 */
export function useReplay(o: {
  epoch: number;
  telling: boolean;
  paused: boolean;
  story: Story | null;
  showing: Showing | null;
  map: RefObject<WalkMapHandle | null>;
  fps?: string;
  /** The link's own word on the frame readout (`meter=1`); it shows at the preview address without one. */
  meter?: string;
  onEnd: () => void;
}) {
  const [live] = useState<StageLive>(createStageLive);
  const counted = meterOn(process.env.EXPO_BASE_URL ?? '', o.meter);
  const [meter] = useState<Meter>(createMeter);
  // Each run's lengths, measured once and kept by the run itself: the reveal is asked every frame (performance: a run
  // of a long walk is thousands of points).
  const [lengths] = useState(() => {
    const kept = new WeakMap<LngLat[], Float64Array>();
    return (run: LngLat[]) => {
      let cum = kept.get(run);
      if (!cum) kept.set(run, (cum = runLengths(run)));
      return cum;
    };
  });
  const { story, map } = o;
  const play = useCeremonyLoop({
    epoch: o.epoch,
    running: o.telling,
    paused: o.paused,
    showing: o.showing,
    frameMs: frameMsFor(REPLAY_ENGINE.frameMs, o.fps),
    onEnd: o.onEnd,
    meter: counted ? meter : null,
    onFrame: (showing, ms, jump) => {
      const f = showing.frame(ms, jump);
      if (story) map.current?.replayFrame({ ms, walker: f.walker, camera: f.camera, hops: f.hops, ...revealOf(story, f.drawn, lengths) });
      live.set(f, showing);
      return f.pins;
    },
  });
  // The path over (the card, Skip, a screen reader's steps): the walker and the stage go.
  const telling = o.telling;
  useEffect(() => {
    if (telling) return;
    map.current?.replayFrame(null);
    live.set(null);
  }, [telling, live, map]);
  return { ...play, live, meter: counted ? meter : null };
}
