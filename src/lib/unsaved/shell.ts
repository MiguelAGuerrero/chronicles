// @layer shell
/**
 * The one holder of every capture whose save failed (specs/unsaved-captures, decision 0194: "One app-wide holder"). It
 * outlives every screen, so leaving one drops nothing (UN1); every screen with capture pills shows what it holds (UN2);
 * both Stops ask it what one walk holds (UN5). In memory only, while the app is open (UN15): nothing is written to
 * storage. Its file effects are passed in, so a Node test loads it.
 */
import { createStore } from '../store';
import { letGoFiles, type Unsaved } from './core';

export interface UnsavedPorts {
  /** Lets go of a picker's or recorder's file never kept. */
  dropTemp(uri: string | null): void;
  /** Removes kept files. */
  removeMedia(refs: string[]): Promise<unknown>;
  newId(): string;
}

/** A memo lost as its screen went: said once by the next screen in front (UN13). */
export interface Lost {
  id: string;
  walkId: string | null;
  line: string;
}

export interface UnsavedState {
  list: Unsaved[];
  lost: Lost[];
}

/** Which held captures a Retry takes: the photo pill's, the memo pill's, or all. */
export type Which = 'shots' | 'memos' | 'all';

const isOf = (which: Which) => (x: Unsaved) => which === 'all' || (which === 'memos') === (x.kind === 'voice');

export function createUnsaved(p: UnsavedPorts) {
  const store = createStore<UnsavedState>({ list: [], lost: [] });
  const patch = (id: string, change: Partial<Unsaved>) =>
    store.set((s) => ({ ...s, list: s.list.map((x) => (x.id === id ? { ...x, ...change } : x)) }));
  return {
    store,
    /** Holds one more, after every one held before it (UN3). Resolves its id. */
    hold<S>(e: Omit<Unsaved<S>, 'id' | 'retrying'>): string {
      const id = p.newId();
      store.set((s) => ({ ...s, list: [...s.list, { ...e, id, retrying: false } as Unsaved] }));
      return id;
    },
    all(): Unsaved[] {
      return store.get().list;
    },
    /** What one walk holds now, from every screen: what both Stops ask (UN5). */
    heldFor(walkId: string): Unsaved[] {
      return store.get().list.filter((x) => x.walkId === walkId);
    },
    /** A Retry takes what no Retry under way has taken, in the order held (UN3). */
    take(which: Which = 'all'): Unsaved[] {
      const taken = store.get().list.filter((x) => !x.retrying && isOf(which)(x));
      if (!taken.length) return [];
      const ids = new Set(taken.map((x) => x.id));
      store.set((s) => ({ ...s, list: s.list.map((x) => (ids.has(x.id) ? { ...x, retrying: true } : x)) }));
      return taken.map((x) => ({ ...x, retrying: true }));
    },
    /** A Retry's end: kept and gone, or held again with its kept file, if any, and why (UN3, UN12). */
    settle(id: string, r: { kept: true } | { kept: false; path: string | null; outOfSpace: boolean }) {
      if (r.kept) {
        store.set((s) => ({ ...s, list: s.list.filter((x) => x.id !== id) }));
        return;
      }
      const was = store.get().list.find((x) => x.id === id);
      if (!was) return;
      patch(id, { retrying: false, path: r.path ?? was.path, outOfSpace: r.outOfSpace, said: true });
    },
    /** The second hold of Stop: the walk's held captures go, and their files with them (UN8). */
    async letGo(walkId: string): Promise<void> {
      const going = store.get().list.filter((x) => x.walkId === walkId);
      if (!going.length) return;
      store.set((s) => ({ ...s, list: s.list.filter((x) => x.walkId !== walkId) }));
      const { temps, kept } = letGoFiles(going);
      for (const uri of temps) p.dropTemp(uri);
      if (kept.length) await p.removeMedia(kept).catch(() => {});
    },
    /** Held captures no screen in front has said yet (UN9). */
    unsaid(): Unsaved[] {
      return store.get().list.filter((x) => !x.said);
    },
    said(id: string) {
      patch(id, { said: true });
    },
    /** A memo with nothing to keep, lost as its screen went (UN13). */
    lost(walkId: string | null, line: string) {
      store.set((s) => ({ ...s, lost: [...s.lost, { id: p.newId(), walkId, line }] }));
    },
    /** The lost memos waiting to be said; each is said once. */
    takeLost(): Lost[] {
      const lost = store.get().lost;
      if (lost.length) store.set((s) => ({ ...s, lost: [] }));
      return lost;
    },
  };
}

export type UnsavedHolder = ReturnType<typeof createUnsaved>;
