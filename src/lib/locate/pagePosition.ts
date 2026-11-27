// @layer core
import { numberWord } from '../resurface/lines';
import { FRESH_FIX_MS } from '../startPlan';
import type { LngLat } from '../types';
import { LOCATION_OFF } from './notice';
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

/** `read` is the page's own read (null while it is under way), `last` the fix the app holds, `now` when the read came back. */
export function pagePosition(read: LocateResult | null, last: { at: LngLat; t: number } | null, now: number): PagePosition {
  if (!read) return { state: 'finding' };
  if (read.at) return { state: 'here', at: read.at, t: now };
  if (read.reason === 'denied') return { state: 'none', refused: true };
  const agoMs = last ? now - last.t : -1;
  if (last && agoMs >= 0 && agoMs <= FRESH_FIX_MS) return { state: 'earlier', at: last.at, t: last.t, agoMs };
  return { state: 'none', refused: false };
}

/** The position a page plans from, or null with none. */
export const positionAt = (p: PagePosition): LngLat | null => (p.state === 'here' || p.state === 'earlier' ? p.at : null);

/** While the page's read is under way: Explore's own words while Find me reads a fix. */
export const FINDING_LINE = 'Finding you…';

/** "From where you were twenty minutes ago." (the owner's example, Nov 27), its count in words (VISION.md, "Counts are words"). */
function earlierLine(agoMs: number): string {
  const m = Math.floor(agoMs / 60_000);
  const ago = m < 1 ? 'a moment ago' : m === 1 ? 'a minute ago' : `${numberWord(m)} minutes ago`;
  return `From where you were ${ago}.`;
}

/**
 * The page's one line about its position, or null when it says nothing: finding you while it reads; how long ago an earlier
 * fix was; location off when refused (the app's `LOCATION_OFF`, beside the page's own "needs your location").
 */
export function positionLine(p: PagePosition, platform: 'web' | 'native'): string | null {
  if (p.state === 'finding') return FINDING_LINE;
  if (p.state === 'earlier') return earlierLine(p.agoMs);
  if (p.state === 'none' && p.refused) return LOCATION_OFF[platform];
  return null;
}
