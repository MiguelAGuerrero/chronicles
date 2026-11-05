// @layer core
import { distanceToLinesM } from '../geo';
import type { CaptureKind, LngLat, StreetSegment } from '../types';
import { NO_PLACE, ON_ITS_OWN } from './copy';
import { daysAgo, numberWord, whenLine } from './lines';

/**
 * A moment arrives whole (MC1-MC5, MC7, MC16): where, when in the day, how far into the walk, and what came
 * just before, said in words. Pure; the shell reads the street and the pauses and passes them in. Nothing here
 * quotes the owner's words, and every sentence it writes holds no digit (a street keeps its own name).
 */

const MIN = 60_000;
/** A street is stated only when it lies this near the moment's own fix (MC2). */
export const STREET_REACH_M = 40;
/** "Just after" reaches this far back in walked time (MC5). */
export const JUST_AFTER_MS = 10 * MIN;

/**
 * The name of the street at a fix (MC2): the snapped street when it is cached and within reach, else the
 * nearest cached street within reach, else none. A street with no name is none.
 */
export function nearestStreet(fix: LngLat | null, segments: StreetSegment[], snappedId: string | null): string | null {
  if (!fix) return null;
  const near = segments.map((s) => ({ s, d: distanceToLinesM(fix, s.geometry) })).filter((x) => x.d <= STREET_REACH_M);
  const snapped = near.find((x) => x.s.id === snappedId);
  const best = snapped ?? near.sort((a, b) => a.d - b.d || (a.s.id < b.s.id ? -1 : 1))[0];
  return best?.s.name?.trim() || null;
}

/** The place line (MC1): only what is known. */
export function placeLine(o: { street: string | null; town: string | null }): string {
  if (o.street && o.town) return `${o.street}, ${o.town}`;
  return o.street ?? o.town ?? NO_PLACE;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** How far into the walk, in walked time (MC3): "At the start", "Ten minutes in", "One hour and five minutes in". */
export function minutesInLine(walkedMs: number | null): string {
  if (walkedMs == null) return ON_ITS_OWN;
  const total = Math.max(0, Math.round(walkedMs / MIN));
  if (total === 0) return 'At the start';
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hours = h ? `${numberWord(h)} ${h === 1 ? 'hour' : 'hours'}` : '';
  const mins = m ? `${numberWord(m)} ${m === 1 ? 'minute' : 'minutes'}` : '';
  return `${cap([hours, mins].filter(Boolean).join(' and '))} in`;
}

export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** The part of the day by the phone's clock zone now, with the boundaries a walk's title uses (MC4). */
export function partOfDay(t: number): PartOfDay {
  const h = new Date(t).getHours();
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The day with its part (MC4): "Tuesday evening", "Yesterday morning", "This afternoon", else "Three weeks ago, evening". */
export function dayPartLine(t: number, now: number): string {
  const part = partOfDay(t);
  const d = daysAgo(t, now);
  if (d <= 0) return part === 'night' ? 'Tonight' : `This ${part}`;
  if (d === 1) return `Yesterday ${part}`;
  if (d < 7) return `${WEEKDAYS[new Date(t).getDay()]} ${part}`;
  return `${whenLine(t, now)}, ${part}`;
}

const KIND: Record<CaptureKind, string> = { photo: 'a photo', video: 'a video', voice: 'a voice memo', text: 'a note' };

/** "just after a photo" (MC5): the immediately previous capture, within ten walked minutes; its kind, never its words. */
export function justAfter(prev: { kind: CaptureKind; walkedGapMs: number } | null): string | null {
  if (!prev || prev.walkedGapMs > JUST_AFTER_MS) return null;
  return `just after ${KIND[prev.kind]}`;
}

/** The capture immediately before `id` in its walk, skipping any deleted one (MC5). */
export function previousCapture<T extends { id: string; t: number }>(captures: T[], id: string, deleted: ReadonlySet<string>): T | null {
  const ordered = [...captures].sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
  const at = ordered.findIndex((c) => c.id === id);
  for (let i = at - 1; i >= 0; i--) if (!deleted.has(ordered[i].id)) return ordered[i];
  return null;
}

export interface ArrivalInput {
  street: string | null;
  town: string | null;
  t: number;
  now: number;
  /** Walked time into its walk, or null for a moment outside a walk. */
  walkedMs: number | null;
  prev: { kind: CaptureKind; walkedGapMs: number } | null;
}

/** The whole line (MC1, MC3, MC4, MC5): "Hope Street, Fox Point · Tuesday evening · Ten minutes in, just after a photo". */
export function arrivalLine(o: ArrivalInput): string {
  const after = o.walkedMs == null ? null : justAfter(o.prev);
  const into = `${minutesInLine(o.walkedMs)}${after ? `, ${after}` : ''}`;
  return [placeLine(o), dayPartLine(o.t, o.now), into].join(' · ');
}
