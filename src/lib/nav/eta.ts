import { formatDuration } from '../format';

/**
 * Time left while navigating (quality of life, round 2: QL17, QL18). Pure:
 * the walk screen supplies the walked metres and the moving time (elapsed
 * minus pauses), and the bar and the announcements say the result.
 */

/** The pace assumed until this walk has shown its own. */
export const DEFAULT_PACE_MPS = 1.3;
/** The walk's own pace counts once this much was walked, over this much moving time. */
export const PACE_MIN_M = 100;
export const PACE_MIN_MS = 60_000;
/** A pace outside this range (a long stay, a ride) is held to it. */
export const PACE_CLAMP: readonly [number, number] = [0.7, 2.0];

/** The walk's pace in m/s: walked metres over moving time once both are enough, clamped; else the default. */
export function paceMps(walkedM: number, movingMs: number): number {
  if (walkedM < PACE_MIN_M || movingMs < PACE_MIN_MS) return DEFAULT_PACE_MPS;
  const pace = walkedM / (movingMs / 1000);
  return Math.min(PACE_CLAMP[1], Math.max(PACE_CLAMP[0], pace));
}

/** Milliseconds to walk `leftM` at `pace` m/s. */
export function timeAtPaceMs(leftM: number, pace: number): number {
  if (!(leftM > 0)) return 0;
  return (leftM / pace) * 1000;
}

/** Milliseconds to walk `leftM` at this walk's pace. */
export function timeLeftMs(leftM: number, walkedM: number, movingMs: number): number {
  return timeAtPaceMs(leftM, paceMps(walkedM, movingMs));
}

/** "< 1 min" under a minute, else "6 min" or "1 h 05 min". */
export function formatTimeLeft(ms: number): string {
  return ms < 60_000 ? '< 1 min' : formatDuration(ms);
}

/** The same in words: "under a minute", "6 minutes", "1 hour 5 minutes". */
export function spokenTimeLeft(ms: number): string {
  if (ms < 60_000) return 'under a minute';
  const min = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ');
}

/** For a sentence: "about 6 minutes", or "under a minute" (never "about under a minute"). */
export function aboutTimeLeft(ms: number): string {
  return ms < 60_000 ? spokenTimeLeft(ms) : `about ${spokenTimeLeft(ms)}`;
}
