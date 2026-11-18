// @layer view
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { setLastFix } from './lastFix';
import { locateOnce } from './locate';
import { locateNotice, type LocateError } from './locate/notice';
import type { LocateResult } from './locate/types';
import type { LngLat } from './types';

export type { LocateError } from './locate/notice';

/** How far around the fix a Locate tap frames the map (QL10). */
export const LOCATE_FIT_M = 250;

/** The banner for a Locate tap that found nothing (QL11; `locateNotice`, T17). */
export function locateError(reason: LocateResult['reason']): LocateError {
  return locateNotice(reason, Platform.OS === 'web' ? 'web' : 'native');
}

/**
 * One fix on demand, for a tab's Locate button (QL10-QL12): `locateOnce`
 * watches until a fix within 50 m or 10 s, then clears its own watch, so
 * nothing tracks after. The fix is kept as the last fix and handed to the
 * screen; a second tap while one is read does nothing. The handlers live in
 * a ref, so the callback never changes and reads the newest ones.
 */
export function useLocate(handlers: { onFix: (at: LngLat) => void; onError: (e: LocateError) => void }) {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const alive = useRef(true);
  const h = useRef(handlers);
  useEffect(() => {
    h.current = handlers;
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const locate = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    locateOnce(undefined, { fresh: true })
      .catch(() => ({ at: null, reason: 'unavailable' as const }))
      .then((r) => {
        running.current = false;
        if (!alive.current) return;
        setBusy(false);
        if (r.at) {
          setLastFix(r.at);
          h.current.onFix(r.at);
        } else {
          h.current.onError(locateError(r.reason));
        }
      });
  }, []);
  return { busy, locate };
}
