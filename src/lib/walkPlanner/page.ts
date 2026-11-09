// @layer core
import type { PlannedRoute } from './planner';
import type { PlannerResult } from './service';

/*
 * The planner page's own state (WP1, WP4, WP18): shut, or open with the routes and the row highlighted. The first route is selected
 * once there are routes (decision 0104); tapping another selects it, and Start starts the selected one.
 */

export interface PageState {
  open: boolean;
  selected: number | null;
}

export const SHUT: PageState = { open: false, selected: null };
export const open = (): PageState => ({ open: true, selected: null });
export const close = (): PageState => SHUT;
/** A new set of routes (a setting changed, or different ones asked for): the first is selected, as the maps do (decision 0104). */
export const replanned = (s: PageState, routes: readonly unknown[]): PageState => (s.open ? { open: true, selected: routes.length ? 0 : null } : s);
export const select = (s: PageState, i: number, routes: readonly unknown[]): PageState => (s.open && i >= 0 && i < routes.length ? { ...s, selected: i } : s);

/** Start works only on a highlighted row (WP18). */
export const startable = <R extends PlannedRoute>(s: PageState, routes: readonly R[]): R | null => (s.open && s.selected != null ? routes[s.selected] ?? null : null);

/**
 * A new plan came in (walk planner audit 2): after "Suggest different routes", an empty answer leaves the routes on screen and says
 * there is nothing different, so the page is never left bare; anything else is shown as it is.
 */
export function applyRound(prev: PlannerResult | null, next: PlannerResult, round: number): { result: PlannerResult; nothing: boolean } {
  if (round > 0 && !next.routes.length && prev && prev.routes.length) return { result: prev, nothing: true };
  return { result: next, nothing: false };
}

/** The round for the settings now: it starts over when they change, in the same render, so a stale plan is never asked for (audit 10). */
export const roundFor = (state: { key: string; n: number }, key: string): number => (state.key === key ? state.n : 0);

/** A line above Start when the open walk has a destination set (audit 16): Start would replace it. Read from meta `nav`. */
export function headingNote(raw: string | null | undefined, walkId: string | null): string | null {
  if (!raw || !walkId) return null;
  try {
    const v = JSON.parse(raw) as { walk_id?: string | null; dest?: unknown } | null;
    return v && v.walk_id === walkId && v.dest ? 'This replaces where you were heading.' : null;
  } catch {
    return null;
  }
}
