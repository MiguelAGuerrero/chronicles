// @layer shell
/**
 * Reactions' shell (RX8, RX13, RX24, RX26; decision 0172): every moment's reactions read once into memory, as the
 * reminder bell reads reminders; a choice written at once, the map changed only after the write; a new page's choices
 * held until its moment is kept. Takes its effects as ports, so a Node test runs it over `fakePorts()`.
 */
import type { Ports } from '../ports/types';
import type { Moment } from '../types';
import { createStore, type Store } from '../store';
import { pick, rowsFor, setsOf, type ReactionId, type ReactionSet } from './core';
import { lensIds, lensMoments, lensRows, type LensGroup } from './lens';

export type ReactionsState = { sets: ReadonlyMap<string, ReactionSet>; loaded: boolean };

/** The set of a moment with none: one object, so a view's selector stays stable. */
export const NO_REACTIONS: ReactionSet = Object.freeze({}) as ReactionSet;
const NONE: ReadonlySet<string> = new Set();

export function createReactions(p: Pick<Ports, 'db' | 'clock'>) {
  const store: Store<ReactionsState> = createStore<ReactionsState>({ sets: new Map(), loaded: false });
  const held = new Map<string, ReactionSet>();
  let loading: Promise<void> | null = null;
  let seq = 0;
  // A read that failed still answers (reactions audit 6): Memories never waits on it, nothing is shown, and the next
  // load reads again.
  let failed = false;
  // One write at a time, each from the set as the one before it left it (reactions audit 1): two quick taps never
  // compute from the same old set.
  let chain: Promise<unknown> = Promise.resolve();
  const queued = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };

  const read = async () => {
    const mine = ++seq;
    let rows;
    try {
      rows = await p.db.listReactions();
    } catch (e) {
      if (mine === seq) {
        failed = true;
        store.set((s) => (s.loaded ? s : { ...s, loaded: true }));
      }
      throw e;
    }
    if (mine !== seq) return;
    failed = false;
    store.set({ sets: setsOf(rows), loaded: true });
  };
  const ready = () => (store.get().loaded && !failed ? Promise.resolve() : (loading ??= read().finally(() => { loading = null; })));

  const write = async (momentId: string, next: ReactionSet) => {
    const before = get(momentId);
    for (const row of rowsFor(momentId, before, next, p.clock.now())) await p.db.setReaction(row);
    // Only after the write: a failed one leaves what is shown as it was (RX8).
    seq++;
    store.set((s) => {
      const sets = new Map(s.sets);
      if (Object.keys(next).length) sets.set(momentId, next);
      else sets.delete(momentId);
      return { sets, loaded: s.loaded };
    });
  };

  function get(momentId: string): ReactionSet {
    return store.get().sets.get(momentId) ?? NO_REACTIONS;
  }

  return {
    store,
    /** Reads every moment's reactions (once, or again with `fresh`, as a lens does when it is shown: RX26). */
    async load(fresh = false) {
      if (fresh) return read();
      return ready();
    },
    get,
    /** A tap on a reaction for a kept moment (RX5, RX8): written at once. */
    async choose(momentId: string, tapped: ReactionId) {
      await ready();
      await queued(() => write(momentId, pick(get(momentId), tapped)));
    },
    /** A tap on a reaction for a page whose moment is not kept yet (RX13): held under the page's key. */
    hold(key: string, tapped: ReactionId) {
      held.set(key, pick(held.get(key) ?? NO_REACTIONS, tapped));
      return held.get(key)!;
    },
    held(key: string): ReactionSet {
      return held.get(key) ?? NO_REACTIONS;
    },
    /** The page's moment is kept (RX13): what was held is written onto it. */
    async keep(key: string, momentId: string) {
      const set = held.get(key);
      held.delete(key);
      if (!set || !Object.keys(set).length) return;
      await ready();
      await queued(() => write(momentId, { ...get(momentId), ...set }));
    },
    /** A page left without words (RX13): nothing it held is kept. */
    drop(key: string) {
      held.delete(key);
    },
    /** The Reactions list (RX23): only reactions a kept moment has. */
    async groups(hidden: ReadonlySet<string> = NONE): Promise<LensGroup[]> {
      await read();
      const sets = store.get().sets;
      // A moment waiting in the Undo window is not kept for a lens (reactions audit 5).
      const kept = (await p.db.getMomentsByIds([...sets.keys()])).filter((m) => !hidden.has(m.id));
      return lensRows(sets, new Set(kept.map((m) => m.id)));
    },
    /** A lens (RX24, RX26): the kept moments with the reaction, oldest first, read fresh. */
    async lens(reaction: ReactionId, hidden: ReadonlySet<string> = NONE): Promise<Moment[]> {
      await read();
      const sets = store.get().sets;
      return lensMoments(sets, reaction, (await p.db.getMomentsByIds(lensIds(sets, reaction))).filter((m) => !hidden.has(m.id)));
    },
  };
}

export type Reactions = ReturnType<typeof createReactions>;
