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
 * How many pieces share the row of the `index`th of `n` (`replay-ceremony ui 4`): the grid's columns, but in a last
 * row with fewer pieces than columns, where those pieces span the row between them, so a grid of three shows no empty
 * cell. A grid past nine scrolls three across and its own last row fills the same way.
 */
export function rowShare(n: number, index: number): number {
  const { cols } = gridLayout(n);
  const last = n % cols;
  return last > 0 && index >= n - last ? last : cols;
}

/**
 * How long a grid's pictures are shown once their card has grown (RY4): each piece swipes in a beat after the one
 * before, then they stay `gridHold`, and a grid past nine scrolls on top. A moment's videos are not in its cells
 * (replay ceremony RC37): they play in turn after this.
 */
export function gridShown(n: number): number {
  if (n <= 0) return 0;
  const swipe = Math.max(0, Math.min(n, GRID_MAX) - 1) * R.gridStagger + R.bubbleIn;
  return swipe + R.gridHold + (n > GRID_MAX ? R.gridScroll : 0);
}

/** How long a grid is up (RY4): it grows, its pictures are shown, and it shrinks away. */
export const gridDuration = (n: number): number => R.grow + gridShown(n) + R.tuck;
