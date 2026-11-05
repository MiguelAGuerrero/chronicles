// @layer core
import type { Reason, Thread } from './types';

/**
 * Every sentence the feed writes (RM6, RM14, RM22). Nothing is a score: no
 * digit ever reaches the screen from here, counts are words.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export const numberWord = (n: number) => WORDS[n] ?? 'many';
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Whole local days from `t` to `now`. */
function daysAgo(t: number, now: number): number {
  const a = new Date(t);
  const b = new Date(now);
  return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() - new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) / DAY_MS);
}

/** When a moment was, in words: "Today", "Tuesday", "Three weeks ago", "In March", "October last year". */
export function whenLine(t: number, now: number): string {
  const d = daysAgo(t, now);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return WEEKDAYS[new Date(t).getDay()];
  if (d < 14) return 'Last week';
  if (d < 35) return `${cap(numberWord(Math.floor(d / 7)))} weeks ago`;
  const month = MONTHS[new Date(t).getMonth()];
  const years = new Date(now).getFullYear() - new Date(t).getFullYear();
  if (d < 365 && years === 0) return `In ${month}`;
  if (d < 365) return `In ${month}`;
  return years <= 1 ? `${month} last year` : `${month}, ${numberWord(years)} years ago`;
}

/** The label over the resurfaced card: why this moment, now (RM6). */
export function labelFor(reason: Reason, t: number, now: number): string {
  switch (reason.kind) {
    case 'anniversary':
      return reason.years === 1 ? 'A year ago today' : `${cap(numberWord(reason.years))} years ago today`;
    case 'month': {
      const years = new Date(now).getFullYear() - new Date(t).getFullYear();
      return years <= 1 ? `Last ${MONTHS[new Date(t).getMonth()]}` : whenLine(t, now);
    }
    case 'thread':
      return `You keep coming back to ${reason.name.toLowerCase()}`;
    case 'older':
      return 'A while ago';
  }
}

/** A thread tile's line (RM14): a phrase for how it recurs, never a number. */
export function threadLine(t: Thread, now: number): string {
  if (t.seasonMonth != null) return `Comes back every ${MONTHS[t.seasonMonth]}`;
  if (t.last - t.first < 60 * DAY_MS) return 'Just beginning';
  if (now - t.last < 45 * DAY_MS && t.momentIds.length >= 5) return 'Often, lately';
  return 'Now and then';
}
