// @layer core
import { distanceM } from '../geo';
import { kindsClause } from '../pins';
import { dayPartLine } from '../resurface/context';
import type { CaptureKind, LngLat, Moment } from '../types';
import { EXPLORE_RULES } from './explore';

/**
 * A place's card on the walk (specs/capture-at-a-place, decision 0224 as amended by 0246 and 0247): at any distance it
 * carries the capture row (Camera, Voice, Note), and a capture begun there carries the place on its stamp, so the moment
 * it keeps finds the place. A place is a point, and a long bridge or a monument seen from afar is still the place a
 * moment is kept with (fix poi-any-distance, decision 0247). Nothing is armed for a later capture. A found place's card
 * lists the moments taken within 60 m of it, by spot, and the moment that found it, wherever it was taken.
 */

/** How far a found card's moments are listed by spot: 60 m. */
export const PLACE_REACH_M = EXPLORE_RULES.revealM;

/** At most this many moments on a found place's card, newest first (CA11). */
export const MOMENTS_SHOWN = 3;

/**
 * Whether the card shows the capture row, and its line in words (CA1, CA5, CA9 and CA11, as amended by decision 0247).
 * The row is offered at any distance, a "?" included, whose line never names it; the moment kept names it as any find
 * does. On a ride a "?" offers no row: Explore names no place on a ride (R12; fix poi-any-distance audit 1). The line
 * names the card's buttons, never "here" of a place that may be far off, and `reach` is 60 m in the reader's units
 * (audit 5). It describes, never urges: no find, collect or unlock (steward S5).
 */
export function cardCapture(o: { name: string | null; found: boolean; riding?: boolean; reach?: string }): { row: boolean; line: string | null } {
  if (o.found) return { row: true, line: null };
  if (!o.name) {
    const learn = `Walk within ${o.reach ?? '60 m'} to see what it is.`;
    return o.riding ? { row: false, line: learn } : { row: true, line: `${learn} Camera, Voice or Note keeps the moment with it.` };
  }
  return { row: true, line: `Camera, Voice or Note keeps the moment with ${o.name}.` };
}

/**
 * The find a kept capture makes (CA2-CA4, CA6, CA7, CA12): only a new moment whose stamp was taken on a place's card,
 * and only while that place is unfound (the first find stands). A piece joins its moment, never a place; a capture that
 * keeps nothing never reaches here, so nothing waits for a later one.
 */
export function findOnKept(
  k: { place: string | null; piece: boolean; momentId: string },
  found: ReadonlySet<string>,
  ride: { riding: boolean; named: boolean } = { riding: false, named: true },
): { key: string; momentId: string } | null {
  if (!k.place || k.piece || found.has(k.place)) return null;
  // A "?" capture begun on foot and kept once a ride has begun names nothing: on a ride Explore names no place (R12;
  // fix poi-any-distance audit 7).
  if (ride.riding && !ride.named) return null;
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

/**
 * The moments a found place's card lists (CA11): within 60 m of the place by spot, and the moment that found it
 * (`finder`) wherever it was taken (decision 0247), newest first, three at most with the finder always among them
 * (fix poi-any-distance audit 4), each once. No count.
 */
export function momentsHere(near: readonly Moment[], at: LngLat, now: number, walkId: string | null = null, finder: Moment | null = null): { id: string; line: string }[] {
  const byId = new Map<string, Moment>();
  for (const mo of near) {
    if (mo.lat != null && mo.lon != null && mo.pieces.length > 0 && distanceM([mo.lon, mo.lat], at) <= PLACE_REACH_M) byId.set(mo.id, mo);
  }
  const keep = finder && finder.pieces.length > 0 ? finder : null;
  if (keep) byId.delete(keep.id);
  const newest = [...byId.values()].sort((a, b) => b.t - a.t).slice(0, MOMENTS_SHOWN - (keep ? 1 : 0));
  return [...newest, ...(keep ? [keep] : [])]
    .sort((a, b) => b.t - a.t)
    .map((mo) => ({ id: mo.id, line: momentHereLine(mo, now, walkId) }));
}

/** The box a found card reads its moments in: the place's 60 m, as [west, south, east, north]. */
export function hereBounds(at: LngLat): [number, number, number, number] {
  const dLat = PLACE_REACH_M / 111_320;
  const dLon = PLACE_REACH_M / (111_320 * Math.cos((at[1] * Math.PI) / 180));
  return [at[0] - dLon, at[1] - dLat, at[0] + dLon, at[1] + dLat];
}
