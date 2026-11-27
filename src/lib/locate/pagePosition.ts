// @layer core
import { distanceM } from '../geo';
import { numberWord } from '../resurface/lines';
import { FRESH_FIX_MS } from '../startPlan';
import type { LngLat } from '../types';
import { LOCATE_TIMEOUT, LOCATION_OFF } from './notice';
import type { LocateResult } from './types';

/**
 * Where a planning page plans from (fix outing-current-position, decision 0273; OJ10, QC30, WP3): the one fresh fix it read as
 * it opened (`here`); while that read is under way, nothing (`finding`); refused, nothing (`none`, refused). Only when no fresh
 * fix came in time does a fix the app already holds stand in, and only while it is at most `FRESH_FIX_MS` old (`earlier`,
 * said in a line: the owner's "Up to 30 min, said"). Past that, or with none, there is no position and nothing is proposed.
 */
export type PagePosition =
  | { state: 'finding' }
  | { state: 'here'; at: LngLat; t: number }
  | { state: 'earlier'; at: LngLat; t: number; agoMs: number }
  | { state: 'none'; refused: boolean };

/** A fix the app holds: Explore's or Navigate's last read, or a recording walk's last walked fix. */
export type HeldFix = { at: LngLat; t: number };

/** `read` is the page's own read (null while it is under way), `held` the fix the app holds, `now` when the read came back. */
export function pagePosition(read: LocateResult | null, held: HeldFix | null, now: number): PagePosition {
  if (!read) return { state: 'finding' };
  if (read.at) return { state: 'here', at: read.at, t: now };
  if (read.reason === 'denied') return { state: 'none', refused: true };
  const agoMs = held ? now - held.t : -1;
  if (held && agoMs >= 0 && agoMs <= FRESH_FIX_MS) return { state: 'earlier', at: held.at, t: held.t, agoMs };
  return { state: 'none', refused: false };
}

/** The newer of two held fixes (audit 4: a recording walk's last walked fix beside the last one read). */
export function newerFix(a: HeldFix | null, b: HeldFix | null): HeldFix | null {
  if (!a) return b;
  if (!b) return a;
  return b.t > a.t ? b : a;
}

/** The position a page plans from, or null with none. */
export const positionAt = (p: PagePosition): LngLat | null => (p.state === 'here' || p.state === 'earlier' ? p.at : null);

/**
 * The page's position as time passes with it open (audit 1): a fix past `FRESH_FIX_MS` is no position; an earlier fix's age
 * counts on for its line. The same object when nothing changed, so nothing re-renders.
 */
export function aged(p: PagePosition, now: number): PagePosition {
  if (p.state !== 'here' && p.state !== 'earlier') return p;
  const agoMs = now - p.t;
  if (agoMs > FRESH_FIX_MS || agoMs < 0) return { state: 'none', refused: false };
  if (p.state === 'here' || Math.floor(agoMs / 60_000) === Math.floor(p.agoMs / 60_000)) return p;
  return { ...p, agoMs };
}

/** A read again within this of where the page already is keeps the page's position, so its plan is not read again (audit 3). */
export const PAGE_MOVE_M = 100;

/** The page's position after a read again (the app back at the front, Try again, Start): the same place keeps its point. */
export function settle(prev: PagePosition, next: PagePosition): PagePosition {
  const was = positionAt(prev);
  if (!was || (next.state !== 'here' && next.state !== 'earlier') || distanceM(was, next.at) > PAGE_MOVE_M) return next;
  return { ...next, at: was };
}

/**
 * Start (audit 1; WP24): route from the page's fix only while it was read fresh and is at most `FRESH_FIX_MS` old, and no walk
 * is recording (a walk moves the walker while the page is open); otherwise read once more first. Never route from an aged fix.
 */
export function startFrom(p: PagePosition, now: number, walking: boolean): 'use' | 'read' {
  return p.state === 'here' && !walking && now - p.t >= 0 && now - p.t <= FRESH_FIX_MS ? 'use' : 'read';
}

/** While the page's read is under way: Explore's own words while Find me reads a fix. */
export const FINDING_LINE = 'Finding you…';
/** The page's own read once more, after a timeout (the app's words for it). */
export const RETRY_LABEL = 'Try again';
/** A phone's Settings, where location is turned back on (the app's words for it). */
export const OPEN_SETTINGS_LABEL = 'Open Settings';

/** "From where you were twenty minutes ago." (the owner's example, Nov 27), its count in words (VISION.md, "Counts are words"). */
function earlierLine(agoMs: number): string {
  const m = Math.floor(agoMs / 60_000);
  const ago = m < 1 ? 'a moment ago' : m === 1 ? 'a minute ago' : `${numberWord(m)} minutes ago`;
  return `From where you were ${ago}.`;
}

/**
 * The page's one line about its position, or null when it says nothing: finding you while it reads; how long ago an earlier
 * fix was; location off when refused (the app's `LOCATION_OFF`); no fix in time and none held, the app's `LOCATE_TIMEOUT`
 * (audit 8). Each sits beside the page's own "needs your location".
 */
export function positionLine(p: PagePosition, platform: 'web' | 'native'): string | null {
  if (p.state === 'finding') return FINDING_LINE;
  if (p.state === 'earlier') return earlierLine(p.agoMs);
  if (p.state === 'none') return p.refused ? LOCATION_OFF[platform] : LOCATE_TIMEOUT;
  return null;
}

/** What the line offers (audit 8): Try again after a timeout; Open Settings when refused, on a phone only (a web page cannot). */
export function positionAction(p: PagePosition, platform: 'web' | 'native'): 'retry' | 'settings' | null {
  if (p.state !== 'none') return null;
  if (!p.refused) return 'retry';
  return platform === 'native' ? 'settings' : null;
}
