import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { db } from '../db';
import { reminderText } from '../discovery/recall';
import { checkRecalls } from '../discovery/recallCheck';
import { notifier } from '../notify';
import type { TracePoint } from '../types';
import { currentStatus, emit, setStatus, subscribe, subscribeStatus } from './emitter';
import { RecorderError, type Recorder } from './types';

/**
 * Background recording through expo-location's task API.
 *
 * Interim: the concept doc's plan is a small Swift module (CLLocationUpdate
 * live updates plus a CLBackgroundActivitySession), because expo-location
 * never relaunches an app the system has terminated. This keeps the same
 * contract (raw fixes appended to TracePoint, the walk's open flag as the
 * resume marker) so the module can replace it without touching the screens.
 *
 * This module must be evaluated when the bundle loads, before any route, so
 * the task exists when the OS relaunches the app headless for a location
 * batch. The root index.js imports it first for that reason.
 */

const TASK = 'chronicles-trace';
let currentWalk: string | null = null;

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error) {
    setStatus({ kind: 'error', message: error.message });
    return;
  }
  if (!data) return;
  // The task can fire in a fresh JS context after a relaunch, before any
  // screen has mounted, so the walk comes from the database.
  const walk = currentWalk ? await db.getWalk(currentWalk) : await db.getOpenWalk();
  if (!walk || !walk.open) {
    // In a headless relaunch with no open walk, updates outlived their walk
    // (the app died between stop and stopping updates): turn them off.
    if (!currentWalk) await Location.stopLocationUpdatesAsync(TASK).catch(() => {});
    return;
  }
  const points: TracePoint[] = data.locations
    // A batch delivered after stop belongs to no walk.
    .filter((l) => walk.ended_at == null || l.timestamp <= walk.ended_at)
    .map((l) => ({
      walk_id: walk.id,
      t: l.timestamp,
      lat: l.coords.latitude,
      lon: l.coords.longitude,
      accuracy_m: l.coords.accuracy ?? null,
      speed: l.coords.speed ?? null,
      course: l.coords.heading ?? null,
    }));
  try {
    await db.appendPoints(points);
    setStatus({ kind: 'recording' });
    emit(points);
    // In the background, a flagged capture comes back as a notification (R3);
    // in front, the walk screen shows it itself. Only a fix good enough to place.
    const last = [...points].reverse().find((p) => p.accuracy_m == null || p.accuracy_m <= 50);
    if (last && AppState.currentState !== 'active') {
      const due = await checkRecalls(walk.id, [last.lon, last.lat]).catch(() => []);
      if (due.length) await notifier.recall(reminderText(due), due.map((c) => c.id)).catch(() => {});
    }
  } catch (e) {
    setStatus({ kind: 'error', message: `Positions could not be saved: ${e instanceof Error ? e.message : e}` });
  }
});

/**
 * Foreground permission is all a walk needs: updates started while the app
 * is in front keep coming in the background on both platforms. "Always" is
 * asked for as an upgrade, and declining it does not block the walk.
 */
async function ensurePermission(): Promise<string | undefined> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    throw new RecorderError(
      fg.canAskAgain
        ? 'Location permission is needed to record a walk.'
        : 'Location is turned off for Chronicles. Turn it on in Settings to record a walk.',
      !fg.canAskAgain,
    );
  }
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    // Without it, Android 13+ hides the "walk in progress" notification.
    await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => {});
  }
  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  if (bg?.status !== 'granted') {
    return 'Recording continues in your pocket while this walk is open. Allow location "Always" in Settings if it stops when the app is closed.';
  }
  return undefined;
}

async function startUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) return;
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 0,
    timeInterval: 1000, // Android otherwise delivers every 500 ms at this accuracy
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Walk in progress',
      notificationBody: 'Chronicles is recording the streets you walk.',
    },
  });
}

// Location turned back on in Settings: pick the open walk back up on return.
AppState.addEventListener('change', (state) => {
  if (state === 'active' && currentWalk && currentStatus().kind === 'error') recorder.resume(currentWalk).catch(() => {});
});

export const recorder: Recorder = {
  capabilities: { background: true },
  async start(walkId) {
    const warning = await ensurePermission();
    currentWalk = walkId;
    setStatus({ kind: 'waiting' });
    await startUpdates();
    return { warning };
  },
  async stop() {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
    currentWalk = null;
    setStatus({ kind: 'idle' });
  },
  async resume(walkId) {
    currentWalk = walkId;
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      setStatus({ kind: 'error', message: 'Location is turned off for Chronicles, so this walk is not recording.', openSettings: true });
      return;
    }
    setStatus({ kind: 'waiting' });
    await startUpdates();
  },
  isRecording: () => currentWalk != null,
  subscribe,
  subscribeStatus,
};
