// @layer shell
// The diagnostics log's effects (specs/errors-handled, EH5, EH6): reports from the sink written to the store and
// pruned as they come; kept in memory for the session when the store can't take one; read back as text. The
// factory imports no singleton, so a Node test builds it over `fakePorts()`.
import type { Ports } from '../ports/types';
import { createStore } from '../store';
import { isRepeat, KEEP, kept, keepFrom, logText, messageOf, repeatKey, type Diagnostic } from './core';
import { attach, fallback, type Report } from './sink';

export interface DiagnosticsHeader {
  app: string;
  version: string;
  platform: string;
}

/**
 * The log's first day, so an empty log never claims a time before it (errors-handled audit 11): read from meta, or
 * kept now. The key is read with getMeta and setMeta, which the meta key scan reads (FC8).
 */
function logBegan(p: Pick<Ports, 'db' | 'clock'>): Promise<number> {
  return p.db.getMeta('diagnostics_since').then(
    (raw) => {
      const at = raw ? Number(raw) : NaN;
      if (Number.isFinite(at)) return at;
      const now = p.clock.now();
      return p.db.setMeta('diagnostics_since', String(now)).then(() => now, fallback('diagnostics · since', now, 'the log’s first day, kept'));
    },
    (e: unknown) => fallback('diagnostics · since', p.clock.now(), 'the log’s first day, read')(e),
  );
}

export function createDiagnostics(p: Pick<Ports, 'db' | 'clock' | 'newId'>) {
  /** Entries the store could not take, kept for the session and shared with the rest (EH5). */
  const session: Diagnostic[] = [];
  const keepInMemory = (d: Diagnostic) => {
    session.push(d);
    if (session.length > KEEP.entries) session.shift();
  };
  const note = (place: string, e: unknown) => keepInMemory({ id: p.newId(), t: p.clock.now(), kind: 'cache', place, message: messageOf(e) });

  /** A store that refused an entry is not asked again this session: its failure would be one more report (audit 1). */
  let storeDown = false;
  /** The last write of each kind, place and message: a repeat within a minute is written once (audit 9). A failure
   * is one of the app's places with a kind and a message type, so the map stays small. */
  const lastWritten = new Map<string, number>();
  /** Told after each entry, so an open Share diagnostics reads the text again (audit 10). */
  const changes = createStore(0);
  const began = logBegan(p);

  const write = (r: Report) => {
    const same = repeatKey(r);
    if (isRepeat(lastWritten.get(same), r.t)) return;
    lastWritten.set(same, r.t);
    const d: Diagnostic = { id: p.newId(), ...r };
    changes.set((n) => n + 1);
    if (storeDown) return keepInMemory(d);
    p.db.addDiagnostic(d).then(
      () => p.db.pruneDiagnostics(keepFrom(p.clock.now()), KEEP.entries).then(() => {}, (e: unknown) => note('diagnostics · prune', e)),
      () => {
        storeDown = true;
        keepInMemory(d);
      },
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
    changes,
    /** The shared text (EH3), each entry by its day (`day`; never its time, audit 14). */
    async text(header: DiagnosticsHeader, day: (t: number) => string): Promise<string> {
      const now = p.clock.now();
      return logText(await entries(), { ...header, day: day(now), since: day(Math.max(keepFrom(now), await began)) }, day);
    },
  };
}
