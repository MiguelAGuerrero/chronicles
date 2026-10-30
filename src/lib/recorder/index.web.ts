import { db } from '../db';
import { bearingDeg, distanceM, stepToward } from '../geo';
import type { LngLat, TracePoint } from '../types';
import { emit, subscribe } from './emitter';
import type { Recorder, RecorderSource } from './types';

/**
 * Web fallback. Browsers stop delivering positions once the tab is hidden or
 * the screen locks, so this records only while the page is visible, holds a
 * screen wake lock to stay that way, and offers a simulated walker for
 * trying the loop from a desk.
 */

const SIM_SPEED_MS = 1.4; // walking pace
const SIM_SPEEDUP = 6; // so a desk test does not take an afternoon
const SIM_TICK_MS = 1000;

let walkId: string | null = null;
let watchId: number | null = null;
let simTimer: ReturnType<typeof setInterval> | null = null;
let simPos: LngLat | null = null;
let simTargets: LngLat[] = [];
let simClock = 0;
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
  if (!('geolocation' in navigator)) {
    return Promise.reject(new Error('This browser has no location access. Try the simulated walk.'));
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
            ? 'Location permission was denied. Allow it in the browser, or use the simulated walk.'
            : 'No location fix yet. Try again outdoors, or use the simulated walk.'));
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

async function startSim(id: string) {
  const last = (await db.getPoints(id)).at(-1);
  simPos = last ? [last.lon, last.lat] : null;
  simClock = last ? Math.max(last.t + SIM_TICK_MS, Date.now()) : Date.now();
  simTimer = setInterval(() => {
    if (!simPos) return;
    const target = simTargets[0];
    let course: number | null = null;
    let speed = 0;
    if (target) {
      const next = stepToward(simPos, target, SIM_SPEED_MS * SIM_SPEEDUP * (SIM_TICK_MS / 1000));
      course = bearingDeg(simPos, next);
      speed = SIM_SPEED_MS;
      simPos = next;
      if (distanceM(simPos, target) < 0.5) simTargets.shift();
    } else {
      return; // standing still: no fix, like a pocketed phone that has not moved
    }
    // Simulated time runs at walking pace so the trace looks like a real walk.
    simClock += SIM_TICK_MS * SIM_SPEEDUP;
    record({
      walk_id: id, t: simClock, lat: simPos[1], lon: simPos[0],
      accuracy_m: 5, speed, course,
    });
  }, SIM_TICK_MS);
}

function stopSim() {
  if (simTimer) clearInterval(simTimer);
  simTimer = null;
  simTargets = [];
}

let source: RecorderSource = 'gps';
const SOURCE_KEY = 'chronicles.recorder.source';

function rememberSource(src: RecorderSource | null) {
  try {
    if (src) localStorage.setItem(SOURCE_KEY, src);
    else localStorage.removeItem(SOURCE_KEY);
  } catch {}
}

function rememberedSource(): RecorderSource {
  try {
    return localStorage.getItem(SOURCE_KEY) === 'simulated' ? 'simulated' : 'gps';
  } catch {
    return 'gps';
  }
}

export const recorder: Recorder = {
  capabilities: { background: false, simulate: true },
  async start(id, src = 'gps') {
    source = src;
    if (src === 'gps') await startGps(id);
    else await startSim(id);
    walkId = id;
    rememberSource(src);
    await holdWakeLock();
  },
  async stop() {
    stopGps();
    stopSim();
    walkId = null;
    rememberSource(null);
    await wakeLock?.release().catch(() => {});
    wakeLock = null;
  },
  async resume(id) {
    // Sessions resume silently on reload, with the source they started with.
    // GPS needs no new prompt once the browser has granted it.
    const src = rememberedSource();
    await recorder.start(id, src).catch(() => recorder.start(id, 'simulated'));
  },
  isRecording: () => walkId != null,
  subscribe,
  now: () => (source === 'simulated' && simClock ? simClock : Date.now()),
  walkTo(target) {
    if (!simPos) {
      // The first tap places the walker; it walks from there.
      simPos = target;
      if (walkId) {
        simClock = Math.max(simClock, Date.now());
        record({ walk_id: walkId, t: simClock, lat: target[1], lon: target[0], accuracy_m: 5, speed: 0, course: null });
      }
      return;
    }
    simTargets.push(target);
  },
};
