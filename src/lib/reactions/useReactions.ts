// @layer view
import { useCallback, useEffect } from 'react';
import { useStore } from '../useStore';
import type { ReactionSet } from './core';
import { reactions } from './index';
import { NO_REACTIONS, type ReactionsState } from './shell';

/** A moment's reactions (RX14-RX17), re-rendered when they change; read once for the app. */
export function useReactions(momentId: string | null | undefined): ReactionSet {
  useEffect(() => {
    void reactions.load().catch(() => {});
  }, []);
  const select = useCallback((s: ReactionsState) => (momentId ? s.sets.get(momentId) ?? NO_REACTIONS : NO_REACTIONS), [momentId]);
  return useStore(reactions.store, select);
}

/**
 * Every moment's reactions, for a map's pins (RX17): one read per map, never per pin. `enabled` is false on a map that
 * draws no capture pins (Explore, the planner), which then never reads them (reactions audit 20, RX30).
 */
export function useReactionSets(enabled: boolean): ReadonlyMap<string, ReactionSet> {
  useEffect(() => {
    if (enabled) void reactions.load().catch(() => {});
  }, [enabled]);
  return useStore(reactions.store, enabled ? selectSets : selectNone);
}

const selectSets = (s: ReactionsState) => s.sets;
const NO_SETS: ReadonlyMap<string, ReactionSet> = new Map();
const selectNone = () => NO_SETS;
