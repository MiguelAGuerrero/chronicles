// @layer core
import type { Reason, Thread } from './types';

/**
 * Every sentence the feed writes (RM6, RM14, RM22). Nothing is a score: no
 * digit ever reaches the screen from here, counts are words.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

/** A number as a word: up to nineteen, then twenty to fifty-nine; "many" beyond. */
export function numberWord(n: number): string {
  if (WORDS[n]) return WORDS[n];
  if (n >= 20 && n < 60) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${WORDS[n % 10]}` : ''}`;
  return 'many';
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Whole local days from `t` to `now`. */
export function daysAgo(t: number, now: number): number {
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
  if (years === 0) return `In ${month}`;
  return years <= 1 ? `${month} last year` : `${month}, ${numberWord(years)} years ago`;
}

/**
 * How long ago, alone, for a moment past a week: "last week", "three weeks ago", "last month", "five months ago", "a
 * year ago", "two years ago"; no month and no part of the day (tend map 11, decision 0172, the owner's "The span
 * alone"). With no month to anchor them the words count time elapsed (tend map audit 32, the owner's "Elapsed time",
 * Nov 16): whole months that have passed, and years as whole twelve-month spans, so Dec 15, 2024, heard on Jan 5,
 * 2026, is "a year ago".
 */
export function agoLine(t: number, now: number): string {
  const d = daysAgo(t, now);
  if (d < 14) return 'last week';
  if (d < 35) return `${numberWord(Math.floor(d / 7))} weeks ago`;
  const a = new Date(t);
  const b = new Date(now);
  // A month has passed only once its day of the month comes round again.
  const months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() - (b.getDate() < a.getDate() ? 1 : 0);
  if (months < 12) return months <= 1 ? 'last month' : `${numberWord(months)} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'a year ago' : `${numberWord(years)} years ago`;
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
      // A moment from the last weeks is said by its day; "a while ago" is for the long ago.
      return daysAgo(t, now) < 35 ? whenLine(t, now) : 'A while ago';
  }
}

/** A thread tile's line (RM14): a phrase for how it recurs, never a number. */
export function threadLine(t: Thread, now: number): string {
  if (t.seasonMonth != null) return `Comes back every ${MONTHS[t.seasonMonth]}`;
  if (t.last - t.first < 60 * DAY_MS) return 'Just beginning';
  if (now - t.last < 45 * DAY_MS && t.momentIds.length >= 5) return 'Often, lately';
  return 'Now and then';
}
