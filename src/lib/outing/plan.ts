// @layer core
import type { LngLat } from '../types';
import type { Leg } from '../walkPlanner/planner';
import type { Candidate, Facets } from './candidates';

export type OutingReason = 'noPosition' | 'few' | 'noRoute' | 'noLoop';

export interface Outing {
  /** The stops in the order they are walked. */
  stops: Candidate[];
  path: LngLat[];
  lengthM: number;
  loop: boolean;
}

export interface OutingInput {
  cands: readonly Candidate[];
  match: Facets;
  from: LngLat | null;
  mode: 'loop' | 'oneway';
  ceilingM: number;
  offered?: ReadonlySet<string>;
}

/** QC6-QC10, QC30: one proposal, never several; the planner's own ceiling (hard) and retrace (a tenth) rules; a reason when none. */
export function planOuting(_input: OutingInput, _leg: Leg): { outing: Outing | null; reasons: OutingReason[] } {
  throw new Error('not built: quick-circuit QC6');
}
