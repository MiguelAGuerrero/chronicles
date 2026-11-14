// @layer adapter
import { db } from '../db';
import { startOffNotice } from '../locate/notice';
import { watchLocatePermission } from '../locate/permission.web';
import type { TracePoint } from '../types';
import { emit, setStatus, subscribe, subscribeStatus } from './emitter';
import { refusalFollower } from './followPermission';
import { RecorderError, type Recorder } from './types';
import { caught } from '../diagnostics/sink';

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
/**
 * Following the site's permission after a refusal, so the walk records again once it is given back (O22): only for the
 * walk the store holds open and not paused (tend walk-screen audit 2-4). `recorder` is read when it resumes.
 */
const follower = refusalFollower({ watch: watchLocatePermission, walks: db, resume: (id) => recorder.resume(id).catch(caught('unexpected', 'recorder · resume after a refusal')) });

function unfollowPermission() {
  follower.stop();
}

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
  // One lock at a time: a restart (a return, the permission given back) takes a new one, so the old one goes first, or
  // it would keep the screen awake after the walk ends (tend walk-screen audit 6).
  const held = wakeLock;
  wakeLock = null;
  await held?.release().catch(caught('cache', 'lib/recorder/index · holdWakeLock'));
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
    if (walkId && document.visibilityState === 'visible') holdWakeLock().catch(caught('refused', 'lib/recorder/index · module'));
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
  // A start for another walk ends the following; the followed walk's own restart keeps it (audit 7).
  if (follower.following() !== id) unfollowPermission();
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
        // Refused: Locate's line with the recorder's own end, as a quiet notice (T26).
        const { message, tone } = startOffNotice('web');
        setStatus({ kind: 'error', message, tone });
        // Location given back, the walk records again by itself (decision 0172, O22): nothing is stored meanwhile, so
        // the off span reads in the trace as lost GPS does, a gap over a minute (never a pause).
        void follower.refused(id);
        settle(() => reject(new RecorderError(message, false, tone)));
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
    unfollowPermission();
    walkId = null;
    setStatus({ kind: 'idle' });
    await wakeLock?.release().catch(caught('refused', 'lib/recorder/index · stop'));
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
