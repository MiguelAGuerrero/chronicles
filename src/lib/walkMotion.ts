import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { db } from './db';
import type { DotSource } from './liveDot';
import { StepDetector, STEPS, type MotionState } from './steps';
import type { Still } from './types';

/**
 * The walk's motion (Motion, MO1-MO10): Expo's DeviceMotion, read only while a
 * walk is open and on screen, through the step detector. It tells the live dot
 * whether the walker is walking, and keeps still spells with the walk.
 */

/** On; off (not asked yet in this session); denied (declined, so only Settings can turn it on); unavailable. */
export type MotionAccess = 'on' | 'off' | 'denied' | 'unavailable';

let access: MotionAccess = 'off';
const listeners = new Set<(a: MotionAccess) => void>();
function setAccess(a: MotionAccess) {
  access = a;
  for (const cb of listeners) cb(a);
}

/**
 * Asks for motion access (MO1). Call it first thing in a tap, before any other
 * await: an iPhone's browser shows its prompt only straight from a tap.
 * Declined or unavailable, the walk goes on as before (MO2).
 */
export function askMotion(): Promise<MotionAccess> {
  let asked: Promise<{ granted: boolean }>;
  try {
    asked = DeviceMotion.requestPermissionsAsync();
  } catch {
    setAccess('unavailable');
    return Promise.resolve(access);
  }
  return asked.then(
    async (r) => {
      if (!r.granted) {
        setAccess('denied');
        return access;
      }
      const available = await DeviceMotion.isAvailableAsync().catch(() => false);
      setAccess(available ? 'on' : 'unavailable');
      return access;
    },
    () => {
      setAccess('denied');
      return access;
    },
  );
}

/**
 * After a reload or a relaunch into an open walk, turns motion back on where
 * the phone allows it without a tap (motion audit 4): a native app or a
 * browser that needs no prompt. An iPhone's browser needs a tap: "Turn on".
 */
export async function restoreMotion(): Promise<void> {
  if (access === 'on') return;
  const needsTap = Platform.OS === 'web' && typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';
  if (needsTap) return;
  const p = await DeviceMotion.getPermissionsAsync().catch(() => null);
  if (!p?.granted) return;
  const available = await DeviceMotion.isAvailableAsync().catch(() => false);
  setAccess(available ? 'on' : 'unavailable');
}

/** The access as it stands, kept current. */
export function useMotionAccess(): MotionAccess {
  const [a, setA] = useState(access);
  useEffect(() => {
    listeners.add(setA);
    return () => {
      listeners.delete(setA);
    };
  }, []);
  return a;
}

/** How often the detector's verdict is checked. */
const CHECK_MS = 500;

/**
 * Reads the sensors while `active` (a walk open, on screen, not paused) and
 * access is on; tells the dot, and keeps still spells. `onStills` gets the
 * walk's spells, stored and live, for reading the trace.
 */
export function useWalkMotion(
  walkId: string | null,
  active: boolean,
  dot: (DotSource & { setMotion?: (m: MotionState) => void }) | null,
  onStills: (s: Still[]) => void,
) {
  const allowed = useMotionAccess() === 'on';
  const [stills, setStills] = useState<Still[]>([]);
  const dotRef = useRef(dot);
  const stateRef = useRef<MotionState>('unknown');
  const stillsCb = useRef(onStills);
  useEffect(() => {
    dotRef.current = dot;
    stillsCb.current = onStills;
  });
  useEffect(() => {
    stillsCb.current(stills);
  }, [stills]);
  // A new dot (the live trace started again) is told where things stand (audit 9).
  useEffect(() => {
    dot?.setMotion?.(stateRef.current);
  }, [dot]);

  // The walk's stored spells, once per walk.
  useEffect(() => {
    if (!walkId) return;
    let live = true;
    restoreMotion().catch(() => {});
    db.getStills(walkId)
      .then(async (stored) => {
        // A spell left open by a reload, a crash or a killed app ends now: nothing was sensed since (motion audit 2).
        const open = stored.some((x) => x.ended_at == null);
        const at = Date.now();
        if (open) await db.endStill(walkId, at).catch(() => {});
        if (!live) return;
        const closed = stored.map((x) => (x.ended_at == null ? { ...x, ended_at: at } : x));
        // Merged, so a spell begun while the read was on its way is kept (audit 8).
        setStills((now) => [...closed, ...now.filter((x) => !closed.some((c) => c.started_at === x.started_at))].sort((a, b) => a.started_at - b.started_at));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [walkId]);

  const [front, setFront] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setFront(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!walkId || !active || !allowed || !front) return;
    const detector = new StepDetector();
    let state: MotionState = 'unknown';
    let open: number | null = null;
    if (Platform.OS !== 'web') DeviceMotion.setUpdateInterval(50);
    const sub = DeviceMotion.addListener((e) => {
      const g = e.accelerationIncludingGravity;
      if (g) detector.push({ t: Date.now(), x: g.x, y: g.y, z: g.z });
    });
    const begin = (at: number) => {
      open = at;
      setStills((s) => [...s, { walk_id: walkId, started_at: at, ended_at: null }]);
      db.startStill(walkId, at).catch(() => {});
    };
    const end = (at: number) => {
      if (open == null) return;
      open = null;
      // Any open spell ends, so the stored and the live lists can't disagree (audit 2).
      setStills((s) => s.map((x) => (x.ended_at == null ? { ...x, ended_at: Math.max(at, x.started_at) } : x)));
      db.endStill(walkId, at).catch(() => {});
    };
    const timer = setInterval(() => {
      const now = Date.now();
      const next = detector.state(now);
      if (next === state) return;
      // Standing began at the last step, a few seconds before the detector could be sure.
      if (next === 'still') begin(state === 'walking' ? now - STEPS.stillAfterMs : now);
      // Walking began at its first step, a few seconds before it was sure (audit 6).
      else if (state === 'still') end(next === 'walking' ? (detector.walkingSince() ?? now) : now);
      state = next;
      stateRef.current = next;
      dotRef.current?.setMotion?.(next);
    }, CHECK_MS);
    return () => {
      clearInterval(timer);
      sub.remove();
      end(Date.now());
      stateRef.current = 'unknown';
      dotRef.current?.setMotion?.('unknown');
    };
  }, [walkId, active, allowed, front]);
}
