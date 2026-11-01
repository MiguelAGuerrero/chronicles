import { db } from '../db';
import { NAV_KEY, navValue, pendingDest } from '../startPlan';
import type { Waypoint } from './types';

/**
 * The destination of the open walk's navigation, kept so a reload resumes it
 * (N13). It is not truth: just where you were heading, cleared on arrival,
 * End or stop.
 */
export async function saveNav(walkId: string, dest: Waypoint): Promise<void> {
  await db.setMeta(NAV_KEY, navValue(walkId, dest));
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
  await db.setMeta(NAV_KEY, '');
}

/** The drawer's destination, before a walk (NV23); null clears it. */
export async function loadPendingDest(): Promise<Waypoint | null> {
  return pendingDest(await db.getMeta(NAV_KEY).catch(() => null));
}
export async function savePendingDest(dest: Waypoint | null): Promise<void> {
  await db.setMeta(NAV_KEY, dest ? navValue(null, dest) : '');
}
