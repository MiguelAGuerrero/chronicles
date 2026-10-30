import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { db } from '../db';
import type { TracePoint } from '../types';
import { emit, subscribe } from './emitter';
import type { Recorder } from './types';

/**
 * Background recording through expo-location's task API.
 *
 * Interim: the concept doc's plan is a small Swift module (CLLocationUpdate
 * live updates plus a CLBackgroundActivitySession), because expo-location
 * never relaunches an app the system has terminated. This keeps the same
 * contract (raw fixes appended to TracePoint, the walk's open flag as the
 * resume marker) so the module can replace it without touching the screens.
 */

const TASK = 'chronicles-trace';
let currentWalk: string | null = null;

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data) return;
  // The task can fire in a fresh JS context after a relaunch, before any
  // screen has mounted, so the walk id comes from the database.
  const walkId = currentWalk ?? (await db.getOpenWalk())?.id;
  if (!walkId) return;
  const points: TracePoint[] = data.locations.map((l) => ({
    walk_id: walkId,
    t: l.timestamp,
    lat: l.coords.latitude,
    lon: l.coords.longitude,
    accuracy_m: l.coords.accuracy ?? null,
    speed: l.coords.speed ?? null,
    course: l.coords.heading ?? null,
  }));
  await db.appendPoints(points);
  emit(points);
});

async function ensurePermission() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Location permission is needed to record a walk.');
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    throw new Error('Allow location "Always" so the walk keeps recording with the phone in your pocket.');
  }
}

async function startUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) return;
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 0,
    activityType: Location.LocationActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Walk in progress',
      notificationBody: 'Chronicles is recording the streets you walk.',
    },
  });
}

export const recorder: Recorder = {
  capabilities: { background: true },
  async start(walkId) {
    await ensurePermission();
    currentWalk = walkId;
    await startUpdates();
  },
  async stop() {
    currentWalk = null;
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  },
  async resume(walkId) {
    currentWalk = walkId;
    await startUpdates();
  },
  isRecording: () => currentWalk != null,
  subscribe,
};
