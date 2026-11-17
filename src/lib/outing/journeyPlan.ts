// @layer core
import { distanceM } from '../geo';
import type { Waypoint } from '../nav/types';
import { GET_THERE_M } from '../startPlan';
import type { LngLat } from '../types';
import type { Journey } from './journeys';

/*
 * The plan a session carries (OJ28-OJ31, OJ34, OJ48, OJ49; decision 0201): a journey's towns in order, each with its point, its
 * stops' positions and whether it is a loop. No stop's name, no chip, no path. Which town is ahead is read from where you have been
 * and where you are; nothing here records that a town was reached or passed, so nothing is ever marked done.
 */
export interface PlanChapter {
  town: string | null;
  at: LngLat;
  stops: LngLat[];
  loop: boolean;
}

export interface JourneyPlan {
  chapters: PlanChapter[];
}

export const PLAN_RULES = {
  /** Within this of a town's point or stops, the town is at hand (what Explore calls within walking). */
  reachM: GET_THERE_M,
  /** Beyond this from all of them, after having been within reach, the town is behind you. */
  leftM: 3000,
} as const;

export function journeyPlan(j: Pick<Journey, 'chapters'>): JourneyPlan {
  return { chapters: j.chapters.map((c) => ({ town: c.area.name, at: c.area.at, stops: c.outing.stops.map((s) => s.at), loop: c.outing.loop })) };
}

const isAt = (v: unknown): v is LngLat => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

/** A stored plan is taken only when it is exactly a plan: a field more, or none of its chapters, is not one. */
export function isJourneyPlan(v: unknown): v is JourneyPlan {
  if (!v || typeof v !== 'object') return false;
  const cs = (v as { chapters?: unknown }).chapters;
  if (!Array.isArray(cs) || !cs.length || Object.keys(v).length !== 1) return false;
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
  index: number;
  /** You are within reach of it: the way is on foot from here. */
  within: boolean;
  /** How far its point is in a straight line; 0 with no position. */
  awayM: number;
}

/**
 * OJ49: the chapter ahead, read from the session's trace and where you are. A town is behind you once you were within reach of it
 * and have left, once a later town was reached, once you are clearly past it toward the next, or once it was passed by on a tap
 * (`passed`, kept only while the screen is). With every town behind there is none.
 */
export function chapterAhead(plan: JourneyPlan, trace: readonly LngLat[], here: LngLat | null, passed: ReadonlySet<number>): Ahead | null {
  const cs = plan.chapters;
  const reached = cs.map((c) => trace.some((p) => nearM(c, p) <= PLAN_RULES.reachM));
  const lastReached = reached.lastIndexOf(true);
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (passed.has(i) || i < lastReached) continue;
    const off = here ? nearM(c, here) : 0;
    if (here && off > PLAN_RULES.leftM) {
      if (reached[i]) continue;
      const next = cs[i + 1];
      if (next && distanceM(here, next.at) < distanceM(c.at, next.at) - PLAN_RULES.reachM) continue;
    }
    return { index: i, within: !!here && off <= PLAN_RULES.reachM, awayM: here ? distanceM(here, c.at) : 0 };
  }
  return null;
}

/** OJ30: a chapter's way on foot: an ordinary suggested destination through its stops, routed from where you are; positions only. */
export function chapterDest(c: PlanChapter): Waypoint {
  const via = c.stops.slice(0, -1);
  return { at: c.stops[c.stops.length - 1], label: 'An outing', kind: 'point', suggested: true, outing: true, ...(via.length ? { via } : {}) };
}
