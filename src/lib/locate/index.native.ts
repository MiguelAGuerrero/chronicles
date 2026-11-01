import * as Location from 'expo-location';
import { LOCATE_MAX_ACCURACY_M, LOCATE_MAX_AGE_MS, LOCATE_TIMEOUT_MS, type LocateResult } from './types';

/**
 * Watches location until a fix within LOCATE_MAX_ACCURACY_M arrives, or
 * LOCATE_TIMEOUT_MS passes, then stops watching. Asks for foreground
 * permission only now, when a moment is being made (M5).
 */
export async function locateOnce(timeoutMs = LOCATE_TIMEOUT_MS): Promise<LocateResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { at: null, reason: 'denied' };
  } catch {
    return { at: null, reason: 'unavailable' };
  }
  const asked = Date.now();
  return new Promise<LocateResult>((resolve) => {
    let sub: Location.LocationSubscription | null = null;
    let settled = false;
    const finish = (r: LocateResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub?.remove();
      resolve(r);
    };
    const timer = setTimeout(() => finish({ at: null, reason: 'timeout' }), timeoutMs);
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 }, (p) => {
      const acc = p.coords.accuracy;
      // A cached fix can be accurate but minutes old (from before a drive): only fresh ones (audit).
      if (p.timestamp < asked - LOCATE_MAX_AGE_MS) return;
      if (acc != null && acc <= LOCATE_MAX_ACCURACY_M) finish({ at: [p.coords.longitude, p.coords.latitude] });
    })
      .then((s) => {
        if (settled) s.remove();
        else sub = s;
      })
      .catch(() => finish({ at: null, reason: 'unavailable' }));
  });
}
