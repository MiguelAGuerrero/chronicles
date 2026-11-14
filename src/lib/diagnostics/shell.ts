// @layer shell
// The diagnostics log's effects (specs/errors-handled, EH5, EH6): reports from the sink written to the store and
// pruned as they come; kept in memory for the session when the store can't take one; read back as text. The
// factory imports no singleton, so a Node test builds it over `fakePorts()`.
import type { Ports } from '../ports/types';
import { KEEP, kept, keepFrom, logText, messageOf, type Diagnostic } from './core';
import { attach, type Report } from './sink';

export interface DiagnosticsHeader {
  app: string;
  version: string;
  platform: string;
}

export function createDiagnostics(p: Pick<Ports, 'db' | 'clock' | 'newId'>) {
  /** Entries the store could not take, kept for the session and shared with the rest (EH5). */
  const session: Diagnostic[] = [];
  const keepInMemory = (d: Diagnostic) => {
    session.push(d);
    if (session.length > KEEP.entries) session.shift();
  };
  const note = (place: string, e: unknown) => keepInMemory({ id: p.newId(), t: p.clock.now(), kind: 'cache', place, message: messageOf(e) });

  const write = (r: Report) => {
    const d: Diagnostic = { id: p.newId(), ...r };
    p.db.addDiagnostic(d).then(
      () => p.db.pruneDiagnostics(keepFrom(p.clock.now()), KEEP.entries).then(() => {}, (e: unknown) => note('diagnostics · prune', e)),
      () => keepInMemory(d),
    );
  };
  attach(write, () => p.clock.now());

  async function entries(): Promise<Diagnostic[]> {
    const stored = await p.db.getDiagnostics().then(
      (rows) => rows,
      (e: unknown) => {
        note('diagnostics · read', e);
        return [] as Diagnostic[];
      },
    );
    return kept([...stored, ...session], p.clock.now());
  }

  return {
    entries,
    /** The shared text (EH3), with the local time of each entry by `when`. */
    async text(header: DiagnosticsHeader, when: (t: number) => string): Promise<string> {
      const now = p.clock.now();
      return logText(await entries(), { ...header, day: when(now), since: when(keepFrom(now)) }, when);
    },
  };
}
