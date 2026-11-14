// @layer shell
// Where every caught error is reported (specs/errors-handled, EH5, EH7-EH10). Anything may import it, the db
// adapters included, without a cycle: it holds what is reported until the log's shell attaches a writer
// (`lib/diagnostics/index.ts`), and the failed saves until they are retried.
import type { Store } from '../store';
import type { DiagnosticKind, FailedSave } from './core';

/** A report before it is an entry: the shell gives it an id and writes it. */
export interface Report {
  t: number;
  kind: DiagnosticKind;
  place: string;
  message: string;
}

const NOT_BUILT = 'not built yet (errors-handled, tests first)';

export function report(_kind: DiagnosticKind, _place: string, _e: unknown): void {
  throw new Error(NOT_BUILT);
}
/** A `.catch` handler that records the error: cache and background work (EH9), or a refusal (EH8). */
export function caught(_kind: DiagnosticKind, _place: string): (e: unknown) => void {
  throw new Error(NOT_BUILT);
}
/** A `.catch` handler that records what the value stands in for and returns it (EH10). */
export function fallback<T>(_place: string, _value: T, _standsFor: string): (e: unknown) => T {
  throw new Error(NOT_BUILT);
}
/** A `.catch` handler for a save of the walker's: recorded, and said on screen with Retry (EH7). */
export function failedSave(_place: string, _what: string, _retry: () => Promise<unknown>): (e: unknown) => void {
  throw new Error(NOT_BUILT);
}
/** Repeats every failed save; each that succeeds leaves the line. */
export function retryFailed(): Promise<void> {
  throw new Error(NOT_BUILT);
}
/** The failed saves, for the line. */
export declare const failedSaves: Store<FailedSave[]>;
/** The shell attaches its writer: everything reported before is handed to it. */
export function attach(_write: (r: Report) => void, _now: () => number): void {
  throw new Error(NOT_BUILT);
}
/** Tests only: forget the writer, the reports and the failed saves. */
export function resetSink(): void {
  throw new Error(NOT_BUILT);
}
