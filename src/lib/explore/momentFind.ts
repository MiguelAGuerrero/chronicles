import { db } from '../db';
import { boundsOf } from '../geo';
import type { Capture } from '../types';
import { EXPLORE_RULES, findFor, type Find } from './explore';

/**
 * A moment made outside a walk finds a place as a walk's capture does (M4,
 * E8): the nearest unfound checklist place within 60 m, any kind. The first
 * find of a place stands, and a moment finds at most one.
 */
export async function findForMoment(c: Capture): Promise<Find | null> {
  if (c.lat == null || c.lon == null) return null;
  const at: [number, number] = [c.lon, c.lat];
  const finds = await db.listFinds();
  if (finds.some((f) => f.capture_id === c.id)) return null;
  const items = await db.checklistItemsIn(boundsOf([at], EXPLORE_RULES.revealM * 2)!);
  const item = findFor(at, items, new Set(finds.map((f) => f.key)));
  if (!item) return null;
  const f: Find = { ...item, walk_id: c.walk_id, capture_id: c.id, found_at: Date.now() };
  await db.addFind(f);
  return f;
}
