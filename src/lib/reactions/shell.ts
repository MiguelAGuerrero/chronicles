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

export function createReactions(p: Pick<Ports, 'db' | 'clock'>) {
  const store: Store<ReactionsState> = createStore<ReactionsState>({ sets: new Map(), loaded: false });
  const held = new Map<string, ReactionSet>();
  let loading: Promise<void> | null = null;
  let seq = 0;

  const read = async () => {
    const mine = ++seq;
    const sets = setsOf(await p.db.listReactions());
    if (mine !== seq) return;
    store.set({ sets, loaded: true });
  };
  const ready = () => (store.get().loaded ? Promise.resolve() : (loading ??= read().finally(() => { loading = null; })));

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
      await write(momentId, pick(get(momentId), tapped));
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
      await write(momentId, { ...get(momentId), ...set });
    },
    /** A page left without words (RX13): nothing it held is kept. */
    drop(key: string) {
      held.delete(key);
    },
    /** The Reactions list (RX23): only reactions a kept moment has. */
    async groups(): Promise<LensGroup[]> {
      await read();
      const sets = store.get().sets;
      const kept = await p.db.getMomentsByIds([...sets.keys()]);
      return lensRows(sets, new Set(kept.map((m) => m.id)));
    },
    /** A lens (RX24, RX26): the kept moments with the reaction, oldest first, read fresh. */
    async lens(reaction: ReactionId): Promise<Moment[]> {
      await read();
      const sets = store.get().sets;
      return lensMoments(sets, reaction, await p.db.getMomentsByIds(lensIds(sets, reaction)));
    },
  };
}

export type Reactions = ReturnType<typeof createReactions>;
