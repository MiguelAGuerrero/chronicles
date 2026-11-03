import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { setLastFix } from './lastFix';
import { locateOnce } from './locate';
import type { LocateResult } from './locate/types';
import type { LngLat } from './types';

/** What a Locate tap says when no fix came, for the screen's error banner. */
export type LocateError = { message: string; openSettings?: boolean };

/** How far around the fix a Locate tap frames the map (QL10). */
export const LOCATE_FIT_M = 250;

/**
 * The banner for a Locate tap that found nothing (QL11). Denied says what the
 * recorder's start says when location is off, with Open Settings where the
 * platform has it (a browser's permission lives in the site settings); a
 * timeout or no location at all is one quiet line.
 */
export function locateError(reason: LocateResult['reason']): LocateError {
  if (reason === 'denied') {
    return Platform.OS === 'web'
      ? { message: 'Location permission was denied. Allow location for this site in the browser settings, then try again.' }
      : { message: 'Location is turned off for Chronicles. Turn it on in Settings to find your position.', openSettings: true };
  }
  return { message: 'Couldn’t find your position' };
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
