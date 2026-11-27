// @layer core
import type { LocatePermission } from '../atlas/findYou';
import type { LngLat } from '../types';
import { locateNotice, type LocateError } from './notice';
import { aged, pagePosition, positionAt, positionLine, settle, type HeldFix, type PagePosition } from './pagePosition';
import type { LocateResult } from './types';

/**
 * Where you are, now (specs/current-position, G17; decisions 0273, 0275): a screen that lists or plans from where you are
 * reads one fresh fix each time it comes to the front, and nothing watches in between (0036). These are its decisions:
 * when the app is back at the front, whether a front reads, and what Explore knows after a read and as its fix ages.
 */

/** How often Explore looks at its fix's age while it stays in front (YH6): a timer that reads nothing. */
export const POSITION_AGE_TICK_MS = 15_000;

/**
 * The app is back at the front (YH1, YH2) only after it was in the back (`background`: home, the lock, another app; the
 * web's hidden page), never after a passing `inactive` (an iOS permission alert, Control Center, a notification pulled
 * down), so a permission's own alert never reads again. `away` is carried from one change to the next.
 */
export function appReturn(away: boolean, next: string): { away: boolean; back: boolean } {
  if (next === 'background') return { away: true, back: false };
  if (next === 'active') return { away: false, back: away };
  return { away, back: false };
}

/**
 * What a front does (YH1, the steward's S2 at the plan): with location allowed, a read, which raises no prompt; blocked, no
 * read, the notice; undecided or unknown, an ask (a read that may raise the system prompt), which the caller allows once
 * per launch (`launchFix`), Find me and Locate being the way to ask after (Never "Nagging").
 */
export function frontRead(permission: LocatePermission | null): 'read' | 'ask' | 'off' {
  if (permission === 'granted') return 'read';
  if (permission === 'denied') return 'off';
  return 'ask';
}

/** After one read: what Explore knows, whether it is a first fix after none, and whether the point it lists from moved. */
export interface ExploreRead {
  pos: PagePosition;
  /** No position before (a launch, a refusal, a fix aged out): a fix now frames, as the launch's read did. */
  first: boolean;
  /** Where Explore lists from changed (beyond `PAGE_MOVE_M`, `settle`): the dot moves and the areas re-list. */
  moved: boolean;
}

/**
 * Explore after one read (YH1, YH4-YH6): the fix read; refused, no position (no held fix stands in); no fresh fix in time,
 * the held fix while at most `FRESH_FIX_MS` old (`earlier`), else none. A fix within `PAGE_MOVE_M` of where Explore already
 * had you keeps that point, so nothing re-lists (`settle`).
 */
export function exploreRead(prev: PagePosition, read: LocateResult, held: HeldFix | null, now: number): ExploreRead {
  const was = positionAt(prev);
  const pos = settle(prev, pagePosition(read, held, now));
  const at = positionAt(pos);
  return { pos, first: !was && !!at, moved: !!at && at !== was };
}

/** Explore's fix as it stays in front (YH6, the owner's "Age it out"): the stand-in's line counts on; past thirty minutes, none. */
export const exploreAged = (pos: PagePosition, now: number): PagePosition => aged(pos, now);

/**
 * Whether a read reframes Explore (YH1, the owner's "Keep the pick"): a first fix does; otherwise only when the town you stand
 * in (`after`, once listed) differs from the one listed before the read. Not listed yet, nothing yet.
 */
export function reframes(p: { first: boolean; before: string | null; after: string | null }): boolean {
  if (p.first) return true;
  return p.after != null && p.after !== p.before;
}

/**
 * What Explore draws and says from its position (YH5, YH6; the owner's "No walk time"): a fix read now, the dot, "You're
 * here" and walk times; a stand-in, the dot muted and walk times from it, no "You're here"; none, no dot, no "You're here"
 * and no walk time or distance from you.
 */
export function exploreSeen(pos: PagePosition): { dot: 'full' | 'muted' | null; here: boolean; distances: boolean } {
  if (pos.state === 'here') return { dot: 'full', here: true, distances: true };
  if (pos.state === 'earlier') return { dot: 'muted', here: false, distances: true };
  return { dot: null, here: false, distances: false };
}

/** Where Explore's dot is, or null (YH5: a position the app did not read is never drawn as you). */
export const exploreDot = (pos: PagePosition): LngLat | null => (exploreSeen(pos).dot ? positionAt(pos) : null);

/**
 * Explore's notice slot after a read or an age (YH4, YH6): refused, the quiet notice in `LOCATION_OFF`'s words (Open
 * Settings on a phone); a stand-in, its line; anything else clears what a read put there. A timeout says nothing (O21).
 */
export function exploreNotice(pos: PagePosition, platform: 'web' | 'native'): { kind: 'off'; error: LocateError } | { kind: 'earlier'; message: string } | { kind: 'clear' } {
  if (pos.state === 'none' && pos.refused) return { kind: 'off', error: locateNotice('denied', platform) };
  if (pos.state === 'earlier') return { kind: 'earlier', message: positionLine(pos, platform) ?? '' };
  return { kind: 'clear' };
}
