import { useEffect, useRef, useState } from 'react';
import { glideAngle, glideAngleTo, glideDone, glidePos, glideTo, type AngleGlide, type PosGlide } from './glide';
import type { DotSource } from './liveDot';
import type { LngLat } from './types';

export type GlideFrame = { walker: LngLat | null; heading: number | null };

/**
 * Runs the glide (glide.ts) as a render loop and reports each frame through
 * `onFrame`, outside React: no state, no re-render per frame. Frames run only
 * while a glide is moving, so a still walker costs nothing. `frameMs` caps the
 * rate (0 = every display frame).
 *
 * With a `source` (the live dot, Nov 1), the glide follows it fix by fix,
 * toward where the walker will be by the next fix (`lead`), and the
 * `walker`/`heading` props only stand in until it has a fix.
 */
export function useGlideFrames(
  walker: LngLat | null | undefined,
  heading: number | null | undefined,
  enabled: boolean,
  onFrame: (f: GlideFrame) => void,
  frameMs = 0,
  source?: DotSource | null,
) {
  const pos = useRef<PosGlide | null>(null);
  const ang = useRef<AngleGlide | null>(null);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const cb = useRef(onFrame);
  const frameMsRef = useRef(frameMs);
  useEffect(() => {
    cb.current = onFrame;
    frameMsRef.current = frameMs;
  });

  // Retargets the glide and makes sure the loop runs; the loop stops itself once still.
  const retarget = useRef((to: LngLat | null, toHeading: number | null) => {
    const now = Date.now();
    pos.current = to ? glideTo(pos.current, to, now) : null;
    ang.current = toHeading == null ? null : glideAngleTo(ang.current, toHeading, now, pos.current?.avg ?? 1000);
    if (raf.current != null) return;
    const frame = () => {
      const t = Date.now();
      const p = pos.current;
      const a = ang.current;
      const done = (!p || glideDone(p, t)) && (!a || a.dur <= 0 || t >= a.t0 + a.dur);
      if (done || t - last.current >= frameMsRef.current) {
        last.current = t;
        cb.current({ walker: p ? glidePos(p, t) : null, heading: a ? glideAngle(a, t) : null });
      }
      raf.current = done ? null : requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  });

  const stop = useRef(() => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
  });

  // The props: on their own, or until the source has its first fix.
  useEffect(() => {
    // The replay moves the dot on its own clock, like a slider: gliding it would only lag.
    if (!enabled) {
      stop.current();
      pos.current = null;
      ang.current = null;
      return;
    }
    if (source?.get()) return;
    retarget.current(walker ?? null, heading ?? null);
  }, [walker, heading, enabled, source]);

  // The live dot: every fix, as it comes.
  useEffect(() => {
    if (!enabled || !source) return;
    const now = source.get();
    if (now) retarget.current(now.lead, now.heading);
    return source.subscribe((s) => retarget.current(s.lead, s.heading));
  }, [enabled, source]);

  useEffect(() => {
    const halt = stop.current;
    return halt;
  }, []);
}

/** Phone: the glide as React state, capped at ~15 fps (the map layers redraw per frame). */
const NATIVE_FRAME_MS = 66;

export function useGlidingWalker(walker: LngLat | null | undefined, heading: number | null | undefined, enabled = true, source?: DotSource | null): GlideFrame {
  const [shown, setShown] = useState<GlideFrame>({ walker: walker ?? null, heading: heading ?? null });
  useGlideFrames(walker, heading, enabled, setShown, NATIVE_FRAME_MS, source);
  if (!enabled) return { walker: walker ?? null, heading: heading ?? null };
  // Before the first frame after a change, show the new fix rather than a stale spot.
  return { walker: walker ? (shown.walker ?? walker) : null, heading: heading == null && !source ? null : (shown.heading ?? heading ?? null) };
}
