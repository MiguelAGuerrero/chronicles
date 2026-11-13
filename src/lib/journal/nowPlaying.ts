// @layer shell
/**
 * Who holds the sound on the journal's page: one voice note plays at a time, and a recording takes it from any
 * note (nothing plays over a recording, JN14). A note claims it when it starts and stops when another claims it.
 */
import { createStore, type Store } from '../store';

/** The id a recording claims with. */
export const RECORDING = 'recording';

export interface NowPlaying {
  /** The piece (or `RECORDING`) that holds the sound, or null. */
  store: Store<string | null>;
  claim(id: string): void;
  /** Lets go, but only if `id` still holds it: a note told to stop must not clear the one that took over. */
  release(id: string): void;
}

export function createNowPlaying(): NowPlaying {
  const store = createStore<string | null>(null);
  return {
    store,
    claim: (id) => store.set(id),
    release: (id) => store.set((cur) => (cur === id ? null : cur)),
  };
}

/** The app's one. */
export const nowPlaying = createNowPlaying();
