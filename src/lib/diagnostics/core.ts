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

/** Where a failed save happened: the line shows on that screen (errors-handled audit 7, the owner, Nov 16). */
export type SaveScreen = 'settings' | 'walk' | 'chronicle' | 'explore' | 'gallery';
/** The screens that draw the line. */
export type LineHost = 'walk' | 'ready' | 'chronicle' | 'explore' | 'gallery';
/** What each host shows: its own, and the settings on the walk and ready screens, where they are chosen. */
const HOST_SHOWS: Record<LineHost, SaveScreen[]> = {
  walk: ['walk', 'settings'],
  ready: ['settings'],
  chronicle: ['chronicle'],
  explore: ['explore'],
  gallery: ['gallery'],
};

/** A save of something the walker made or chose that failed, until it is retried (EH7). */
export interface FailedSave {
  /** One per thing: a new failure of the same thing replaces the old. */
  key: string;
  /** What wasn't saved, as the walker knows it: "your destination", "part of this walk". */
  what: string;
  /** Why, in words, when known; never the platform's message. */
  why: string | null;
  screen: SaveScreen;
  /** When it failed, in the order of failures: a hidden line shows again on a newer one (audit 15). */
  seq: number;
  /** A retry failed too (audit 16). */
  again: boolean;
}

/** An error the app throws with its own words: the only message kept as written (errors-handled audit 6). */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
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

/**
 * The message of anything thrown (EH3a; errors-handled audit 6, the owner, Nov 16): the app's own words
 * (`AppError`), scrubbed; from outside the app, only its error type, a code when it has one, and the reason in
 * words where one is known. A platform's message can name a place nobody quoted, so it is never kept.
 */
export function messageOf(e: unknown): string {
  if (e instanceof AppError) {
    const s = scrub(e.message || e.name);
    return s.length > MAX_MESSAGE ? `${s.slice(0, MAX_MESSAGE - 1)}…` : s;
  }
  if (typeof e === 'string') return 'a thrown string';
  if (e === undefined || e === null) return String(e);
  const named = e as { name?: unknown; code?: unknown };
  const name = typeof named.name === 'string' && /^[A-Za-z_][\w]{0,40}$/.test(named.name) ? named.name : e instanceof Error ? 'Error' : typeof e;
  const code = typeof named.code === 'string' && /^[A-Za-z_][\w]{0,40}$/.test(named.code) ? ` ${named.code}` : '';
  const why = whyOf(e);
  return `${name}${code}${why ? ` (${why})` : ''}`;
}

const newestFirst = (a: Diagnostic, b: Diagnostic) => b.t - a.t || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/** A repeat of the same failure within this is written once (errors-handled audit 9). */
const REPEAT_MS = 60_000;
/** What makes two reports the same failure. */
export const repeatKey = (r: { kind: DiagnosticKind; place: string; message: string }) => `${r.kind}|${r.place}|${r.message}`;
/** Whether a report at `t` repeats one written at `lastAt`. */
export const isRepeat = (lastAt: number | undefined, t: number) => lastAt != null && t - lastAt < REPEAT_MS;

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
  /** An entry's day: never its time (audit 14). */
  when: (t: number) => string,
): string {
  const head = [
    `${header.app} ${header.version} · ${header.platform} · shared ${header.day}`,
    'Each line: the day, what happened, where in the app, and the error. No places, times of walks or words.',
    '',
  ];
  if (!entries.length) return [...head, header.since ? `Nothing has gone wrong since ${header.since}.` : 'Nothing has gone wrong.'].join('\n');
  const lines = [...entries].sort(newestFirst).map((e) => `${when(e.t)} · ${KIND_WORDS[e.kind]} · ${e.place} · ${e.message}`);
  return [...head, ...lines].join('\n');
}

/** The words for a full store, true on a phone and in a browser (errors-handled audit 11). */
const ROOM = 'there’s no room left';

/** Why a save failed, in words, when it is known (EH7); null otherwise. */
export function whyOf(e: unknown): string | null {
  const name = e instanceof Error ? e.name : '';
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  if (name === 'QuotaExceededError' || /quota|disk is full|no space|ENOSPC|storage is full/i.test(msg)) return ROOM;
  return null;
}

/** The failed saves with one more: a new failure of the same thing replaces the old, in its place. */
export function withFailed(list: FailedSave[], f: FailedSave): FailedSave[] {
  return list.some((x) => x.key === f.key) ? list.map((x) => (x.key === f.key ? f : x)) : [...list, f];
}

/** The things in a clause, each named once (errors-handled audit 4). */
function clause(list: FailedSave[]): string {
  const whats = [...new Set(list.map((f) => f.what))];
  return whats.length === 1 ? whats[0] : `${whats.slice(0, -1).join(', ')} and ${whats[whats.length - 1]}`;
}

/** The one line for every failed save, in a clause, never a number (EH7, EH13); null when none. */
export function failedLine(list: FailedSave[]): string | null {
  if (!list.length) return null;
  const joined = clause(list);
  const subject = joined.charAt(0).toUpperCase() + joined.slice(1);
  const whys = [...new Set(list.map((f) => f.why).filter((w): w is string => !!w))];
  const many = new Set(list.map((f) => f.what)).size > 1;
  // A retry that failed too says so, so the tap visibly did something (audit 16).
  const verb = `${list.every((f) => f.again) ? 'still ' : ''}${many ? 'weren’t saved' : 'wasn’t saved'}`;
  // What to do, where it is known (errors-handled ui 3, audit 16): room first, then Retry.
  const advice = whys.length === 1 && whys[0] === ROOM ? ' Free some room, then Retry.' : '';
  return `${subject} ${verb}${whys.length === 1 ? `: ${whys[0]}` : ''}.${advice}`;
}

/** Retry's spoken name, with what it saves (errors-handled audit 20). */
export const retryLabel = (list: FailedSave[]): string => `Retry saving ${clause(list)}`;

/**
 * The failed saves a host shows (audit 7): its own screen's, and the settings on the walk and ready screens. On the
 * walk, a line hidden at `hiddenAt` stays hidden until something fails after it (audit 15).
 */
export function shownOn(list: FailedSave[], host: LineHost, hiddenAt: number): FailedSave[] {
  const mine = list.filter((f) => HOST_SHOWS[host].includes(f.screen));
  if (host === 'walk' && hiddenAt > 0 && mine.every((f) => f.seq <= hiddenAt)) return [];
  return mine;
}

/** The local day of `t`, as 2026-11-12, by the offset the device reports (`getTimezoneOffset`): never the time (audit 14). */
export function dayOf(t: number, offsetMin: number): string {
  return new Date(t - offsetMin * 60_000).toISOString().slice(0, 10);
}

/** The browser and its major version, from a user agent, for the web's header (audit 11); never the device. */
export function browserOf(ua: string): string {
  const pick: [RegExp, string][] = [
    [/Edg\/(\d+)/, 'Edge'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+)[.\d]* (?:Mobile\/\S+ )?Safari/, 'Safari'],
  ];
  for (const [re, name] of pick) {
    const m = re.exec(ua);
    if (m) return `${name} ${m[1]}`;
  }
  return 'a browser';
}
