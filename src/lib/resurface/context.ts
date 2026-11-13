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
  return streetAt(fix, segments, snappedId)?.name ?? null;
}

/**
 * The street at a fix and whether it was only found by nearness (audit 17): the street the moment snapped to is
 * stated bare; one found within 40 m of the fix is stated as "Near ...", because the fix may have been off.
 */
export function streetAt(fix: LngLat | null, segments: StreetSegment[], snappedId: string | null): { name: string; near: boolean } | null {
  if (!fix) return null;
  const near = segments.map((s) => ({ s, d: distanceToLinesM(fix, s.geometry) })).filter((x) => x.d <= STREET_REACH_M);
  const snapped = near.find((x) => x.s.id === snappedId);
  const best = snapped ?? near.sort((a, b) => a.d - b.d || (a.s.id < b.s.id ? -1 : 1))[0];
  const name = best?.s.name?.trim();
  return best && name ? { name, near: !snapped } : null;
}

/** The place line (MC1): only what is known. */
export function placeLine(o: { street: string | null; near?: boolean; town: string | null; complex?: { name: string; near: boolean } | null }): string {
  // CX11: a complex leads and the street stays, with its own "Near" when it was found only by nearness (complexes audit 14).
  const lead = o.complex ? (o.complex.near ? `Near ${o.complex.name}` : o.complex.name) : null;
  const street = o.street && o.near ? `Near ${o.street}` : o.street;
  return [lead, street, o.town].filter((x): x is string => !!x).join(', ') || NO_PLACE;
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

export const weekdayName = (t: number): string => WEEKDAYS[new Date(t).getDay()];

/**
 * The day with its part (MC4): "Tuesday evening", "Yesterday morning", "This afternoon", "Last Sunday morning",
 * else "Three weeks ago, evening". The small hours belong to the evening before (audit 10): 1:30 on Wednesday
 * is "Late Tuesday night", and 2 am this morning is "Late last night", never "Tonight".
 */
export function dayPartLine(t: number, now: number): string {
  const hour = new Date(t).getHours();
  if (hour < 5) {
    const evening = t - 5 * 60 * MIN;
    const d = daysAgo(evening, now);
    if (d <= 1) return 'Late last night';
    if (d < 7) return `Late ${weekdayName(evening)} night`;
    if (d < 14) return `Late last ${weekdayName(evening)} night`;
    return `${whenLine(evening, now)}, late night`;
  }
  const part = partOfDay(t);
  const d = daysAgo(t, now);
  if (d <= 0) return part === 'night' ? 'Tonight' : `This ${part}`;
  if (d === 1) return `Yesterday ${part}`;
  if (d < 7) return `${weekdayName(t)} ${part}`;
  if (d < 14) return `Last ${weekdayName(t)} ${part}`;
  return `${whenLine(t, now)}, ${part}`;
}

const KIND: Record<CaptureKind, string> = { photo: 'a photo', video: 'a video', voice: 'a voice memo', text: 'a note' };

/** "just after a photo" within two walked minutes, "after a photo" within ten (MC5, audit 20): its kind, never its words. */
export function justAfter(prev: { kind: CaptureKind; walkedGapMs: number } | null): string | null {
  if (!prev || prev.walkedGapMs > JUST_AFTER_MS) return null;
  return `${prev.walkedGapMs <= 2 * MIN ? 'just after' : 'after'} ${KIND[prev.kind]}`;
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
  /** The street was found by nearness, not the one the moment snapped to (audit 17). */
  streetNear?: boolean;
  town: string | null;
  /** CX11: the complex whose outline holds the fix, or lies within the street reach of it. */
  complex?: { name: string; near: boolean } | null;
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
  return [placeLine({ street: o.street, near: o.streetNear, town: o.town, complex: o.complex }), dayPartLine(o.t, o.now), into].join(' · ');
}

/**
 * The same facts in two parts, for the journal's dateline (chronicle journal JN5), which says the time itself:
 * the place, or null when nothing around the fix is known, and how far into its walk, or null outside one.
 */
export function arrivalParts(o: ArrivalInput): { place: string | null; into: string | null } {
  const place = placeLine({ street: o.street, near: o.streetNear, town: o.town, complex: o.complex });
  const after = o.walkedMs == null ? null : justAfter(o.prev);
  return { place: place === NO_PLACE ? null : place, into: o.walkedMs == null ? null : `${minutesInLine(o.walkedMs)}${after ? `, ${after}` : ''}` };
}
