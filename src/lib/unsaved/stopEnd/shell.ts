// @layer shell
import { stopWarns, type Unsaved } from '../core';

export interface StopEndDeps {
  /** What is under way (`memoGate`): a memo recording or saving, a photo being kept. */
  gate: { underWay(): boolean; pin(): () => void };
  /** The one holder of unsaved captures (decision 0196). */
  unsaved: { heldFor(walkId: string): Unsaved[]; ended(walkId: string, only?: readonly string[]): Promise<void> };
  /** The walk's end, with the empty-walk drop (`session.endWalk`): at `endAt` when the walker chose End it (QE3). */
  endWalk(walkId: string, o: { leaves: boolean; endAt?: number }): Promise<{ dropped: boolean }>;
  /** Where the walk went quiet, when it has been quiet 30 min or more (`quietEnd.at`, decision 0272); none asks nothing. */
  quietAt?(walkId: string): Promise<number | null>;
}

/** A Stop's answer to the quiet ask (QE3, QE6): `'keep'`, today's Stop exactly; a time, End it there. */
export type QuietAnswer = 'keep' | number;

/**
 * The end both Stops share once their own waits are over (tend tabs audit 42, decision 0227): what the walk holds is
 * read, and warned of if any of it has not been (UN5); otherwise, in the same tick, anything still under way pins the
 * walk against the empty drop until it is decided, `going` lets the view say the walk is ending, the walk ends, and only
 * the held captures warned of are let go (UN8), so a save failing as the walk ends stays held for Retry.
 */
export function createStopEnd(d: StopEndDeps) {
  return async function stopEnd(
    walkId: string,
    o: { leaves: boolean; warned: readonly string[]; going?: () => void; quiet?: QuietAnswer },
  ): Promise<{ warn: Unsaved[] } | { quiet: number } | { dropped: boolean }> {
    const held = d.unsaved.heldFor(walkId);
    if (stopWarns(held.map((x) => x.id), o.warned)) return { warn: held };
    // Nothing awaited between the read and the pin: a save ending meanwhile, the quiet read's wait included, cannot slip
    // the walk into the drop (forgotten-stop audit 3).
    const release = d.gate.underWay() ? d.gate.pin() : null;
    // A walk gone quiet asks once, before anything ends (QE3, QE4); a point that cannot be read asks nothing, so a Stop
    // is never trapped by it. Answered, the Stop goes on: Keep it all as today (QE6); End it reads the point again, and a
    // capture or walking since the ask asks again with the new point, or, no longer quiet, stops as Keep it all
    // (forgotten-stop audit 5).
    let endAt: number | undefined;
    if (d.quietAt && o.quiet !== 'keep') {
      const at = await d.quietAt(walkId).catch(() => null);
      if (at != null && at !== o.quiet) {
        release?.();
        return { quiet: at };
      }
      if (at != null) endAt = at;
    }
    o.going?.();
    const { dropped } = await d.endWalk(walkId, endAt == null ? { leaves: o.leaves } : { leaves: o.leaves, endAt }).finally(() => release?.());
    // Only once the walk has ended (unsaved-captures audit 4).
    await d.unsaved.ended(walkId, held.map((x) => x.id));
    return { dropped };
  };
}
