import { db } from '../db';
import type { TracePoint } from '../types';
import { emit, subscribe } from './emitter';
import type { Recorder } from './types';

/**
 * Web fallback: live tracing while the app is open. Browsers stop delivering
 * positions once the tab is hidden or the screen locks, so this holds a
 * screen wake lock while a walk is open, and any time spent hidden shows up
 * as a gap in the trace, which the snapper does not interpolate across.
 */

let walkId: string | null = null;
let watchId: number | null = null;
let wakeLock: { release(): Promise<void> } | null = null;

async function record(p: TracePoint) {
  await db.appendPoints([p]);
  emit([p]);
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

function startGps(id: string): Promise<void> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.reject(new Error('This browser has no location access, so it cannot record a walk.'));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!settled) { settled = true; resolve(); }
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
        if (!settled) {
          settled = true;
          stopGps();
          reject(new Error(err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location for this site in the browser settings, then try again.'
            : 'No location fix yet. Try again with a clearer view of the sky.'));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
  });
}

function stopGps() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

export const recorder: Recorder = {
  capabilities: { background: false },
  async start(id) {
    await startGps(id);
    walkId = id;
    await holdWakeLock();
  },
  async stop() {
    stopGps();
    walkId = null;
    await wakeLock?.release().catch(() => {});
    wakeLock = null;
  },
  async resume(id) {
    // An open walk resumes on reload. Once the browser has granted location,
    // it does not prompt again.
    await recorder.start(id);
  },
  isRecording: () => walkId != null,
  subscribe,
};
