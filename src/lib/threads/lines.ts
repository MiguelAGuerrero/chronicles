// @layer core

/**
 * Every sentence owner threads write (OT4, OT10, OT11, OT13). Counts are words, from a short fixed set:
 * nothing is a tally, and no digit but a date ever leaves here. This module reads nothing from the
 * Chronicle's own threads (OT19).
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A thread's size, one of four phrases. Never a number word above "a couple" (OT10). */
export function sizeWord(moments: number): string {
  if (moments <= 2) return 'a couple of moments';
  if (moments <= 5) return 'a few moments';
  if (moments <= 11) return 'several moments';
  return 'many moments';
}

/** "since March", with the year when it is not this one. */
export function sinceLine(firstT: number, now: number): string {
  const d = new Date(firstT);
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `since ${MONTHS[d.getMonth()]}${year}`;
}

/** "a few moments, since March". */
export function threadLine(count: number, firstT: number, now: number): string {
  return `${sizeWord(count)}, ${sinceLine(firstT, now)}`;
}

/** "Oct 20", with the year when it is not this one. */
export function dateLine(t: number, now: number): string {
  const d = new Date(t);
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : `, ${d.getFullYear()}`;
  return `${SHORT[d.getMonth()]} ${d.getDate()}${year}`;
}

/** Place and date, plus the walk's own line when it has one: a moment is never bare (OT9). */
export function contextLine(o: { place: string | null; t: number; walkLine: string | null; now: number }): string {
  const head = [o.place, dateLine(o.t, o.now)].filter(Boolean).join(', ');
  return o.walkLine ? `${head} · ${o.walkLine}` : head;
}

/** What a reply says it answers (OT4, OT24): the answered moment's place and date, both places in the words. */
export function answeringLine(o: { place: string | null; t: number; walkLine: string | null }, now: number): string {
  const head = ['answering', o.place ? `${o.place},` : '', dateLine(o.t, now)].filter(Boolean).join(' ');
  return o.walkLine ? `${head}, ${o.walkLine}` : head;
}

/** The viewer's note that a moment is in a thread. It never names the thread (OT11). */
export const IN_A_THREAD = 'in a thread';

/**
 * A thread's heading (OT13): the owner's name; else the oldest moment's place and date. The oldest moment's
 * own words are the second line, never the heading on their own.
 */
export function headingOf(o: { name: string | null; place: string | null; t: number; words: string | null }, now: number): { title: string; sub: string | null } {
  const sub = o.words ? clipWords(o.words.trim(), 80) || null : null;
  if (o.name) return { title: o.name, sub: null };
  return { title: [o.place, dateLine(o.t, now)].filter(Boolean).join(', '), sub };
}

/** Words cut at a space with an ellipsis, never mid-word unless one word is longer than the room (audit 16). */
export function clipWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = text.charAt(max) === ' ' ? max : cut.lastIndexOf(' ');
  return `${(at > 0 ? text.slice(0, at) : cut).trimEnd()}…`;
}

/** The words a reference is written with (moment references RF3, RF6): its place and date, "Pier, Sep 11". */
export function refLabel(o: { place: string | null; t: number }, now: number): string {
  return [o.place, dateLine(o.t, now)].filter(Boolean).join(', ');
}

/** A reference card's line (RF4, steward S1): place and date, and its walk, or that it was not on a walk. Never bare. */
export function refCardLine(o: { place: string | null; t: number; walkLine: string | null }, now: number): string {
  return contextLine({ place: o.place, t: o.t, walkLine: o.walkLine ?? 'not on a walk', now });
}

/** What the viewer says of a moment other notes mention (RF7): words, never a count. */
export const MENTIONED = 'Mentioned in a note';
