// @layer core
import { distanceM } from '../geo';
import type { Waypoint } from '../nav/types';
import { GET_THERE_M } from '../startPlan';
import type { LngLat } from '../types';
import type { Journey } from './journeys';

/*
 * The plan a session carries (OJ28-OJ31, OJ34, OJ48, OJ49; decision 0201): a journey's towns in order, each with its point, its
 * stops' positions and whether it is a loop. No stop's name, no chip, no path. It holds only the towns still ahead: one that is
 * behind you simply leaves it, and nothing records whether it was reached, passed by or drifted from, so nothing is ever marked done.
 */
export interface PlanChapter {
  town: string | null;
  at: LngLat;
  stops: LngLat[];
  loop: boolean;
}

export interface JourneyPlan {
  chapters: PlanChapter[];
  /** RE28: the drive to the town ahead is being guided; kept so a reload finds it again. No way, turn or road is kept. */
  driving?: true;
}

export const PLAN_RULES = {
  /** Within this of a town's point or stops, the town is at hand (what Explore calls within walking). */
  reachM: GET_THERE_M,
  /** Beyond this from all of them, after having been within reach, the town is behind you. */
  leftM: 3000,
  /** Moving away from a town by more than this, and nearer the next than it is, you are past it. */
  pastM: 1000,
  /** Further from a town than the nearest you came by more than this, or by this share of that distance if more: you have drifted off. */
  driftM: 5000,
  driftShare: 0.5,
} as const;

export function journeyPlan(j: Pick<Journey, 'chapters'>): JourneyPlan {
  return { chapters: j.chapters.map((c) => ({ town: c.area.name, at: c.area.at, stops: c.outing.stops.map((s) => s.at), loop: c.outing.loop })) };
}

const isAt = (v: unknown): v is LngLat => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

/** A stored plan is taken only when it is exactly a plan: a field more, or none of its chapters, is not one. */
export function isJourneyPlan(v: unknown): v is JourneyPlan {
  if (!v || typeof v !== 'object') return false;
  const cs = (v as { chapters?: unknown }).chapters;
  const driving = (v as { driving?: unknown }).driving;
  if (!Array.isArray(cs) || !cs.length || Object.keys(v).length !== (driving === true ? 2 : 1)) return false;
  return cs.every((c) => {
    if (!c || typeof c !== 'object') return false;
    const x = c as Record<string, unknown>;
    return (
      Object.keys(x).sort().join() === 'at,loop,stops,town' && (x.town === null || typeof x.town === 'string') && isAt(x.at) && typeof x.loop === 'boolean' && Array.isArray(x.stops) && x.stops.length > 0 && x.stops.every(isAt)
    );
  });
}

const nearM = (c: PlanChapter, p: LngLat): number => Math.min(distanceM(c.at, p), ...c.stops.map((s) => distanceM(s, p)));

export interface Ahead {
  town: string | null;
  at: LngLat;
  /** The town at hand: you are within reach of it, or have been and have not yet left it. */
  within: boolean;
  /** How far its point is in a straight line; null with no position. */
  awayM: number | null;
}

/** What the session has seen of each chapter since the screen opened: the nearest it came, and whether it came within reach. */
export interface PlanState {
  closest: number[];
  reached: boolean[];
}

export const emptyState = (plan: JourneyPlan | null): PlanState => ({ closest: (plan?.chapters ?? []).map(() => Infinity), reached: (plan?.chapters ?? []).map(() => false) });

/**
 * OJ49 (the second audit): one fix's step. The plan that comes back holds only the towns still ahead: a town is let go once you
 * were within reach of it and have left, once a later town was reached and this one is out of reach, once you are moving away from
 * it and are clearly past it toward the next, or once you have drifted away from it altogether (the destination's included), each
 * with no tap and nothing said. A town within reach, or reached and not yet left, is never let go and is the one at hand, even
 * when the next is within reach too. Nothing in the plan says what became of a town that is gone.
 */
export function stepPlan(plan: JourneyPlan, state: PlanState, here: LngLat | null): { plan: JourneyPlan | null; state: PlanState; ahead: Ahead | null } {
  const cs = plan.chapters;
  if (!here) return { plan, state, ahead: cs[0] ? { town: cs[0].town, at: cs[0].at, within: false, awayM: null } : null };
  const off = cs.map((c) => nearM(c, here));
  const closest = cs.map((_, i) => Math.min(state.closest[i] ?? Infinity, off[i]));
  const reached = cs.map((_, i) => !!state.reached[i] || off[i] <= PLAN_RULES.reachM);
  const behind = (i: number): boolean => {
    if (off[i] <= PLAN_RULES.leftM) return false;
    if (reached[i] || reached.some((r, k) => k > i && r)) return true;
    const receding = off[i] - closest[i];
    const next = cs[i + 1];
    if (next && receding > PLAN_RULES.pastM && distanceM(here, next.at) < distanceM(cs[i].at, next.at) - PLAN_RULES.reachM) return true;
    return receding > Math.max(PLAN_RULES.driftM, PLAN_RULES.driftShare * closest[i]);
  };
  let k = 0;
  while (k < cs.length && behind(k)) k++;
  if (k === cs.length) return { plan: null, state: emptyState(null), ahead: null };
  const same = k === 0 && closest.every((v, i) => v === state.closest[i]) && reached.every((v, i) => v === state.reached[i]);
  const c = cs[k];
  return {
    plan: k === 0 ? plan : { chapters: cs.slice(k) },
    state: same ? state : { closest: closest.slice(k), reached: reached.slice(k) },
    ahead: { town: c.town, at: c.at, within: off[k] <= PLAN_RULES.reachM || (reached[k] && off[k] <= PLAN_RULES.leftM), awayM: distanceM(here, c.at) },
  };
}

/** OJ31: "Pass by": the town ahead leaves the plan; with none after it there is no plan. */
export const passBy = (plan: JourneyPlan): JourneyPlan | null => (plan.chapters.length > 1 ? { chapters: plan.chapters.slice(1) } : null);

/** OJ30: a chapter's way on foot, asked for on a tap: an ordinary suggested destination through its stops, routed from where you are and ending at the last of them; positions only. */
export function chapterDest(c: PlanChapter): Waypoint {
  const via = c.stops.slice(0, -1);
  return { at: c.stops[c.stops.length - 1], label: 'An outing', kind: 'point', suggested: true, outing: true, ...(via.length ? { via } : {}) };
}
