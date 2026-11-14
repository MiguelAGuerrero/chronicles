// @layer core
// The diagnostics log's decisions (specs/errors-handled, EH3, EH3a, EH6, EH7, EH10; decision 0179): what an
// entry is, what it may never hold, what is kept, the text that is shared, and the failed-save line.

export type DiagnosticKind = 'save' | 'refused' | 'cache' | 'fallback' | 'unexpected';

/** One caught error, as the log keeps it. */
export interface Diagnostic {
  id: string;
  t: number;
  kind: DiagnosticKind;
  /** Where in the app: the module and the function. */
  place: string;
  /** The error's message, scrubbed (EH3a); a fallback's says what it stood in for (EH10). */
  message: string;
}

/** A save of something the walker made or chose that failed, until it is retried (EH7). */
export interface FailedSave {
  /** One per thing: a new failure of the same thing replaces the old. */
  key: string;
  /** What wasn't saved, as the walker knows it: "your destination", "part of this walk". */
  what: string;
  /** Why, in words, when known; never the platform's message. */
  why: string | null;
}

/** What the log keeps (EH6; the owner, Nov 14). */
export const KEEP = { entries: 500, days: 30 };
const DAY_MS = 24 * 3600 * 1000;
/** A message is one line, and short: enough to tell one failure from another. */
const MAX_MESSAGE = 300;

/** The kinds in words, for the shared text (EH3). */
const KIND_WORDS: Record<DiagnosticKind, string> = {
  save: 'A save failed',
  refused: 'Refused',
  cache: 'Cache work failed',
  fallback: 'Read in place of',
  unexpected: 'Unexpected',
};

/**
 * Strips what an entry may never hold (EH3a): a URL keeps its host (which service failed), never its path or
 * query (a tile's numbers are a place); file paths, ids, quoted text (a name, the walker's words), decimals (a
 * position) and long numbers (a time, a tile) go. The words around them stay.
 */
export function scrub(message: string): string {
  return message
    .replace(/\b((?:https?|wss?):\/\/)([^/\s?#'"]+)[^\s'"]*/g, '$1$2')
    .replace(/\bfile:\/\/\S*/g, '<path>')
    .replace(/"[^"]*"|`[^`]*`|“[^”]*”/g, '<text>')
    .replace(/(^|[\s(=:[{,])'[^'\n]*'(?=$|[\s),.:;\]}])/g, '$1<text>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>')
    .replace(/(?<![\w:/])\/(?:[\w.@%-]+\/)+[\w.@%-]*/g, '<path>')
    .replace(/\b[A-Za-z]:\\\S+/g, '<path>')
    .replace(/\b(?=[\w-]*\d)(?=[\w-]*[A-Za-z])[\w-]{8,}\b/g, '<id>')
    .replace(/-?\b\d+\.\d+\b/g, '<n>')
    .replace(/\b\d{4,}\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The message of anything thrown, scrubbed and cut to one line. */
export function messageOf(e: unknown): string {
  let raw: string;
  if (e instanceof Error) raw = e.message || e.name;
  else if (typeof e === 'string') raw = e;
  else if (e === undefined || e === null) raw = String(e);
  else {
    const m = (e as { message?: unknown }).message;
    raw = typeof m === 'string' ? m : Object.prototype.toString.call(e);
  }
  const s = scrub(raw);
  return s.length > MAX_MESSAGE ? `${s.slice(0, MAX_MESSAGE - 1)}…` : s;
}

const newestFirst = (a: Diagnostic, b: Diagnostic) => b.t - a.t || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/** The entries kept: the newest KEEP.entries, none older than KEEP.days before `now` (EH6). */
export function kept(entries: Diagnostic[], now: number): Diagnostic[] {
  const from = now - KEEP.days * DAY_MS;
  return entries.filter((e) => e.t >= from).sort(newestFirst).slice(0, KEEP.entries);
}

/** The cutoff before which entries go (EH6). */
export const keepFrom = (now: number) => now - KEEP.days * DAY_MS;

/** The text that is shared (EH3): a header, then the entries newest first, one line each. */
export function logText(
  entries: Diagnostic[],
  header: { app: string; version: string; platform: string; day: string; since: string | null },
  when: (t: number) => string,
): string {
  const head = [
    `${header.app} ${header.version} · ${header.platform} · shared ${header.day}`,
    'Each line: when, what happened, where in the app, and the error. No places, times of walks or words.',
    '',
  ];
  if (!entries.length) return [...head, header.since ? `Nothing has gone wrong since ${header.since}.` : 'Nothing has gone wrong.'].join('\n');
  const lines = [...entries].sort(newestFirst).map((e) => `${when(e.t)} · ${KIND_WORDS[e.kind]} · ${e.place} · ${e.message}`);
  return [...head, ...lines].join('\n');
}

/** Why a save failed, in words, when it is known (EH7); null otherwise. */
export function whyOf(e: unknown): string | null {
  const name = e instanceof Error ? e.name : '';
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  if (name === 'QuotaExceededError' || /quota|disk is full|no space|ENOSPC|storage is full/i.test(msg)) return 'the phone is full';
  return null;
}

/** The failed saves with one more: a new failure of the same thing replaces the old, in its place. */
export function withFailed(list: FailedSave[], f: FailedSave): FailedSave[] {
  return list.some((x) => x.key === f.key) ? list.map((x) => (x.key === f.key ? f : x)) : [...list, f];
}

/** The failed saves without the one that saved. */
export const withoutFailed = (list: FailedSave[], key: string): FailedSave[] => list.filter((x) => x.key !== key);

/** The one line for every failed save, in a clause, never a number (EH7, EH13); null when none. */
export function failedLine(list: FailedSave[]): string | null {
  if (!list.length) return null;
  const whats = list.map((f) => f.what);
  const joined = whats.length === 1 ? whats[0] : `${whats.slice(0, -1).join(', ')} and ${whats[whats.length - 1]}`;
  const subject = joined.charAt(0).toUpperCase() + joined.slice(1);
  const whys = [...new Set(list.map((f) => f.why).filter((w): w is string => !!w))];
  const verb = list.length === 1 ? 'wasn’t saved' : 'weren’t saved';
  // What to do, where it is known (errors-handled ui 3): a full phone needs room before Retry can work.
  const advice = whys.length === 1 && whys[0] === 'the phone is full' ? ' Free some room first.' : '';
  return `${subject} ${verb}${whys.length === 1 ? `: ${whys[0]}` : ''}.${advice}`;
}
