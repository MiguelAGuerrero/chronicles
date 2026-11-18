// @layer core
import { REPLAY_RHYTHM as R } from '../motionTokens';

/** The most cells a stack's grid shows at once (the owner, Nov 10): 3×3; past it, the grid scrolls. */
export const GRID_MAX = 9;

/**
 * A stack's grid in the replay (moment stacks MS17, decision 0123): the closest square layout for its photos and
 * videos, at most 3×3 at once; with more, it scrolls through the hold. 2 → 2×1, 3-4 → 2×2, 5-6 → 3×2, 7-9 → 3×3.
 */
export function gridLayout(n: number): { cols: number; rows: number; shown: number; scrolls: boolean } {
  const shown = Math.max(1, Math.min(n, GRID_MAX));
  const cols = Math.min(3, Math.ceil(Math.sqrt(shown)));
  return { cols, rows: Math.ceil(shown / cols), shown, scrolls: n > GRID_MAX };
}

/**
 * How long a grid is up (RY4): it grows, each piece swipes in a beat after the one before, then it stays `gridHold`
 * (or a muted video's kept length, if longer), a grid past nine scrolls on top, and it tucks away.
 */
export function gridDuration(n: number, longestVideoMs: number): number {
  const swipe = Math.max(0, Math.min(n, GRID_MAX) - 1) * R.gridStagger + R.bubbleIn;
  return R.grow + swipe + Math.max(R.gridHold, longestVideoMs) + (n > GRID_MAX ? R.gridScroll : 0) + R.tuck;
}
