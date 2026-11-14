// @layer shell
// Where every caught error is reported (specs/errors-handled, EH5, EH7-EH10). Anything may import it, the db
// adapters included, without a cycle: it imports only core and the store. It holds what is reported until the
// log's shell attaches a writer (`createDiagnostics`, built at startup), and the failed saves until they are
// retried. Reporting never throws.
import { createStore, type Store } from '../store';
import { KEEP, messageOf, whyOf, withFailed, withoutFailed, type DiagnosticKind, type FailedSave } from './core';

/** A report before it is an entry: the shell gives it an id and writes it. */
export interface Report {
  t: number;
  kind: DiagnosticKind;
  place: string;
  message: string;
}

let writer: ((r: Report) => void) | null = null;
let clock: () => number = () => Date.now();
const waiting: Report[] = [];
const retries = new Map<string, () => Promise<unknown>>();

/** The failed saves, for the line (EH7). */
export const failedSaves: Store<FailedSave[]> = createStore<FailedSave[]>([]);

function push(kind: DiagnosticKind, place: string, message: string) {
  const r: Report = { t: clock(), kind, place, message };
  if (writer) writer(r);
  else {
    waiting.push(r);
    if (waiting.length > KEEP.entries) waiting.shift();
  }
}

/** Records an error of a kind, from a place ("module · function"). Never throws. */
export function report(kind: DiagnosticKind, place: string, e: unknown): void {
  let message: string;
  try {
    message = messageOf(e);
  } catch (unreadable) {
    message = `an error that could not be read (${unreadable instanceof Error ? unreadable.name : typeof unreadable})`;
  }
  push(kind, place, message);
}

/** A `.catch` handler that records the error: cache and background work (EH9), or a refusal (EH8). */
export function caught(kind: DiagnosticKind, place: string): (e: unknown) => void {
  return (e) => report(kind, place, e);
}

/** A `.catch` handler that records what the value stands in for and returns it (EH10); never the value itself. */
export function fallback<T>(place: string, value: T, standsFor: string): (e: unknown) => T {
  return (e) => {
    let why: string;
    try {
      why = messageOf(e);
    } catch (unreadable) {
      why = `unreadable (${typeof unreadable})`;
    }
    push('fallback', place, `in place of ${standsFor}: ${why}`);
    return value;
  };
}

/** A `.catch` handler for a save of the walker's: recorded, and said on screen with Retry (EH7). */
export function failedSave(place: string, what: string, retry: () => Promise<unknown>): (e: unknown) => void {
  return (e) => {
    report('save', place, e);
    const key = `${place}|${what}`;
    retries.set(key, retry);
    failedSaves.set((list) => withFailed(list, { key, what, why: whyOf(e) }));
  };
}

/** Repeats every failed save; each that succeeds leaves the line, each that fails again stays with its new reason. */
export async function retryFailed(): Promise<void> {
  for (const [key, retry] of [...retries]) {
    await retry().then(
      () => {
        retries.delete(key);
        failedSaves.set((list) => withoutFailed(list, key));
      },
      (e: unknown) => {
        report('save', key.split('|')[0], e);
        failedSaves.set((list) => list.map((f) => (f.key === key ? { ...f, why: whyOf(e) } : f)));
      },
    );
  }
}

/** The shell attaches its writer: everything reported before is handed to it, oldest first. */
export function attach(write: (r: Report) => void, now: () => number): void {
  writer = write;
  clock = now;
  for (const r of waiting.splice(0)) write(r);
}

/** Tests only: forget the writer, the reports and the failed saves. */
export function resetSink(): void {
  writer = null;
  clock = () => Date.now();
  waiting.length = 0;
  retries.clear();
  failedSaves.set([]);
}
