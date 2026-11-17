// @layer shell
// @instance: the open session's journey plan on the app's ports
import { db } from '../db';
import { ports } from '../ports';
import type { LngLat } from '../types';
import { createPlanStore } from './planStore';

export const journeyPlans = createPlanStore(ports);

/** Where the session has been so far, thinned (every tenth fix): enough to say which towns it came within reach of (OJ49). */
export async function sessionTrace(walkId: string): Promise<LngLat[]> {
  const points = await db.getPoints(walkId).catch(() => []);
  return points.filter((_, i) => i % 10 === 0).map((p) => [p.lon, p.lat] as LngLat);
}
