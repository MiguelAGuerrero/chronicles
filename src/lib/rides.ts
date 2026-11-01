import { distanceM, FixFilter, isBreak, lineLengthM, MAX_ACCURACY_M, MAX_STALE_MS, smoothDwells, traceDistanceM, withoutPauses, type PauseSpan } from './geo';
import type { LngLat, TracePoint } from './types';

/**
 * Rides (the concept doc's "Rides" tab): a stretch on a trolley, bus or train
 * inside a walk. Raw fixes are stored unfiltered; this reads them into the
 * walked trace and the rides, at read time, so every walk ever recorded
 * shows its rides. Pure: no I/O, no clock.
 */
export const RIDE_RULES = {
  /** A ride is told over at least this long (R1), and lasts at least this long (R2). */
  windowMs: 20_000,
  minFixes: 3,
  /** The window's median speed must be above this (25 km/h, the fastest on foot)... */
  speed: 7,
  /** ...and its net movement at least this, so a wobbling fix is not a ride. */
  net: 4.5,
  /** Without the phone's speed, a fix's speed is its movement over this long. */
  speedOverMs: 5000,
  /** A ride runs from its first fix at this speed or more to its last (R3). */
  edge: 3,
  /** Inside a ride, faster than this from the last kept fix is a jump (R2: a high-speed train's top speed). */
  maxSpeed: 100,
  /** A ride reaches at least this far from where it began: GPS drifting off and back is not one (audit 9). */
  minReachM: 200,
  /** Two rides are one across a stop (this close in time and space), or across traffic still moving at `edge` (R3). */
  joinMs: 180_000,
  joinM: 150,
  /** "On a ride" ends after this long walking, this far from where the ride stopped (audit 5). */
  offMs: 20_000,
  offM: 30,
  /** The walk and a ride always meet across a step this short. */
  joinSlackM: 25,
  /** A gap without fixes this long ends a ride, as it breaks the walked trace. */
  gapMs: 60_000,
  /** The most a ride takes of the replay's path (R10), and of all rides together, a share of it. */
  replayMs: 4000,
  ridesShare: 0.5,
} as const;

export interface Ride {
  /** Its first and last fix. */
  t0: number;
  t1: number;
  /** Its fixes, jumps over RIDE_RULES.maxSpeed dropped. */
  fixes: TracePoint[];
}

export interface ReadTrace {
  /** Walked fixes: the accuracy, staleness and walking speed gates, per stretch between rides. */
  walked: TracePoint[];
  rides: Ride[];
  /** Pauses and rides: where the walked trace breaks. Pass these to anything walked only. */
  breaks: PauseSpan[];
  /** The walk's pauses: where the whole trace (walked and ridden) breaks. */
  pauses: PauseSpan[];
  /** The newest fix inside the accuracy gate, kept or not: weak GPS is judged by this (R11). */
  lastGoodAt: number | null;
}

/**
 * The phone's own speed, where it gives one. Android reports 0 for "no reading"
 * (expo-location sets it without `hasSpeed()`), so a 0 is worked out from
 * movement instead, which is near 0 when standing anyway (audit 2).
 */
const reported = (p: TracePoint): number | null => (p.speed != null && p.speed > 0 ? p.speed : null);

/**
 * Speed at each fix: the phone's own reading where it gives one, else the
 * movement over the last RIDE_RULES.speedOverMs (or since the fix before, when
 * fixes are further apart), which a wobbling fix barely moves.
 */
function speedsOf(seg: TracePoint[]): number[] {
  let k = 0;
  return seg.map((p, i) => {
    const r = reported(p);
    if (r != null) return r;
    while (k < i - 1 && p.t - seg[k + 1].t >= RIDE_RULES.speedOverMs) k++;
    if (k >= i) return 0;
    const q = seg[k];
    const dt = (p.t - q.t) / 1000;
    return dt > 0 ? distanceM([q.lon, q.lat], [p.lon, p.lat]) / dt : 0;
  });
}

/** The same, looking ahead: to the first fix RIDE_RULES.speedOverMs on, else the last one (audit 1). */
function speedsAhead(seg: TracePoint[]): number[] {
  let k = 0;
  return seg.map((p, i) => {
    const r = reported(p);
    if (r != null) return r;
    if (k <= i) k = Math.min(i + 1, seg.length - 1);
    while (k + 1 < seg.length && seg[k].t - p.t < RIDE_RULES.speedOverMs) k++;
    if (k <= i) return 0;
    const q = seg[k];
    const dt = (q.t - p.t) / 1000;
    return dt > 0 ? distanceM([p.lon, p.lat], [q.lon, q.lat]) / dt : 0;
  });
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
}

const pos = (p: TracePoint): LngLat => [p.lon, p.lat];

