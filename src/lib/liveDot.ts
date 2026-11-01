import { bearingDeg, distanceM, MAX_ACCURACY_M, MAX_STALE_MS, projector } from './geo';
import type { LngLat, TracePoint } from './types';

/**
 * The walk map's dot, on its own (the live dot, Nov 1). It used to be the
 * newest point of a trace re-read every 2 s, so it lagged, slid back over
 * ground already walked when the reading settled, and its cone swung at
 * sharp angles. Now each fix updates it at once, through a small
 * position-and-speed filter (a Kalman filter per axis), and it is held
 * still unless the walker is clearly going somewhere. Display only: the
 * stored trace, distance and streets never read it. Pure: no clock, no I/O.
 */
export const LIVE_DOT = {
  /** How freely the walker's speed may change, m²/s³: low, since walking pace changes slowly. */
  q: 0.1,
  /** Moving means the filter's speed is at least this (m/s)... */
  moveMs: 0.7,
  /** ...on this many fixes in a row, all heading the same way within steadyDeg. */
  steadyFixes: 3,
  steadyDeg: 30,
  /** From a standstill, moving also needs the spot this far from where the dot stood (a share of the accuracy). */
  startShare: 1,
  /** Held still, the dot still follows a spot that wanders this far (a share of the accuracy): the walker crept away. */
  breakoutShare: 1.5,
  /** A jump farther than this, or a gap longer than gapMs, starts the dot afresh where the walker is. */
  resetM: 150,
  gapMs: 60_000,
  /** The dot leads by the time to the next fix, at most this long, so its glide ends where the walker is then. */
  leadMaxMs: 1500,
  /** Used for a fix with no reported accuracy. */
  defaultAccuracyM: 10,
} as const;

export interface DotState {
  /** Where the dot stands. */
  at: LngLat;
  /** Where the walker will be by the next fix while moving, else `at`: the glide's target. */
  lead: LngLat;
  /** The way the walker is going (degrees from north), only while clearly moving. */
  heading: number | null;
  /** The fix it came from. */
  t: number;
}

/** One axis of a constant-velocity Kalman filter. */
class Axis {
  x = 0;
  v = 0;
  private p00 = 0;
  private p01 = 0;
  private p10 = 0;
  private p11 = 0;

  reset(z: number, r: number) {
    this.x = z;
    this.v = 0;
    this.p00 = r;
    this.p01 = 0;
    this.p10 = 0;
    this.p11 = 4;
  }

  step(z: number, dt: number, r: number, q: number) {
    this.x += this.v * dt;
    const dt2 = dt * dt;
    const p00 = this.p00 + dt * (this.p01 + this.p10) + dt2 * this.p11 + (q * dt2 * dt2) / 4;
    const p01 = this.p01 + dt * this.p11 + (q * dt2 * dt) / 2;
    const p10 = this.p10 + dt * this.p11 + (q * dt2 * dt) / 2;
    const p11 = this.p11 + q * dt2;
    const s = p00 + r;
    const k0 = p00 / s;
    const k1 = p10 / s;
    const y = z - this.x;
    this.x += k0 * y;
    this.v += k1 * y;
    this.p00 = (1 - k0) * p00;
    this.p01 = (1 - k0) * p01;
    this.p10 = p10 - k1 * p00;
    this.p11 = p11 - k1 * p01;
  }
}

export class LiveDot {
  private ex = new Axis();
  private ny = new Axis();
  private origin: LngLat | null = null;
  private toXY: ((p: LngLat) => [number, number]) | null = null;
  private lastT: number | null = null;
  /** Smoothed time between fixes. */
  private interval = 1000;
  /** Directions of the last few fixes that moved at walking pace. */
  private dirs: number[] = [];
  private shownXY: [number, number] = [0, 0];
  private moving = false;
  private state: DotState | null = null;

  constructor(private readonly startedAt: number | null = null) {}

  current(): DotState | null {
    return this.state;
  }

