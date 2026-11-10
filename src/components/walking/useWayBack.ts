import { useEffect, useMemo, useState } from 'react';
import { loadWayBack, saveWayBack } from '../../lib/nav/store';
import { CHOSEN_NOTICE, showsWayBack, wayBackTarget } from '../../lib/nav/wayBack';
import type { LngLat } from '../../lib/types';
import type { SetNotice } from './useWalkNotice';

/**
 * Walk me back (N1, N11, DW6-DW8, decision 0121): to the spot chosen, else where the last ride ended,
 * else the start, once there is somewhere to walk back from. The spot is this walk's, read again on a reload (DW7).
 */
export function useWayBack(a: { walkId: string | null; start: LngLat | null; landing: LngLat | null; here: LngLat | null; setNotice: SetNotice }) {
  const { walkId, setNotice } = a;
  const [chosen, setChosen] = useState<{ walkId: string; at: LngLat } | null>(null);
  useEffect(() => {
    if (!walkId) return;
    let alive = true;
    loadWayBack(walkId).then((at) => {
      if (alive && at) setChosen({ walkId, at });
    }, () => {});
    return () => {
      alive = false;
    };
  }, [walkId]);
  const chosenAt = chosen && chosen.walkId === walkId ? chosen.at : null;
  const wayBack = useMemo(() => wayBackTarget({ start: a.start, landing: a.landing, chosen: chosenAt }), [a.start, a.landing, chosenAt]);
  const awayFromStart = showsWayBack(wayBack, a.here);
  /** Walk back here (DW7): Walk me back leads to this spot for the rest of this walk, said once. */
  const choose = (id: string, at: LngLat) => {
    setChosen({ walkId: id, at });
    saveWayBack(id, at).catch(() => {});
    setNotice({ message: CHOSEN_NOTICE });
  };
  /** The compass takes Walk me back's place while that is away (CP2). */
  const compassSlot = (navigating: boolean): 'compass' | 'back' => (awayFromStart && !navigating ? 'compass' : 'back');
  return { wayBack, awayFromStart, choose, compassSlot };
}

export type WayBack = ReturnType<typeof useWayBack>;
