// @layer core
import { distanceM } from '../geo';
import { kindsClause } from '../pins';
import { dayPartLine } from '../resurface/context';
import type { CaptureKind, LngLat, Moment } from '../types';
import { EXPLORE_RULES } from './explore';

/**
 * A place's card on the walk (specs/capture-at-a-place, decision 0224 as amended): within 60 m it carries the capture
 * row (Camera, Voice, Note), and a capture begun there carries the place on its stamp, so the moment it keeps finds the
 * place. Nothing is armed for a later capture. A found place's card lists the moments taken within 60 m of it, by spot:
 * a moment keeps its spot, so no stored link is needed (the owner, Nov 20).
 */

/** How near the walker must be for the card's capture row, and how far a found card's moments are listed: 60 m. */
export const PLACE_REACH_M = EXPLORE_RULES.revealM;

/** At most this many moments on a found place's card, newest first (CA11). */
export const MOMENTS_SHOWN = 3;

/**
 * Whether the card shows the capture row, and its line in words (CA1, CA5, CA9, CA11). The line describes, never urges:
 * no find, collect or unlock (steward S5). With no fix yet the row is offered (the walk places the moment at Stop).
 */
export function cardCapture(o: { name: string | null; at: LngLat; here: LngLat | null; found: boolean }): { row: boolean; line: string | null } {
  if (!o.name) return { row: false, line: 'Walk within 60 m to see what it is.' };
  const near = !o.here || distanceM(o.here, o.at) <= PLACE_REACH_M;
  if (o.found) return { row: near, line: null };
  return near ? { row: true, line: `Camera, Voice or Note here keeps the moment with ${o.name}.` } : { row: false, line: 'Moments are kept with it from within 60 m.' };
}

/**
 * The find a kept capture makes (CA2-CA4, CA6, CA7, CA12): only a new moment whose stamp was taken on a place's card,
 * and only while that place is unfound (the first find stands). A piece joins its moment, never a place; a capture that
 * keeps nothing never reaches here, so nothing waits for a later one.
 */
export function findOnKept(k: { place: string | null; piece: boolean; momentId: string }, found: ReadonlySet<string>): { key: string; momentId: string } | null {
  if (!k.place || k.piece || found.has(k.place)) return null;
  return { key: k.place, momentId: k.momentId };
}

const WEEKDAY_FIRST = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/;

/**
 * A moment on a found card, in words: its kinds in the order taken, then its day and part of day (tend map T28's words);
 * a moment of the walk in progress is "on this walk", never "late last night" for a minute ago (capture-at-a-place ui 3).
 */
export function momentHereLine(mo: Pick<Moment, 't' | 'pieces' | 'walk_id'>, now: number, walkId: string | null = null): string {
  const order: CaptureKind[] = [];
  for (const p of mo.pieces) if (!order.includes(p.kind)) order.push(p.kind);
  const kinds = kindsClause(order.map((k) => [k, mo.pieces.filter((p) => p.kind === k).length] as const));
  if (walkId && mo.walk_id === walkId) return `${kinds}, on this walk`;
  const when = dayPartLine(mo.t, now);
  return `${kinds}, ${WEEKDAY_FIRST.test(when) ? when : when.charAt(0).toLowerCase() + when.slice(1)}`;
}

/** The moments a found place's card lists (CA11): within 60 m of the place, newest first, three at most. No count. */
export function momentsHere(moments: readonly Moment[], at: LngLat, now: number, walkId: string | null = null): { id: string; line: string }[] {
  return moments
    .filter((mo) => mo.lat != null && mo.lon != null && mo.pieces.length > 0 && distanceM([mo.lon, mo.lat], at) <= PLACE_REACH_M)
    .sort((a, b) => b.t - a.t)
    .slice(0, MOMENTS_SHOWN)
    .map((mo) => ({ id: mo.id, line: momentHereLine(mo, now, walkId) }));
}

/** The box a found card reads its moments in: the place's 60 m, as [west, south, east, north]. */
export function hereBounds(at: LngLat): [number, number, number, number] {
  const dLat = PLACE_REACH_M / 111_320;
  const dLon = PLACE_REACH_M / (111_320 * Math.cos((at[1] * Math.PI) / 180));
  return [at[0] - dLon, at[1] - dLat, at[0] + dLon, at[1] + dLat];
}
