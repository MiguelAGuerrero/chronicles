// @layer core
import type { ReadTrace } from '../rides';

/** Test-first stub (empty-walk EW2): the farthest the read fixes of an empty walk may spread, in metres. */
export const EMPTY_WALK_M = 15;

export interface EmptyWalkInput {
  moments: number;
  pauses: number;
  stills: number;
  fills: number;
  trace: ReadTrace;
}

export function isEmptyWalk(_input: EmptyWalkInput): boolean {
  throw new Error('not implemented');
}
