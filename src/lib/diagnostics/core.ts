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

const NOT_BUILT = 'not built yet (errors-handled, tests first)';

/** Strips what an entry may never hold (EH3a). */
export function scrub(_message: string): string {
  throw new Error(NOT_BUILT);
}

/** The message of anything thrown, scrubbed and cut to one line. */
export function messageOf(_e: unknown): string {
  throw new Error(NOT_BUILT);
}

/** The entries kept: the newest KEEP.entries, none older than KEEP.days before `now` (EH6). */
export function kept(_entries: Diagnostic[], _now: number): Diagnostic[] {
  throw new Error(NOT_BUILT);
}

/** The text that is shared (EH3): a header, then the entries newest first, one line each. */
export function logText(
  _entries: Diagnostic[],
  _header: { app: string; version: string; platform: string; day: string; since: string | null },
  _when: (t: number) => string,
): string {
  throw new Error(NOT_BUILT);
}

/** Why a save failed, in words, when it is known (EH7); null otherwise. */
export function whyOf(_e: unknown): string | null {
  throw new Error(NOT_BUILT);
}

/** The failed saves with one more: a new failure of the same thing replaces the old. */
export function withFailed(_list: FailedSave[], _f: FailedSave): FailedSave[] {
  throw new Error(NOT_BUILT);
}

/** The one line for every failed save, in a clause, never a number (EH7, EH13); null when none. */
export function failedLine(_list: FailedSave[]): string | null {
  throw new Error(NOT_BUILT);
}
