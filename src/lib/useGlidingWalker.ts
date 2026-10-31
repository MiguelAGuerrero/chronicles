import { useEffect, useRef, useState } from 'react';
import { glideAngle, glideAngleTo, glideDone, glidePos, glideTo, type AngleGlide, type PosGlide } from './glide';
import type { LngLat } from './types';

export type GlideFrame = { walker: LngLat | null; heading: number | null };

/**
 * Runs the glide (glide.ts) as a render loop and reports each frame through
 * `onFrame`, outside React: no state, no re-render per frame. Frames run only
 * while a glide is moving, so a still walker costs nothing. `frameMs` caps the
 * rate (0 = every display frame).
 */
export function useGlideFrames(
  walker: LngLat | null | undefined,
  heading: number | null | undefined,
  enabled: boolean,
  onFrame: (f: GlideFrame) => void,
  frameMs = 0,
) {
  const pos = useRef<PosGlide | null>(null);
  const ang = useRef<AngleGlide | null>(null);
  const cb = useRef(onFrame);
  useEffect(() => {
    cb.current = onFrame;
  });

  useEffect(() => {
    // The replay moves the dot on its own clock, like a slider: gliding it would only lag.
    if (!enabled) {
      pos.current = null;
      ang.current = null;
      return;
    }
    const now = Date.now();
    if (!walker) pos.current = null;
    else pos.current = glideTo(pos.current, walker, now);
    if (heading == null) ang.current = null;
    else ang.current = glideAngleTo(ang.current, heading, now, pos.current?.avg ?? 1000);

    let raf: number | null = null;
    let last = 0;
    const frame = () => {
      const t = Date.now();
      const p = pos.current;
      const a = ang.current;
      const done = (!p || glideDone(p, t)) && (!a || a.dur <= 0 || t >= a.t0 + a.dur);
      if (done || t - last >= frameMs) {
        last = t;
        cb.current({ walker: p ? glidePos(p, t) : null, heading: a ? glideAngle(a, t) : null });
      }
      raf = done ? null : requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [walker, heading, enabled, frameMs]);
}

/** Phone: the glide as React state, capped at ~15 fps (the map layers redraw per frame). */
const NATIVE_FRAME_MS = 66;

export function useGlidingWalker(walker: LngLat | null | undefined, heading: number | null | undefined, enabled = true): GlideFrame {
  const [shown, setShown] = useState<GlideFrame>({ walker: walker ?? null, heading: heading ?? null });
  useGlideFrames(walker, heading, enabled, setShown, NATIVE_FRAME_MS);
  if (!enabled) return { walker: walker ?? null, heading: heading ?? null };
  // Before the first frame after a change, show the new fix rather than a stale spot.
  return { walker: walker ? (shown.walker ?? walker) : null, heading: heading == null ? null : (shown.heading ?? heading) };
}
