// @layer shell
// The diagnostics log's effects (specs/errors-handled, EH5, EH6): reports from the sink written to the store,
// pruned as they come; kept in memory for the session when the store can't take one; read back as text.
import type { Ports } from '../ports/types';
import type { Diagnostic } from './core';

export interface DiagnosticsHeader {
  app: string;
  version: string;
  platform: string;
}

const NOT_BUILT = 'not built yet (errors-handled, tests first)';

export function createDiagnostics(_p: Pick<Ports, 'db' | 'clock' | 'newId'>): {
  /** Every entry kept, newest first: the store's and the session's. */
  entries(): Promise<Diagnostic[]>;
  /** The shared text (EH3), with the local time of each entry by `when`. */
  text(header: DiagnosticsHeader, when: (t: number) => string): Promise<string>;
} {
  throw new Error(NOT_BUILT);
}
