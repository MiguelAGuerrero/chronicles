// @layer shell
import { captureBus, type CapturePatch } from '../captureBus';
import { createStore, type Store } from '../store';
import type { Ports } from '../ports/types';
import type { Capture, Walk } from '../types';
import { DEFAULT_EXTRACTORS, signalsOf } from './extractors';
import { EMPTY_PREFS, hideMoment, lessLike, parsePrefs, removeThread, renameThread, shown } from './prefs';
import type { MomentView, Prefs, SignalExtractor } from './types';
import { toMomentViews, wordsOf } from './views';


/** Meta: what the user chose (RM21), one JSON value; ids and terms only. */
export const PREFS_KEY = 'resurface_prefs';

export interface ResurfaceState {
  status: 'loading' | 'ready' | 'failed';
  /** Every moment of a stopped walk, and loose ones, oldest first. Deletes are applied by the view (RM19). */
  moments: MomentView[];
  walks: Record<string, Walk>;
  prefs: Prefs;
  /** Orders equals among the resurfaced; new on every open (RM8). */
  seed: string;
  /** Which of the resurfaced moments the top card shows. */
  index: number;
  /** The moment the top card showed at the last open: fixed for this open, so showing one never reorders the rest (RM8). */
  lastShownAtOpen: string | null;
}

export interface ResurfaceOptions {
  /** Where a memo's words come from, once something transcribes them (RM13). */
  transcript?: (c: Capture) => string | null;
  extractors?: SignalExtractor[];
}

/**
 * Chronicle's Memories (specs/resurfaced-moments): reads the moments, keeps
 * the user's choices in meta (RM21) and nothing else. Threads and the feed
 * are derived by `compose` each time the view needs them (RM23).
 */
export function createResurface(p: Pick<Ports, 'db' | 'clock'>, opts: ResurfaceOptions = {}) {
  const extractors = opts.extractors ?? DEFAULT_EXTRACTORS;
  const store: Store<ResurfaceState> = createStore<ResurfaceState>({ status: 'loading', moments: [], walks: {}, prefs: EMPTY_PREFS, seed: '0', index: 0, lastShownAtOpen: null });

  /** The saved choices; damage or nothing reads as none (RM21). */
  async function readPrefs(): Promise<Prefs> {
    try {
      const raw = await p.db.getMeta(PREFS_KEY);
      return (raw ? parsePrefs(JSON.parse(raw)) : null) ?? EMPTY_PREFS;
    } catch {
      return EMPTY_PREFS;
    }
  }

  /** Sets the choices at once, then keeps them. A write that fails leaves them on screen for this open. */
  async function setPrefs(next: Prefs): Promise<Prefs> {
    const before = store.get().prefs;
    store.set((s) => ({ ...s, prefs: next }));
    await p.db.setMeta(PREFS_KEY, JSON.stringify(next)).catch(() => {});
    return before;
  }

  return {
    store,
    /** On every open of Memories: the choices first (RM21), then the moments. */
    async load(): Promise<void> {
      try {
        const [prefs, captures, walks] = await Promise.all([
          readPrefs(),
          p.db.capturesBetween(0, Number.MAX_SAFE_INTEGER),
          p.db.listWalks(),
        ]);
        store.set({
          status: 'ready',
          moments: toMomentViews(captures, walks, opts.transcript),
          walks: Object.fromEntries(walks.map((w) => [w.id, w])),
          prefs: { ...EMPTY_PREFS, ...prefs },
          seed: String(p.clock.now()),
          index: 0,
          lastShownAtOpen: prefs?.lastShown ?? null,
        });
      } catch {
        store.set((s) => ({ ...s, status: 'failed' }));
      }
    },
    /** Another (RM8): the next resurfaced moment. The view takes it modulo how many there are. */
    another(): void {
      store.set((s) => ({ ...s, index: s.index + 1 }));
    },
    /** The top card showed this moment: kept, so the next open starts elsewhere (RM8). */
    async shown(id: string): Promise<void> {
      const prefs = store.get().prefs;
      if (prefs.lastShown === id) return;
      await setPrefs(shown(prefs, id));
    },
    /** Not this one (RM20). Returns the choices as they were, for Undo. */
    hide: (id: string) => setPrefs(hideMoment(store.get().prefs, id)),
    /** Show less like this (RM20): the moment, and the terms it is about. */
    less(id: string): Promise<Prefs> {
      const m = store.get().moments.find((x) => x.id === id);
      const terms = m ? signalsOf(m, extractors).map((s) => s.term) : [];
      return setPrefs(lessLike(store.get().prefs, id, terms));
    },
    rename: (term: string, name: string) => setPrefs(renameThread(store.get().prefs, term, name)),
    removeThread: (term: string) => setPrefs(removeThread(store.get().prefs, term)),
    /** A change made in the viewer (a note, a caption, an edit) shows here at once (RM18). */
    patch(id: string, change: CapturePatch): void {
      store.set((s) => ({
        ...s,
        moments: s.moments.map((m) => {
          if (m.id !== id) return m;
          const capture = { ...m.capture, ...change } as Capture;
          return { ...m, capture, words: wordsOf(capture, opts.transcript) };
        }),
      }));
    },
    /** Edit note in the viewer: stored first, then told to the other screens (QL25). */
    async saveNote(c: Capture, body: string): Promise<void> {
      await p.db.updateCapture(c.id, { body });
      captureBus.patch(c.walk_id, c.id, { body }, null);
      this.patch(c.id, { body });
    },
    /** Puts the choices back as they were (RM20's Undo). */
    async undo(before: Prefs): Promise<void> {
      await setPrefs(before);
    },
  };
}
