// @layer shell
// Where every caught error is reported (specs/errors-handled, EH5, EH7-EH10). Anything may import it, the db
// adapters included, without a cycle: it imports only core and the store. It holds what is reported until the
// log's shell attaches a writer (`createDiagnostics`, built at startup), and the failed saves until they are
// retried. Reporting never throws.
import { createStore, type Store } from '../store';
import { KEEP, messageOf, whyOf, withFailed, type DiagnosticKind, type FailedSave, type SaveScreen } from './core';

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
/** The order of failures and saves, so an older outcome never overrules a newer one (errors-handled audit 2, 5). */
let seq = 0;
/** A Retry in flight: a second tap waits for it (audit 5). */
let retrying: Promise<void> | null = null;

/** The failed saves, for the line (EH7), and where the walk's line was hidden (audit 15). */
export const failedSaves: Store<{ list: FailedSave[]; hiddenAt: number }> = createStore<{ list: FailedSave[]; hiddenAt: number }>({ list: [], hiddenAt: 0 });
const setList = (f: (list: FailedSave[]) => FailedSave[]) => failedSaves.set((s) => ({ ...s, list: f(s.list) }));

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

/** Where a save happened, and the thing it saves when the words alone don't tell two apart (a moment's reaction). */
export interface SaveOpts {
  screen: SaveScreen;
  key?: string;
}

/**
 * A save of something the walker made or chose (EH7): true when it was kept; false with the failure recorded and
 * said on its screen with Retry. A save that succeeds clears the same thing's older failure, so Retry never writes
 * an old value over a newer one (errors-handled audit 2). Never rejects.
 */
export function saved(place: string, what: string, save: () => Promise<unknown>, opts: SaveOpts): Promise<boolean> {
  const key = opts.key ?? `${place}|${what}`;
  const started = ++seq;
  return save().then(
    () => {
      setList((list) => list.filter((f) => f.key !== key || f.seq > started));
      if (!failedSaves.get().list.some((f) => f.key === key)) retries.delete(key);
      return true;
    },
    (e: unknown) => {
      report('save', place, e);
      const at = ++seq;
      retries.set(key, save);
      setList((list) => withFailed(list, { key, what, why: whyOf(e), screen: opts.screen, seq: at, again: false }));
      return false;
    },
  );
}

async function retryAll(): Promise<void> {
  for (const [key, retry] of [...retries]) {
    const was = failedSaves.get().list.find((f) => f.key === key)?.seq;
    await retry().then(
      () => {
        // Only the failure this retry answers goes: one that came while it was out stays (audit 5).
        if (failedSaves.get().list.find((f) => f.key === key)?.seq !== was) return;
        retries.delete(key);
        setList((list) => list.filter((f) => f.key !== key));
      },
      (e: unknown) => {
        report('save', key.split('|')[0], e);
        if (failedSaves.get().list.find((f) => f.key === key)?.seq !== was) return;
        setList((list) => list.map((f) => (f.key === key ? { ...f, why: whyOf(e), again: true } : f)));
      },
    );
  }
}

/** Repeats every failed save; each that succeeds leaves the line, each that fails again stays, said "still". */
export function retryFailed(): Promise<void> {
  if (!retrying) retrying = retryAll().finally(() => (retrying = null));
  return retrying;
}

/** The walk's line set aside until something new fails (audit 15, the owner, Nov 16). */
export function hideFailed(): void {
  failedSaves.set((s) => ({ ...s, hiddenAt: seq }));
}

/** The walk ended: a line hidden during it is said again (audit 15). */
export function walkEnded(): void {
  failedSaves.set((s) => ({ ...s, hiddenAt: 0 }));
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
  seq = 0;
  retrying = null;
  failedSaves.set({ list: [], hiddenAt: 0 });
}
