// @layer view
import { useMemo, useSyncExternalStore } from 'react';
import { formatDistance, formatDistanceNear, formatRange } from './format';
import { getUnits, onUnits, type Units } from './units';

/**
 * The units setting, live (QL16): a component that formats distances calls
 * this so it redraws when the setting changes, even one that stays mounted
 * across the change (the recording bar under a minimized walk).
 */
export function useUnits(): Units {
  return useSyncExternalStore(onUnits, getUnits, getUnits);
}

/**
 * The distance formatters bound to the units setting (QL16, tend map 23). A view that only calls `useUnits()` and
 * formats with the store's default is redrawn on a switch, but the React Compiler (decision 0207) keeps each memoized
 * line keyed on its own inputs (a tile's metres), never on the store, so the old words stayed on Explore's tiles while
 * their spoken labels changed. These take the units as an input the compiler sees: a switch makes them new, and every
 * line built with them is built again.
 */
export function useDistance() {
  const units = useUnits();
  return useMemo(
    () => ({
      units,
      distance: (m: number) => formatDistance(m, units),
      near: (m: number) => formatDistanceNear(m, units),
      range: (m: number) => formatRange(m, units),
    }),
    [units],
  );
}
