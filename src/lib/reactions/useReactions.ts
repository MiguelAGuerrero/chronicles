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

/** Every moment's reactions, for a map's pins (RX17): one read per map, never per pin. */
export function useReactionSets(): ReadonlyMap<string, ReactionSet> {
  useEffect(() => {
    void reactions.load().catch(() => {});
  }, []);
  return useStore(reactions.store, selectSets);
}

const selectSets = (s: ReactionsState) => s.sets;
