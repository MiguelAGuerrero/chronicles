import { db } from '../db';
import type { Waypoint } from './types';

/**
 * The destination of the open walk's navigation, kept so a reload resumes it
 * (N13). It is not truth: just where you were heading, cleared on arrival,
 * End or stop.
 */
export async function saveNav(walkId: string, dest: Waypoint): Promise<void> {
  await db.setMeta('nav', JSON.stringify({ walk_id: walkId, dest }));
}

export async function loadNav(walkId: string): Promise<Waypoint | null> {
  try {
    const v = JSON.parse((await db.getMeta('nav')) || 'null') as { walk_id: string; dest: Waypoint } | null;
    return v && v.walk_id === walkId ? v.dest : null;
  } catch {
    return null;
  }
}

export async function clearNav(): Promise<void> {
  await db.setMeta('nav', '');
}
