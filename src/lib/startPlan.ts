import { EXPLORE_KEY, exploredKey } from './explore/explore';
import { distanceM } from './geo';
import type { Waypoint } from './nav/types';
import type { LngLat } from './types';

/**
 * Starting a walk from the tabs (Navigation & tabs, NV19-NV25). Pure: the
 * drawer's choices in, the walk's meta and the walk screen's params out, so
 * Start and Walk here start the same way.
 */

/** The mode the walk is started in: quiet (navigation and captures) or exploring (E1). */
export type StartMode = 'quiet' | 'explore';
/** Meta: the mode the drawer opens on, the last one picked (NV22). */
export const START_MODE_KEY = 'start_mode';
/** Meta: the destination (N13). Before a walk, the drawer's, with no walk id. */
export const NAV_KEY = 'nav';

export function parseStartMode(raw: string | null | undefined): StartMode {
  return raw === 'explore' ? 'explore' : 'quiet';
}

export function navValue(walkId: string | null, dest: Waypoint): string {
  return JSON.stringify({ walk_id: walkId, dest });
}

/** The drawer's destination: `nav` held for no walk yet. A walk's own destination is not the drawer's. */
export function pendingDest(raw: string | null | undefined): Waypoint | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { walk_id: string | null; dest: Waypoint } | null;
    return v && v.walk_id == null && v.dest && Array.isArray(v.dest.at) ? v.dest : null;
  } catch {
    return null;
  }
}

/** The destination as the drawer shows it (NV20): its name, and how far it is in a straight line. */
export function destLine(dest: Waypoint, from: LngLat | null): string {
  if (!from) return dest.label;
  const m = distanceM(from, dest.at);
  return `${dest.label} · ${m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`} away`;
}

export interface StartPlan {
  /** Meta written before the walk screen opens, in order. */
  meta: [string, string][];
  /** The walk screen's params: a recorder warning, or that a walk to somewhere is recording. */
  params?: Record<string, string>;
}

/** What starting a walk writes (NV25): Explore's keys, and the destination for the new walk. */
export function startPlan(input: { walkId: string; now: number; mode: StartMode; dest: Waypoint | null; warning?: string }): StartPlan {
  const meta: [string, string][] = [];
  if (input.mode === 'explore') meta.push([EXPLORE_KEY, input.walkId], [exploredKey(input.walkId), String(input.now)]);
  if (input.dest) meta.push([NAV_KEY, navValue(input.walkId, input.dest)]);
  // A walk started to somewhere says so as it opens: it is recording, not just a route.
  const params: Record<string, string> | undefined = input.warning ? { warning: input.warning } : input.dest ? { started: '1' } : undefined;
  return { meta, params };
}

/** The three tabs, in order (NV1), with their web paths (NV5). */
export type TabId = 'explore' | 'navigate' | 'chronicle';
export const TABS: { id: TabId; route: string; path: string; label: string; icon: string; iconOn: string }[] = [
  { id: 'explore', route: 'explore', path: '/explore', label: 'Explore', icon: 'compass-outline', iconOn: 'compass' },
  { id: 'navigate', route: 'index', path: '/', label: 'Navigate', icon: 'navigate-outline', iconOn: 'navigate' },
  { id: 'chronicle', route: 'chronicle', path: '/chronicle', label: 'Chronicle', icon: 'book-outline', iconOn: 'book' },
];
export const tabFor = (id: TabId) => TABS.find((t) => t.id === id)!;
