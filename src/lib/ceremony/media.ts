// @layer core
import { REPLAY_RHYTHM as R } from '../motionTokens';

/**
 * Whether the stage should wait for a memo or video (replay-rhythm audits 20,
 * 23): the plan gives a medium a slot as long as its stored length, but the
 * player may start late (loading, sound refused then retried muted, a tap
 * from the viewer) or run longer than stored. While a started medium is
 * behind its slot, or not finished when the slot ends, the stage waits, up to
 * its own length (at least the camera's 30 s cap); one that never starts is
 * waited for briefly, then left to its play button.
 */
export function mediaWait(o: {
  /** The plan says it is playing now. */
  inSlot: boolean;
  /** Its slot is over (or the viewer started it by hand and it plays on). */
  slotOver: boolean;
  started: boolean;
  ended: boolean;
  /** How far the player is behind where the slot says it should be. */
  behindMs: number;
  /** How long the stage has already waited for it. */
  waitedMs: number;
  lenMs: number;
  /** How long its position has not moved while it should have (a file that won't play). */
  stalledMs?: number;
}): boolean {
  if (o.ended || (!o.inSlot && !o.slotOver)) return false;
  if ((o.stalledMs ?? 0) >= R.mediaStartWait) return false;
  if (!o.started) return o.waitedMs < R.mediaStartWait;
  if (o.waitedMs >= Math.max(o.lenMs, R.mediaMaxWait)) return false;
  return o.slotOver || o.behindMs > R.mediaLag;
}
