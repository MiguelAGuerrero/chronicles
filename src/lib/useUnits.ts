// @layer view
import { useSyncExternalStore } from 'react';
import { getUnits, onUnits, type Units } from './units';

/**
 * The units setting, live (QL16): a component that formats distances calls
 * this so it redraws when the setting changes, even one that stays mounted
 * across the change (the recording bar under a minimized walk).
 */
export function useUnits(): Units {
  return useSyncExternalStore(onUnits, getUnits, getUnits);
}
