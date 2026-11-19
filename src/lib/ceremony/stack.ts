// @layer core
/**
 * The stack at the edge of a replay (replay ceremony RC29-RC33; decision 0206): one entry for each moment that had a
 * picture or a video, the newest on top. It grows upward, and when one more would reach the controls at the top the
 * oldest drops off the bottom, first in first out. Its height is the one thing in the path that grows with what was
 * kept (the owner's call); it never shows a number.
 *
 * Here, the bound and where each entry stands at a time. What an entry is (which moment, layered or marked) is the
 * ceremony's to say, and how it is drawn the stage's (`components/ceremony/Stack`).
 */
import { REPLAY_RHYTHM as R } from '../motionTokens';
import { easeInOut } from './ease';
import { STACK, STAGE_BOTTOM, type StageRoom } from './room';

/** One entry on screen at a time: which moment (by the order they landed), and how it stands. */
export interface StackSlot {
  index: number;
  /** How many entries up from the lowest place it stands; under 0 while it drops off the bottom. */
  slot: number;
  /** Px above its place still to come down as it settles; a little under 0 as it passes it. */
  rise: number;
  /** Px it gives under a newer one arriving. */
  give: number;
  opacity: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * The most entries a screen holds (RC30): from above the map's credits (`STAGE_BOTTOM`) up to under the controls at
 * the top (`STACK.top`: Skip, and Next under it), each standing `STACK.pitch` over the one before. At least one.
 */
export function stackBound(room: StageRoom): number {
  const bottom = room.height - room.insets.bottom - STAGE_BOTTOM;
  return Math.max(1, Math.floor((bottom - STACK.h - (room.insets.top + STACK.top)) / STACK.pitch) + 1);
}

/** A spring coming to rest at 1, `x` ms on, passing it by `over` (a share of the way) once. */
function settle(x: number, over: number): number {
  if (x <= 0) return 0;
  const w = R.stackSpring;
  if (over <= 0.0005) return 1 - Math.exp(-w * x) * (1 + w * x);
  const l = Math.log(over);
  const z = -l / Math.sqrt(Math.PI * Math.PI + l * l);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
}

/**
 * The entries on screen at `ms` (RC29, RC30, RC32). `lands` are when each moment's entry lands, in order; `max` is the
 * screen's bound. One that has just landed comes down onto the stack and settles, passing its place by `stackOver`;
 * the ones under it give `stackGive` px. One past the bound takes the top place while the rest step down one, the
 * lowest sinking away over `stackPop`. With reduce motion (`still`) each is in its place at once.
 */
export function stackSlots(lands: number[], ms: number, max: number, still: boolean): StackSlot[] {
  let n = 0;
  while (n < lands.length && lands[n] <= ms) n++;
  if (n === 0) return [];
  // How many have dropped off: one for each landing past the bound, the newest of them part of the way.
  let popped = Math.max(0, n - max);
  if (!still) for (let i = n - 1; i >= max && ms - lands[i] < R.stackPop; i--) popped -= 1 - easeInOut(clamp01((ms - lands[i]) / R.stackPop));
  const out: StackSlot[] = [];
  for (let i = Math.max(0, Math.floor(popped)); i < n; i++) {
    const slot = Math.min(i - popped, max - 1);
    if (slot <= -1) continue;
    const x = ms - lands[i];
    let give = 0;
    if (!still) {
      for (let j = n - 1; j > i && ms - lands[j] < R.stackGiveIn + R.stackGiveFor; j--) {
        const v = (ms - lands[j] - R.stackGiveIn) / R.stackGiveFor;
        if (v > 0 && v < 1) give += R.stackGive * Math.sin(Math.PI * v);
      }
    }
    out.push({
      index: i,
      slot,
      rise: still ? 0 : R.stackDrop * (1 - settle(x, R.stackOver)),
      give,
      opacity: (still ? 1 : clamp01(x / R.stackIn)) * (slot < 0 ? 1 + slot : 1),
    });
  }
  return out;
}