  /** A new fix; returns the dot as it now stands (unchanged for a fix it ignores). */
  push(p: TracePoint): DotState | null {
    if (p.accuracy_m != null && (p.accuracy_m < 0 || p.accuracy_m > MAX_ACCURACY_M)) return this.state;
    if (this.startedAt != null && p.t < this.startedAt - MAX_STALE_MS) return this.state;
    if (this.lastT != null && p.t <= this.lastT) return this.state;
    const acc = p.accuracy_m ?? LIVE_DOT.defaultAccuracyM;
    const r = (acc / 1.5) ** 2;
    const fix: LngLat = [p.lon, p.lat];

    const dt = this.lastT == null ? Infinity : (p.t - this.lastT) / 1000;
    if (!this.state || dt * 1000 > LIVE_DOT.gapMs || distanceM(this.estimate(), fix) > LIVE_DOT.resetM) {
      this.origin = fix;
      this.toXY = projector(fix);
      this.ex.reset(0, r);
      this.ny.reset(0, r);
      this.dirs = [];
      this.shownXY = [0, 0];
      this.moving = false;
      this.lastT = p.t;
      this.state = { at: fix, lead: fix, heading: null, t: p.t };
      return this.state;
    }

    this.interval = 0.7 * this.interval + 0.3 * Math.min(p.t - this.lastT!, 5000);
    this.lastT = p.t;
    const [zx, zy] = this.toXY!(fix);
    this.ex.step(zx, dt, r, LIVE_DOT.q);
    this.ny.step(zy, dt, r, LIVE_DOT.q);

    const speed = Math.hypot(this.ex.v, this.ny.v);
    const dir = (Math.atan2(this.ex.v, this.ny.v) * 180) / Math.PI;
    if (speed >= LIVE_DOT.moveMs) {
      this.dirs.push(dir);
      if (this.dirs.length > LIVE_DOT.steadyFixes) this.dirs.shift();
    } else this.dirs = [];
    const first = this.dirs[0];
    const steady = this.dirs.length >= LIVE_DOT.steadyFixes && this.dirs.every((d) => Math.abs(((d - first + 540) % 360) - 180) <= LIVE_DOT.steadyDeg);
    const est: [number, number] = [this.ex.x, this.ny.x];
    // Walking goes on while steady; starting from a standstill also needs the spot to have left it.
    const away = Math.hypot(est[0] - this.shownXY[0], est[1] - this.shownXY[1]);
    // The filter's spot can overshoot drift that carries on for a few fixes, so the fix itself must have left too.
    const fixAway = Math.hypot(zx - this.shownXY[0], zy - this.shownXY[1]);
    this.moving = steady && (this.moving || Math.min(away, fixAway) >= LIVE_DOT.startShare * acc);
    const moving = this.moving;
    if (moving || away > LIVE_DOT.breakoutShare * acc) this.shownXY = est;
    const at = this.toLngLat(this.shownXY);
    let lead = at;
    if (moving) {
      const ahead = Math.min(this.interval, LIVE_DOT.leadMaxMs) / 1000;
      lead = this.toLngLat([this.shownXY[0] + this.ex.v * ahead, this.shownXY[1] + this.ny.v * ahead]);
    }
    this.state = { at, lead, heading: moving ? (bearingDeg(at, lead) + 360) % 360 : null, t: p.t };
    return this.state;
  }

  private estimate(): LngLat {
    return this.toLngLat([this.ex.x, this.ny.x]);
  }

  private toLngLat([x, y]: [number, number]): LngLat {
    const o = this.origin!;
    // The inverse of `projector` around the same origin.
    const kx = distanceM(o, [o[0] + 1, o[1]]);
    const ky = distanceM(o, [o[0], o[1] + 1]);
    return [o[0] + x / kx, o[1] + y / ky];
  }
}

/** The live dot as the map reads it: the newest state, and a call on each change. */
export interface DotSource {
  get(): DotState | null;
  subscribe(cb: (s: DotState) => void): () => void;
}

/** A LiveDot fed fix by fix, read by the map without re-rendering the walk screen. */
export class DotStore implements DotSource {
  private readonly dot: LiveDot;
  private readonly subs = new Set<(s: DotState) => void>();

  constructor(startedAt: number | null) {
    this.dot = new LiveDot(startedAt);
  }

  get(): DotState | null {
    return this.dot.current();
  }

  push(p: TracePoint) {
    const before = this.dot.current();
    const now = this.dot.push(p);
    if (now && now !== before) for (const cb of this.subs) cb(now);
  }

  subscribe(cb: (s: DotState) => void): () => void {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  }
}
