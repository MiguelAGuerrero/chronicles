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

export type MotionAccess = 'on' | 'off' | 'unavailable';

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
        setAccess('off');
        return access;
      }
      const available = await DeviceMotion.isAvailableAsync().catch(() => false);
      setAccess(available ? 'on' : 'unavailable');
      return access;
    },
    () => {
      setAccess('off');
      return access;
    },
  );
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
  const stillsCb = useRef(onStills);
  useEffect(() => {
    dotRef.current = dot;
    stillsCb.current = onStills;
  });
  useEffect(() => {
    stillsCb.current(stills);
  }, [stills]);

  // The walk's stored spells, once per walk.
  useEffect(() => {
    if (!walkId) return;
    let live = true;
    db.getStills(walkId)
      .then((s) => {
        if (live) setStills(s);
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
      const from = open;
      open = null;
      setStills((s) => s.map((x) => (x.started_at === from && x.ended_at == null ? { ...x, ended_at: at } : x)));
      db.endStill(walkId, at).catch(() => {});
    };
    const timer = setInterval(() => {
      const now = Date.now();
      const next = detector.state(now);
      if (next === state) return;
      // Standing began at the last step, a few seconds before the detector could be sure.
      if (next === 'still') begin(state === 'walking' ? now - STEPS.stillAfterMs : now);
      // Walking began a couple of steps before it was sure.
      else if (state === 'still') end(next === 'walking' ? now - 2 * STEPS.minGapMs : now);
      state = next;
      dotRef.current?.setMotion?.(next);
    }, CHECK_MS);
    return () => {
      clearInterval(timer);
      sub.remove();
      end(Date.now());
      dotRef.current?.setMotion?.('unknown');
    };
  }, [walkId, active, allowed, front]);
}
