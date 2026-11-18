// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { Turn, TurnSay } from './types';

/*
 * One fix of a guided drive (RE20, RE22-RE24): where the fix is along the way, the turn ahead of it and how far, and whether it
 * has left the way. Leaving is never told to the screen as such: off the way there is no turn to show, and after a set distance
 * driven off it the way is asked for again. A turn behind the fix is never ahead of it again.
 */
export const DRIVE_RULES = {
  /** Further than this from the way's line is off it: a wide road, a fix's error and a lay-by are all inside it. */
  offM: 120,
  /** Driven this far since leaving the way, the way is asked for again: a wait by distance, never by time. */
  againM: 400,
  /** A turn within this behind the fix is behind; the road's last stretch shorter than this has nothing to say. */
  nearM: 30,
  /** RE25: a turn is spoken once, when it is this near. */
  sayM: 400,
} as const;

export interface DriveStep {
  /** Off the way: no turn is shown. */
  off: boolean;
  /** The turn ahead and how far to it; 'on' when no turn is left, with what is left of the road; null off the way or at its end. */
  turn: { say: TurnSay | 'on'; toM: number; /** Which turn it is (where along the way), so it is spoken once; null for the road's last stretch. */ id: number | null } | null;
  /** Where the way was left, kept from fix to fix; null on it. */
  left: LngLat | null;
  /** The way should be found again from here. */
  again: boolean;
}

/** The nearest place on the path to a point: how far along, and how far off. */
function locate(path: readonly LngLat[], here: LngLat): { alongM: number; offM: number; totalM: number } {
  const k = Math.cos((here[1] * Math.PI) / 180);
  let best = { alongM: 0, offM: path.length ? distanceM(path[0], here) : Infinity };
  let m = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const seg = distanceM(a, b);
    const dx = (b[0] - a[0]) * k;
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, (((here[0] - a[0]) * k) * dx + (here[1] - a[1]) * dy) / len2)) : 0;
    const off = distanceM([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], here);
    if (off < best.offM) best = { alongM: m + seg * t, offM: off };
    m += seg;
  }
  return { ...best, totalM: m };
}

export function driveStep(path: readonly LngLat[], turns: readonly Turn[], here: LngLat, left: LngLat | null, rules: typeof DRIVE_RULES = DRIVE_RULES): DriveStep {
  const at = locate(path, here);
  if (at.offM > rules.offM) {
    const from = left ?? here;
    return { off: true, turn: null, left: from, again: distanceM(from, here) >= rules.againM };
  }
  const next = turns.find((t) => t.alongM > at.alongM + rules.nearM);
  const restM = at.totalM - at.alongM;
  const turn = next ? { say: next.say, toM: next.alongM - at.alongM, id: Math.round(next.alongM) } : restM > rules.nearM ? { say: 'on' as const, toM: restM, id: null } : null;
  return { off: false, turn, left: null, again: false };
}

/**
 * RE25: whether a turn is to be spoken at this fix: once, as it nears, and never otherwise. Nothing is spoken off the way, of the
 * road's last stretch, or of a turn already said.
 */
export function speakStep(turn: DriveStep['turn'], said: number | null, rules: Pick<typeof DRIVE_RULES, 'sayM'> = DRIVE_RULES): { say: TurnSay | null; said: number | null } {
  if (!turn || turn.say === 'on' || turn.id == null || turn.id === said || turn.toM > rules.sayM) return { say: null, said };
  return { say: turn.say, said: turn.id };
}
