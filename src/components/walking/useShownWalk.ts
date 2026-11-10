import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useOpenWalkInfo } from '../OpenWalk';
import { feedback } from '../../lib/motion';
import { exitPlan } from '../../lib/readyNav';
import type { Walk } from '../../lib/types';

/**
 * One screen, ready or walking (NR1, NR6): the walk is the keeper's open walk. While Start writes the
 * walk's plan the screen stays ready (the walk reads its mode as it shows); once stopped, the walk stays
 * on screen until the replay replaces it, never flashing the ready state.
 */
export function useShownWalk() {
  const info = useOpenWalkInfo();
  const [holding, setHolding] = useState(false);
  const [ended, setEnded] = useState<Walk | null>(null);
  const shownWalk = holding ? null : info.walk ?? ended;
  // Kept by id: the keeper's row is re-read with each pause, and the walk's effects key on it.
  const [walk, setWalkShown] = useState<Walk | null>(shownWalk);
  if ((walk?.id ?? null) !== (shownWalk?.id ?? null)) setWalkShown(shownWalk);
  return { walk, shownWalk, setHolding, setEnded };
}

/** The chevron, Minimize and Back: to the tab beneath, Explore when there is none (NR4). */
export function useClose() {
  return useCallback(() => {
    feedback('tap');
    const to = exitPlan(router.canGoBack());
    if (to.kind === 'back') router.back();
    else router.replace(to.to);
  }, []);
}
