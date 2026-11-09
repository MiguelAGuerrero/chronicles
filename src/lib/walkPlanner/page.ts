// @layer core
import type { PlannedRoute } from './planner';

/*
 * The planner page's own state (WP1, WP4, WP18): shut, or open with the routes and the row highlighted. Nothing is highlighted when
 * it opens, so no row reads as the one to take, and Start waits for a tap on one.
 */

export interface PageState {
  open: boolean;
  selected: number | null;
}

export const SHUT: PageState = { open: false, selected: null };
export const open = (): PageState => ({ open: true, selected: null });
export const close = (): PageState => SHUT;
/** A new set of routes (a setting changed, or different ones asked for): nothing is highlighted again. */
export const replanned = (s: PageState): PageState => (s.open ? { open: true, selected: null } : s);
export const select = (s: PageState, i: number, routes: readonly unknown[]): PageState => (s.open && i >= 0 && i < routes.length ? { ...s, selected: i } : s);

/** Start works only on a highlighted row (WP18). */
export const startable = <R extends PlannedRoute>(s: PageState, routes: readonly R[]): R | null => (s.open && s.selected != null ? routes[s.selected] ?? null : null);
