import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { deletions } from './index';
import type { PendingState } from './pending';

/** The walk and capture ids every screen hides: waiting in the Undo window, or gone (D5). */
export function useHidden(): ReadonlySet<string> {
  return useSyncExternalStore(deletions.subscribe, deletions.hidden, deletions.hidden);
}

/** The Undo pill's state (D5, D6). */
export function usePendingState(): PendingState {
  return useSyncExternalStore(deletions.subscribe, deletions.state, deletions.state);
}

/** A list without what was deleted; the same array while nothing in it is hidden. */
export function useVisible<T extends { id: string }>(items: T[] | null | undefined): T[] {
  const hidden = useHidden();
  return useMemo(() => {
    const list = items ?? [];
    return list.some((x) => hidden.has(x.id)) ? list.filter((x) => !hidden.has(x.id)) : list;
  }, [items, hidden]);
}

/** Calls back once a delete reached storage, so a screen reads again (D9). */
export function useOnDeleted(fn: () => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  useEffect(() => deletions.onCommitted(() => ref.current()), []);
}
