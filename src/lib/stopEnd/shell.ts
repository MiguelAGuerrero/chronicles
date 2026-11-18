// @layer shell
import { stopWarns, type Unsaved } from '../unsaved/core';

export interface StopEndDeps {
  /** What is under way (`memoGate`): a memo recording or saving, a photo being kept. */
  gate: { underWay(): boolean; pin(): () => void };
  /** The one holder of unsaved captures (decision 0196). */
  unsaved: { heldFor(walkId: string): Unsaved[]; ended(walkId: string, only?: readonly string[]): Promise<void> };
  /** The walk's end, with the empty-walk drop (`session.endWalk`). */
  endWalk(walkId: string, o: { leaves: boolean }): Promise<{ dropped: boolean }>;
}

/**
 * The end both Stops share once their own waits are over (tend tabs audit 42, decision 0227): what the walk holds is
 * read, and warned of if any of it has not been (UN5); otherwise, in the same tick, anything still under way pins the
 * walk against the empty drop until it is decided, `going` lets the view say the walk is ending, the walk ends, and only
 * the held captures warned of are let go (UN8), so a save failing as the walk ends stays held for Retry.
 */
export function createStopEnd(d: StopEndDeps) {
  return async function stopEnd(
    walkId: string,
    o: { leaves: boolean; warned: readonly string[]; going?: () => void },
  ): Promise<{ warn: Unsaved[] } | { dropped: boolean }> {
    const held = d.unsaved.heldFor(walkId);
    if (stopWarns(held.map((x) => x.id), o.warned)) return { warn: held };
    // Nothing awaited between the read and the pin: a save ending meanwhile cannot slip the walk into the drop.
    const release = d.gate.underWay() ? d.gate.pin() : null;
    o.going?.();
    const { dropped } = await d.endWalk(walkId, { leaves: o.leaves }).finally(() => release?.());
    // Only once the walk has ended (unsaved-captures audit 4).
    await d.unsaved.ended(walkId, held.map((x) => x.id));
    return { dropped };
  };
}