/** The rides in one unbroken stretch of fixes, as index ranges [from, to]. */
function ridesIn(seg: TracePoint[]): [number, number][] {
  const n = seg.length;
  if (n < RIDE_RULES.minFixes) return [];
  const v = speedsOf(seg);
  // A ride's edges are judged by the slower of the speed behind and ahead, so a jump on
  // either side of a fix never makes it look moving (a GPS jump at a bus stop).
  const ahead = speedsAhead(seg);
  const still = v.map((x, i) => Math.min(x, ahead[i]));
  // Windows [j, i] of at least windowMs, sliding: more than half their speeds (v[j+1..i]) over
  // RIDE_RULES.speed, counted as they slide, so a long walk reads in linear time (audit 4, 9).
  const marks = new Int32Array(n + 1);
  let j = 0;
  let over = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0 && v[i] > RIDE_RULES.speed) over++;
    while (j + 1 <= i && seg[i].t - seg[j + 1].t >= RIDE_RULES.windowMs) {
      j++;
      if (v[j] > RIDE_RULES.speed) over--;
    }
    const span = seg[i].t - seg[j].t;
    if (span < RIDE_RULES.windowMs || i - j + 1 < RIDE_RULES.minFixes) continue;
    if (2 * over <= i - j) continue;
    if (distanceM(pos(seg[j]), pos(seg[i])) / (span / 1000) < RIDE_RULES.net) continue;
    marks[j]++;
    marks[i + 1]--;
  }
  const fast = new Uint8Array(n);
  for (let i = 0, open = 0; i < n; i++) {
    open += marks[i];
    fast[i] = open > 0 ? 1 : 0;
  }
  // Runs of fixes in fast windows, trimmed to their first and last fix moving at ride pace.
  const found: [number, number][] = [];
  for (let i = 0; i < n; ) {
    if (!fast[i]) {
      i++;
      continue;
    }
    let k = i;
    while (k + 1 < n && fast[k + 1]) k++;
    // From its first truly fast fix back to the last stop before it, and on from its
    // last to the first stop after: hurrying to a stop and standing there is not the ride.
    let first = i;
    while (first <= k && still[first] <= RIDE_RULES.speed) first++;
    let last = k;
    while (last >= first && still[last] <= RIDE_RULES.speed) last--;
    if (first <= last) {
      let a = first;
      while (a > i && still[a - 1] > RIDE_RULES.edge) a--;
      let b = last;
      while (b < k && still[b + 1] > RIDE_RULES.edge) b++;
      found.push([a, b]);
    }
    i = k + 1;
  }
  // A stop or traffic between two rides joins them (R3).
  const joined: [number, number][] = [];
  for (const r of found) {
    const prev = joined[joined.length - 1];
    if (prev) {
      const dt = seg[r[0]].t - seg[prev[1]].t;
      const near = distanceM(pos(seg[prev[1]]), pos(seg[r[0]])) <= RIDE_RULES.joinM;
      // Traffic joins however long it lasts (audit 6); a stop, for up to joinMs.
      const moving = median(v.slice(prev[1] + 1, r[0])) >= RIDE_RULES.edge;
      if (moving || (dt <= RIDE_RULES.joinMs && near)) {
        prev[1] = r[1];
        continue;
      }
    }
    joined.push([r[0], r[1]]);
  }
  // A burst shorter than the window is a GPS jump, not a ride (R2); so is drifting off and back (audit 9).
  return joined.filter(([a, b]) => {
    if (seg[b].t - seg[a].t < RIDE_RULES.windowMs) return false;
    let reach = 0;
    for (let x = a + 1; x <= b && reach < RIDE_RULES.minReachM; x++) reach = Math.max(reach, distanceM(pos(seg[a]), pos(seg[x])));
    return reach >= RIDE_RULES.minReachM;
  });
}

/** Fixes through a fresh filter: each stretch anchors on its own first fix. */
function filtered(points: TracePoint[], maxSpeed?: number): TracePoint[] {
  const f = new FixFilter(null, maxSpeed);
  for (const p of points) f.push(p);
  return f.accepted;
}

/**
 * Reads a walk's raw fixes into its walked trace and its rides. Fixes inside
 * a pause are dropped; a pause or a gap over a minute ends a ride. The order
 * of the stored rows does not matter.
 */
export function readTrace(points: TracePoint[], startedAt: number | null, pauses: PauseSpan[] = []): ReadTrace {
  const sorted = withoutPauses(points, pauses).slice().sort((a, b) => a.t - b.t);
  const gated: TracePoint[] = [];
  for (const p of sorted) {
    if (gated.length && gated[gated.length - 1].t === p.t) continue;
    if (p.accuracy_m != null && (p.accuracy_m < 0 || p.accuracy_m > MAX_ACCURACY_M)) continue;
    if (startedAt != null && p.t < startedAt - MAX_STALE_MS) continue;
    gated.push(p);
  }
  const walked: TracePoint[] = [];
  const rides: Ride[] = [];
  let from = 0;
  for (let i = 1; i <= gated.length; i++) {
    if (i < gated.length && !isBreak(gated[i - 1], gated[i], pauses, RIDE_RULES.gapMs)) continue;
    const seg = gated.slice(from, i);
    from = i;
    let at = 0;
    for (const [a, b] of ridesIn(seg)) {
      walked.push(...filtered(seg.slice(at, a)));
      const fixes = filtered(seg.slice(a, b + 1), RIDE_RULES.maxSpeed);
      rides.push({ t0: fixes[0].t, t1: fixes[fixes.length - 1].t, fixes });
      at = b + 1;
    }
    walked.push(...filtered(seg.slice(at)));
  }
  return {
    walked,
    rides,
    breaks: [...pauses, ...rides.map((r) => ({ started_at: r.t0, ended_at: r.t1 }))],
    pauses,
    lastGoodAt: gated.length ? gated[gated.length - 1].t : null,
  };
}

