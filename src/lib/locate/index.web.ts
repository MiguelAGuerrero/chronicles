import { LOCATE_MAX_ACCURACY_M, LOCATE_MAX_AGE_MS, LOCATE_PROMPT_CAP_MS, LOCATE_TIMEOUT_MS, type LocateResult } from './types';

/**
 * The web's one fix, through `navigator.geolocation` for the same reasons as
 * the recorder (AGENTS.md: expo-location's web watch drops fixes and never
 * asks for high accuracy). Watches until a fix within LOCATE_MAX_ACCURACY_M,
 * or the timeout, then clears the watch. While the browser is still asking
 * for permission, the timeout waits for the answer (audit: a slow "Allow"
 * read as no location), up to LOCATE_PROMPT_CAP_MS.
 */
export function locateOnce(timeoutMs = LOCATE_TIMEOUT_MS): Promise<LocateResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve({ at: null, reason: 'unavailable' });
  return new Promise<LocateResult>((resolve) => {
    let settled = false;
    let id: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cap = setTimeout(() => finish({ at: null, reason: 'timeout' }), LOCATE_PROMPT_CAP_MS);
    const startClock = () => {
      if (timer == null && !settled) timer = setTimeout(() => finish({ at: null, reason: 'timeout' }), timeoutMs);
    };
    const finish = (r: LocateResult) => {
      if (settled) return;
      settled = true;
      if (timer != null) clearTimeout(timer);
      clearTimeout(cap);
      if (id != null) navigator.geolocation.clearWatch(id);
      resolve(r);
    };
    id = navigator.geolocation.watchPosition(
      (p) => {
        startClock();
        if (p.coords.accuracy <= LOCATE_MAX_ACCURACY_M) finish({ at: [p.coords.longitude, p.coords.latitude] });
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) finish({ at: null, reason: 'denied' });
        // Other errors (no signal yet) wait for a later fix or the timeout.
        else startClock();
      },
      { enableHighAccuracy: true, maximumAge: LOCATE_MAX_AGE_MS },
    );
    if (settled && id != null) navigator.geolocation.clearWatch(id);
    // Already allowed (or no way to tell): the clock starts now. Still asking: it starts on the answer.
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (!perms?.query) startClock();
    else
      perms.query({ name: 'geolocation' as PermissionName }).then(
        (st) => {
          if (st.state !== 'prompt') startClock();
          else st.onchange = () => startClock();
        },
        () => startClock(),
      );
  });
}
