// @layer shell
import type { Ports } from '../ports/types';
import { createStore } from '../store';
import { wordsOf } from './core';

/**
 * A memo's words by piece id, read from the transcript cache (MX7). The resurface seam, the viewer and the thread
 * rows read them here and nowhere else (MX24); nothing here writes a transcript, so the app cannot edit one (MX3).
 */
export interface WordsState {
  words: Record<string, string>;
}

export function createWords(p: Pick<Ports, 'db'>) {
  const store = createStore<WordsState>({ words: {} });
  return {
    store,
    /** Reads every transcript again; a deleted row's words go (MX6). */
    async load() {
      const rows = await p.db.listTranscripts();
      const words: Record<string, string> = {};
      for (const r of rows) {
        const w = wordsOf(r);
        if (w) words[r.piece_id] = w;
      }
      store.set({ words });
    },
    /** The seam `ResurfaceOptions.transcript` reads: a memo's words, or null (silence and no row read as none). */
    transcript(c: { piece_id?: string | null }): string | null {
      return (c.piece_id && store.get().words[c.piece_id]) || null;
    },
    subscribe: store.subscribe,
  };
}
