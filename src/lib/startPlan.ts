// @layer core
import { EXPLORE_KEY, exploredKey } from './explore/explore';
import { formatDistanceNear } from './format';
import { distanceM } from './geo';
import { NAV } from './nav/rules';
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

/**
 * The destination as the drawer shows it (NV20): its name, and how far it is in a straight line, in the units
 * setting's terms as every distance is (QL14). In metres, under a kilometre, to the nearest ten; in miles, from the
 * distance itself, so a rounding never crosses the feet-to-miles step (tend tabs audit 7).
 */
export function destLine(dest: Waypoint, from: LngLat | null): string {
  if (!from) return dest.label;
  return `${dest.label} · ${formatDistanceNear(distanceM(from, dest.at))} away`;
}

/** Explore's area card asks "Walk now" or "When I get there" past this, in a straight line (DW2, decision 0121). */
export const GET_THERE_M = 2000;
/** A fix older than this is no position: the card asks rather than start a walk that might record a drive (DW5). */
export const FRESH_FIX_MS = 30 * 60_000;

/**
 * What Walk to does on Explore's area card (DW1, DW2, DW5, DW14): start at once when near and the fix is
 * fresh; ask when far, or with no fresh fix; past what can be walked (N5), only When I get there.
 * `distanceM` is from where you are, or where the atlas last listed areas; `fixT` the fix's time, null with none.
 */
export function walkToChoice(distanceM: number | null, fixT: number | null, now: number): 'start' | 'ask' | 'later' {
  if (distanceM != null && distanceM > NAV.maxM) return 'later';
  if (distanceM == null || fixT == null || now - fixT > FRESH_FIX_MS) return 'ask';
  return distanceM > GET_THERE_M ? 'ask' : 'start';
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

/**
 * Walk here, and Navigate's Return to walk (NV10): with no walk open it starts
 * one; with one open it routes that walk there, as the walk's own Go here (its
 * destination in meta nav, which the walk screen routes when it comes back),
 * and returns to it. Nowhere chosen, it only returns.
 */
export type WalkHerePlan = { kind: 'start' } | { kind: 'return' } | { kind: 'route'; meta: [string, string][] };
export function walkHerePlan(openWalkId: string | null, dest: Waypoint | null): WalkHerePlan {
  if (!openWalkId) return { kind: 'start' };
  if (!dest) return { kind: 'return' };
  return { kind: 'route', meta: [[NAV_KEY, navValue(openWalkId, dest)]] };
}

/** The three tabs, in order (HC3), with their web paths (NV5). Chronicle is the root route, so the app opens there (HC1, decision 0112). */
export type TabId = 'explore' | 'navigate' | 'chronicle';
export const TABS: { id: TabId; route: string; path: string; label: string; icon: string; iconOn: string }[] = [
  { id: 'chronicle', route: 'index', path: '/', label: 'Chronicle', icon: 'book-outline', iconOn: 'book' },
  { id: 'explore', route: 'explore', path: '/explore', label: 'Explore', icon: 'compass-outline', iconOn: 'compass' },
  { id: 'navigate', route: 'navigate', path: '/navigate', label: 'Navigate', icon: 'navigate-outline', iconOn: 'navigate' },
];
export const tabFor = (id: TabId) => TABS.find((t) => t.id === id)!;
