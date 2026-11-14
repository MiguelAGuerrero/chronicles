// @layer adapter
// The native store's logs beside the walker's data (moved out of makeSqliteDb, which a file over the size
// limit may not grow; decision 0178): memo transcripts (TX12) and the diagnostics log (decision 0179, EH5).
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Diagnostic } from '../diagnostics/core';
import type { Transcript } from '../transcript/core';
import type { Db } from './types';

type Logs = Pick<Db, 'setTranscript' | 'clearTranscript' | 'listTranscripts' | 'addDiagnostic' | 'getDiagnostics' | 'pruneDiagnostics'>;

/** The methods, over the store's one write queue and its connection. */
export function sqliteLogs(write: (task: (txn: SQLiteDatabase) => Promise<void>) => Promise<void>, conn: () => Promise<SQLiteDatabase>): Logs {
  return {
    setTranscript(r) {
      return write((t) =>
        t.runAsync(
          'INSERT OR REPLACE INTO transcript (capture_id, text, lang, from_ms, to_ms, made_at) VALUES (?, ?, ?, ?, ?, ?)',
          r.capture_id, r.text, r.lang, r.from_ms, r.to_ms, r.made_at,
        ).then(() => {}),
      );
    },
    clearTranscript(captureId) {
      return write((t) => t.runAsync('DELETE FROM transcript WHERE capture_id = ?', captureId).then(() => {}));
    },
    async listTranscripts() {
      return (await conn()).getAllAsync<Transcript>('SELECT * FROM transcript');
    },
    addDiagnostic(d) {
      return write((t) => t.runAsync('INSERT OR REPLACE INTO diagnostic (id, t, kind, place, message) VALUES (?, ?, ?, ?, ?)', d.id, d.t, d.kind, d.place, d.message).then(() => {}));
    },
    async getDiagnostics() {
      return (await conn()).getAllAsync<Diagnostic>('SELECT id, t, kind, place, message FROM diagnostic ORDER BY t DESC, id DESC');
    },
    pruneDiagnostics(before, keep) {
      return write(async (t) => {
        await t.runAsync('DELETE FROM diagnostic WHERE t < ?', before);
        await t.runAsync('DELETE FROM diagnostic WHERE id NOT IN (SELECT id FROM diagnostic ORDER BY t DESC, id DESC LIMIT ?)', keep);
      });
    },
  };
}
