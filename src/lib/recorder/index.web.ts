import { db } from '../db';
import type { TracePoint } from '../types';
import { emit, setStatus, subscribe, subscribeStatus } from './emitter';
import { RecorderError, type Recorder } from './types';

/**
 * Web fallback: live tracing while the app is open. Browsers stop delivering
 * positions once the tab is hidden or the screen locks, so this holds a
 * screen wake lock while a walk is open, and any time spent hidden shows up
 * as a gap in the trace, which the snapper does not interpolate across.
 */

/** How long start waits for a first fix before carrying on in the waiting state. */
const FIRST_FIX_WAIT_MS = 10_000;

let walkId: string | null = null;
let watchId: number | null = null;
/** When the last fix came, so a passing watch error doesn't read as waiting for GPS. */
let lastFixAt = 0;
const WAITING_AFTER_MS = 10_000;
let pending: Promise<void> | null = null;
let wakeLock: { release(): Promise<void> } | null = null;

function record(p: TracePoint) {
  db.appendPoints([p]).then(
    () => {
      setStatus({ kind: 'recording' });
      emit([p]);
    },
    (e) => setStatus({ kind: 'error', message: `This position could not be saved: ${e?.message ?? e}` }),
  );
}

async function holdWakeLock() {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
  } catch {
    wakeLock = null;
  }
}

// A wake lock is dropped whenever the tab is hidden; take it again on return.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (walkId && document.visibilityState === 'visible') holdWakeLock();
  });
}

function stopWatch() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/**
 * Starts the one location watch. Resolves on the first fix or after
 * FIRST_FIX_WAIT_MS, whichever comes first; only a permission denial rejects.
 * Timeouts and lost signal leave the watch running in the waiting state.
 */
function watch(id: string): Promise<void> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.reject(new RecorderError('This browser has no location access, so it cannot record a walk.'));
  }
  stopWatch();
  walkId = id;
  lastFixAt = 0;
  setStatus({ kind: 'waiting' });
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (!settled) { settled = true; fn(); }
    };
    const timer = setTimeout(() => settle(resolve), FIRST_FIX_WAIT_MS);
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        clearTimeout(timer);
        settle(resolve);
        if (walkId !== id) return;
        lastFixAt = Date.now();
        record({
          walk_id: id,
          t: pos.timestamp,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          speed: pos.coords.speed,
          course: pos.coords.heading,
        });
      },
      (err) => {
        if (err.code !== err.PERMISSION_DENIED) {
          // No signal for now; the watch keeps trying. Browsers report these between good fixes
          // too (every fix, in Chromium): only without a fix for a while is it "waiting", or the
          // status (and the screen) flips twice a second. A longer silence is "Weak GPS" (perf).
          if (Date.now() - lastFixAt > WAITING_AFTER_MS) setStatus({ kind: 'waiting' });
          return;
        }
        clearTimeout(timer);
        stopWatch();
        walkId = null;
        const message = 'Location permission was denied. Allow location for this site in the browser settings, then try again.';
        setStatus({ kind: 'error', message });
        settle(() => reject(new RecorderError(message)));
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  });
}

export const recorder: Recorder = {
  capabilities: { background: false },
  async start(id) {
    pending = watch(id);
    try {
      await pending;
    } finally {
      pending = null;
    }
    // Stopped while waiting for the first fix: no screen lock to hold.
    if (walkId === id) await holdWakeLock();
    return {};
  },
  async stop() {
    stopWatch();
    walkId = null;
    setStatus({ kind: 'idle' });
    await wakeLock?.release().catch(() => {});
    wakeLock = null;
  },
  async resume(id) {
    // An open walk resumes on reload. Once the browser has granted location,
    // it does not prompt again. A second resume while one is pending joins it.
    if (walkId === id && (pending || watchId != null)) return pending ?? undefined;
    await recorder.start(id);
  },
  isRecording: () => walkId != null,
  subscribe,
  subscribeStatus,
};
