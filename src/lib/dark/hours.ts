// @layer core

/*
 * After dark (DK7): OpenStreetMap's `opening_hours`, read in its common forms only, so a wrong guess is never drawn. Days and day
 * ranges (Mo-Fr, Sa,Su), several time ranges, a range past midnight (open into the next day), 24/7, off and closed, rules apart
 * by `;` with the later one winning for its days. Anything else (months, weeks, dates, public holidays, sunrise and sunset
 * times, an open end, a fallback, a comment) makes the whole value unknown. Pure: the day and minute are arguments.
 */

/** Minutes of the day, from and to; `to` at or before `from` runs past midnight. */
type Span = readonly [number, number];
/** Per weekday (0 Sunday ... 6 Saturday), the spans it opens; an empty list is closed. */
export type HoursRules = readonly (readonly Span[])[];

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const D = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
const DAYS_RE = new RegExp(`^${D}(?:-${D})?(?:,${D}(?:-${D})?)*$`);
const T = '\\d{1,2}:\\d{2}';
const TIMES_RE = new RegExp(`^${T}-${T}(?:,${T}-${T})*$`);

/** OpenStreetMap's week starts on Monday; JavaScript's on Sunday. */
const weekday = (osmIndex: number) => (osmIndex + 1) % 7;

function daysOf(token: string): number[] {
  const out = new Set<number>();
  for (const part of token.split(',')) {
    const [a, b] = part.split('-').map((d) => DAY_NAMES.indexOf(d as (typeof DAY_NAMES)[number]));
    if (b === undefined) out.add(weekday(a));
    else for (let i = a; ; i = (i + 1) % 7) {
      out.add(weekday(i));
      if (i === b) break;
    }
  }
  return [...out];
}

function minutes(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}

function spansOf(token: string): Span[] | null {
  const out: Span[] = [];
  for (const range of token.split(',')) {
    const [a, b] = range.split('-').map(minutes);
    if (a === null || b === null) return null;
    out.push([a, b]);
  }
  return out;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** The rules of an `opening_hours` value, or null when it is outside the common forms (unknown, DK7). */
export function parseHours(text: string): HoursRules | null {
  const value = text.trim();
  if (!value || /["|+]/.test(value)) return null;
  const week: (Span[] | undefined)[] = Array(7).fill(undefined);
  const rules = value
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*,\s*/g, ',')
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean);
  if (!rules.length) return null;
  for (const rule of rules) {
    if (rule === '24/7') {
      for (const d of ALL_DAYS) week[d] = [[0, 1440]];
      continue;
    }
    const tokens = rule.split(/\s+/);
    let days = ALL_DAYS;
    let rest = tokens;
    if (DAYS_RE.test(tokens[0])) {
      days = daysOf(tokens[0]);
      rest = tokens.slice(1);
    }
    if (rest.length !== 1) return null;
    const what = rest[0];
    let spans: Span[] | null;
    if (what === 'off' || what === 'closed') spans = [];
    else if (what === '24/7') spans = [[0, 1440]];
    else if (TIMES_RE.test(what)) spans = spansOf(what);
    else return null;
    if (!spans) return null;
    for (const d of days) week[d] = spans;
  }
  return week.map((s) => s ?? []);
}

/** DK7: open, closed or unknown at a minute of a weekday (0 Sunday ... 6 Saturday), in the place's own time. */
export function openAt(rules: HoursRules | null, day: number, minute: number): 'open' | 'closed' | 'unknown' {
  if (!rules) return 'unknown';
  for (const [from, to] of rules[day]) {
    if (to > from ? minute >= from && minute < to : minute >= from) return 'open';
  }
  // A range past midnight on the day before runs into this one.
  for (const [from, to] of rules[(day + 6) % 7]) {
    if (to <= from && minute < to) return 'open';
  }
  return 'closed';
}