/** Walked and ridden fixes together, in time order: for places, placing captures and the replay's dot. */
export function keptFixes(tr: ReadTrace): TracePoint[] {
  if (!tr.rides.length) return tr.walked;
  return [...tr.walked, ...tr.rides.flatMap((r) => r.fixes)].sort((a, b) => a.t - b.t);
}

/**
 * Walked fixes with their standstills held still (smoothDwells), and ride fixes as
 * they are: a stop inside a ride is part of the ride, never a gap in it (audit 3).
 */
export function smoothKept(tr: ReadTrace): TracePoint[] {
  if (!tr.rides.length) return smoothDwells(tr.walked);
  return [...smoothDwells(tr.walked), ...tr.rides.flatMap((r) => r.fixes)].sort((a, b) => a.t - b.t);
}

/** The newest walked fix before t and the oldest after, unless a pause or a gap lies between. */
function neighbours(tr: ReadTrace, r: Ride): { before: TracePoint | null; after: TracePoint | null } {
  let before: TracePoint | null = null;
  let after: TracePoint | null = null;
  for (const p of tr.walked) {
    if (p.t < r.t0) before = p;
    else if (p.t > r.t1) {
      after = p;
      break;
    }
  }
  const first = r.fixes[0];
  const last = r.fixes[r.fixes.length - 1];
  if (before && (isBreak(before, first, tr.pauses, RIDE_RULES.gapMs) || !joins(before, first, r.fixes.slice(0, 6)))) before = null;
  if (after && (isBreak(last, after, tr.pauses, RIDE_RULES.gapMs) || !joins(last, after, r.fixes.slice(-6)))) after = null;
  return { before, after };
}

/**
 * Whether the walk and a ride meet: the step between them is no faster than
 * twice the ride's own pace there (or short), so a GPS jump at a bus stop is
 * shown as the gap it is, not as a jog in the ride.
 */
function joins(a: TracePoint, b: TracePoint, edge: TracePoint[]): boolean {
  const d = distanceM(pos(a), pos(b));
  if (d <= RIDE_RULES.joinSlackM) return true;
  const span = (edge[edge.length - 1].t - edge[0].t) / 1000;
  const pace = span > 0 ? lineLengthM(edge.map(pos)) / span : 0;
  return d <= 2 * pace * (Math.abs(b.t - a.t) / 1000) + RIDE_RULES.joinSlackM;
}

/** Each ride as a line, joined to the walk on either side (R5): what is drawn dashed. */
export function rideRuns(tr: ReadTrace): LngLat[][] {
  return tr.rides.map((r) => {
    const { before, after } = neighbours(tr, r);
    return [...(before ? [pos(before)] : []), ...r.fixes.map(pos), ...(after ? [pos(after)] : [])];
  });
}

/** The same rides, with each point's time: for the replay, which draws them as the dot goes. */
export function timedRideRuns(tr: ReadTrace): { t: number; p: LngLat }[][] {
  return tr.rides.map((r) => {
    const { before, after } = neighbours(tr, r);
    return [...(before ? [before] : []), ...r.fixes, ...(after ? [after] : [])].map((f) => ({ t: f.t, p: pos(f) }));
  });
}

/** Walked distance (standstills smoothed, nothing across a ride or pause) and ridden distance (R6). */
export function traceDistances(tr: ReadTrace): { walkedM: number; rideM: number } {
  return {
    walkedM: traceDistanceM(smoothDwells(tr.walked), tr.breaks),
    rideM: rideRuns(tr).reduce((d, run) => d + lineLengthM(run), 0),
  };
}

/**
 * On a ride now (R11, R12): the newest ride is still within RIDE_RULES.joinMs,
 * and since it you are within RIDE_RULES.joinM of where it ended (a stop) or
 * still moving at ride pace (traffic), unless you have walked off: offMs at
 * walking pace, more than offM from where it stopped.
 */
export function ridingAt(tr: ReadTrace, here: LngLat | null, now: number): boolean {
  const r = tr.rides[tr.rides.length - 1];
  if (!r || now - r.t1 > RIDE_RULES.joinMs) return false;
  const since = tr.walked.filter((p) => p.t > r.t1);
  if (!since.length) return true;
  const end = r.fixes[r.fixes.length - 1];
  const away = here ? distanceM(pos(end), here) : Infinity;
  // Walking off: a while at walking pace, a few steps from where the ride stopped (audit 5).
  const pace = median(speedsOf([end, ...since]).slice(1));
  if (pace < RIDE_RULES.edge && since[since.length - 1].t - since[0].t >= RIDE_RULES.offMs && away > RIDE_RULES.offM) return false;
  return away <= RIDE_RULES.joinM || pace >= RIDE_RULES.edge;
}
