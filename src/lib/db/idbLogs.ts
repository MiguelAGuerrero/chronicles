// @layer adapter
// The web store's logs beside the walker's data (moved out of index.web.ts, which a file over the size limit may
// not grow; decision 0178): memo transcripts (TX12) and the diagnostics log (decision 0179, EH5).
import type { Diagnostic } from '../diagnostics/core';
import type { Transcript } from '../transcript/core';
import type { Db } from './types';

type Logs = Pick<Db, 'setTranscript' | 'clearTranscript' | 'listTranscripts' | 'addDiagnostic' | 'getDiagnostics' | 'pruneDiagnostics'>;

/** The store's own helpers, passed in. */
export interface IdbHelpers {
  conn(): Promise<IDBDatabase>;
  store(name: string, mode?: IDBTransactionMode): Promise<IDBObjectStore>;
  done<T>(req: IDBRequest<T>): Promise<T>;
  committed(tx: IDBTransaction): Promise<void>;
}

const newestFirst = (a: Diagnostic, b: Diagnostic) => b.t - a.t || (a.id < b.id ? 1 : -1);

export function idbLogs(h: IdbHelpers): Logs {
  const put = async (name: string, row: unknown) => {
    const tx = (await h.conn()).transaction(name, 'readwrite');
    tx.objectStore(name).put(row);
    await h.committed(tx);
  };
  return {
    setTranscript: (t) => put('transcript', t),
    async clearTranscript(captureId) {
      const tx = (await h.conn()).transaction('transcript', 'readwrite');
      tx.objectStore('transcript').delete(captureId);
      await h.committed(tx);
    },
    async listTranscripts() {
      return (await h.done((await h.store('transcript')).getAll())) as Transcript[];
    },
    addDiagnostic: (d) => put('diagnostic', d),
    async getDiagnostics() {
      return ((await h.done((await h.store('diagnostic')).getAll())) as Diagnostic[]).sort(newestFirst);
    },
    async pruneDiagnostics(before, keep) {
      const tx = (await h.conn()).transaction('diagnostic', 'readwrite');
      const os = tx.objectStore('diagnostic');
      ((await h.done(os.getAll())) as Diagnostic[]).sort(newestFirst).forEach((r, i) => {
        if (r.t < before || i >= keep) os.delete(r.id);
      });
      await h.committed(tx);
    },
  };
}
