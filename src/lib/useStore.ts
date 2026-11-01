import { useCallback, useSyncExternalStore } from 'react';
import type { Store } from './store';

/**
 * Reads a slice of a shell's state and re-renders only when that slice
 * changes. `select` must return something stable for unchanged state: a
 * field, a primitive, or an object already in the state. A selector that
 * builds a new object or array on every call re-renders forever; derive
 * those with `useMemo` from stable slices instead.
 */
export function useStore<S, T>(store: Store<S>, select: (state: S) => T): T {
  const read = useCallback(() => select(store.get()), [store, select]);
  return useSyncExternalStore(store.subscribe, read, read);
}
