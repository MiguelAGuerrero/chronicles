import { distanceM } from './geo';
import type { LngLat } from './types';

// The walker's dot glides from one fix to the next instead of jumping. Display
// only: stored traces stay raw. Pure, on a caller-supplied clock (ms).
//
// Linear motion over about the fix interval, restarting from the dot's
// displayed spot when a fix arrives early (so it never jumps or speeds up).
// The dot runs about one fix behind reality; there is no prediction, so it
// can't overshoot a stop or a turn.

export const GLIDE = {
  /** Used until two fixes have shown the real interval. */
  defaultMs: 1000,
  minMs: 400,
  maxMs: 2500,
  /** A jump farther than this (a resume, GPS returning) snaps. */
  snapM: 150,
} as const;

export type PosGlide = {
  from: LngLat;
  to: LngLat;
  t0: number;
  /** Glide length; 0 when the dot snapped. */
  dur: number;
  /** Smoothed fix interval. */
  avg: number;
  fixAt: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The dot's spot at `now`. */
export function glidePos(g: PosGlide, now: number): LngLat {
  if (g.dur <= 0 || now >= g.t0 + g.dur) return g.to;
  const k = Math.max(0, now - g.t0) / g.dur;
  return [g.from[0] + (g.to[0] - g.from[0]) * k, g.from[1] + (g.to[1] - g.from[1]) * k];
}

export function glideDone(g: PosGlide, now: number): boolean {
  return g.dur <= 0 || now >= g.t0 + g.dur;
}

/** A new fix: glide there from wherever the dot is showing now. */
export function glideTo(g: PosGlide | null, target: LngLat, now: number): PosGlide {
  if (!g) return { from: target, to: target, t0: now, dur: 0, avg: GLIDE.defaultMs, fixAt: now };
  const here = glidePos(g, now);
  const avg = clamp(0.5 * g.avg + 0.5 * clamp(now - g.fixAt, GLIDE.minMs, GLIDE.maxMs), GLIDE.minMs, GLIDE.maxMs);
  if (distanceM(here, target) > GLIDE.snapM) return { from: target, to: target, t0: now, dur: 0, avg, fixAt: now };
  return { from: here, to: target, t0: now, dur: avg, avg, fixAt: now };
}

export type AngleGlide = { from: number; to: number; t0: number; dur: number };

/** The heading at `now`, in 0-360. */
export function glideAngle(g: AngleGlide, now: number): number {
  const k = g.dur <= 0 ? 1 : clamp((now - g.t0) / g.dur, 0, 1);
  return (((g.from + (g.to - g.from) * k) % 360) + 360) % 360;
}

/** A new heading: turn the short way round from what is showing now. */
export function glideAngleTo(g: AngleGlide | null, target: number, now: number, dur: number): AngleGlide {
  if (!g) return { from: target, to: target, t0: now, dur: 0 };
  const from = glideAngle(g, now);
  const delta = ((((target - from) % 360) + 540) % 360) - 180;
  return { from, to: from + delta, t0: now, dur };
}
