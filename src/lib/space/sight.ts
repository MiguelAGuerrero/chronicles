// @layer shell
// @instance: stores (lib/store) of the storage notice's SpaceLines mounted and of the dark pills in Memories' column, held by SpaceLine and Memories' column, read by the space instance
import { createStore, type Store } from '../store';

/**
 * Where the storage notice (`SpaceLine`) can be seen (tend tabs T37, audit 32): the shell says and marks a line only
 * while the sight is clear, owes it otherwise, and looks again when the sight changes.
 */
export interface Sight {
  /** A line drawn now would be seen: a SpaceLine mounted, no dark pill standing beside it, no Modal over it. */
  clear(): boolean;
  /** A dark pill stands where the line would be: a line already up steps aside. */
  aside(): boolean;
  subscribe(listener: () => void): () => void;
}

/** How many SpaceLines are mounted (Memories' open line, Navigate, ready, the walk screen), each while it is. */
export const spaceLines = createStore(0);

/**
 * How many dark pills stand in Memories' column while it is in front (the open line's error, Edit offer, toast and
 * Retry pills, Memories' toast, its Undo pill): the notice waits while any stands (tend tabs audit 33; the owner's
 * answer of Nov 18, "The whole column").
 */
export const columnPills = createStore(0);

/** Counts one up until the returned function is called, once (as `holdModal`). */
export function holdCount(s: Store<number>): () => void {
  s.set((n) => n + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    s.set((n) => Math.max(0, n - 1));
  };
}

type Readable<T> = Pick<Store<T>, 'get' | 'subscribe'>;

/**
 * The sight from its parts: `pill`, the recording bar's Edit pill offered (`tabsHidden.barOfferUp`: mounted, folded or
 * not); `column`, the dark pills standing in Memories' column; `lines`, the SpaceLines mounted; `modals`, the Modals up
 * (`tabsHidden.modalsUp`).
 */
export function sightOf(o: { pill: Readable<boolean>; column: Readable<number>; lines: Readable<number>; modals: Readable<number> }): Sight {
  const aside = () => o.pill.get() || o.column.get() > 0;
  return {
    aside,
    clear: () => o.lines.get() > 0 && o.modals.get() === 0 && !aside(),
    subscribe(listener) {
      const offs = [o.pill.subscribe(listener), o.column.subscribe(listener), o.lines.subscribe(listener), o.modals.subscribe(listener)];
      return () => offs.forEach((off) => off());
    },
  };
}
