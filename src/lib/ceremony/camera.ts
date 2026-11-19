// @layer core
/**
 * A ceremony's camera, worked out ahead (replay ceremony RC11-RC16, decision 0206). The camera is plan data: when a
 * telling is planned, `cameraTrack` walks through its time once, in steps, and writes down the few moves the camera
 * makes; `cameraAt` then reads where it is at any time, cheaply, every display frame. So where the camera is comes from
 * the story, the time and the screen's size alone: held, after Next and in a telling rebuilt, it is where it would
 * have been (RC16). Nothing here knows a ceremony: the rhythm hands over a scene (its parts and where the walker is at
 * a time), and reads a camera back.
 *
 * What the camera does (the owner's prototype, https://claude.ai/artifact/7oLxtuZMhpvXd18H4BLR5P):
 * - it is flat and north-up: a centre and a zoom, nothing else (RC15);
 * - it holds still while the walker is in the middle of the screen, and re-frames, with room ahead, when the walker
 *   would leave it (RC12);
 * - on a stretch the walker crosses faster than `maxCross` of the screen's width a second, it rises just enough to
 *   keep it to that, follows the walker meanwhile, and is back down when the stretch ends (RC13);
 * - arriving at a moment with a card, it settles the moment's pin just under where the card rests (RC14);
 * - across a break it pulls back until both ends fit, and closes in at the far end (RC18);
 * - it opens on the whole of what is told and dives to the walker's start, and closes by pulling back to the view
 *   the card uses (RC23, RC24): both views come from one fit, `fitCamera`, a map's own way of fitting bounds.
 *
 * Places are worked in Web Mercator, as a map lays them out (512 px tiles, as MapLibre counts zoom), so a place put on
 * screen here is where the map draws it, at any zoom.
 */
import { REPLAY_RHYTHM as R } from '../motionTokens';
import type { LngLat } from '../types';
import { easeInOut } from './ease';
import type { StageRoom } from './room';

/** Where a frame's camera holds the map: its centre and zoom; a null centre is a map left where it is (reduce motion). */
export interface Camera {
  center: LngLat | null;
  zoom: number | null;
}

/** A camera that holds the map: a centre and a zoom. */
export interface View {
  center: LngLat;
  zoom: number;
}

/** A place in the world as a map lays it out: 0 to 1 across, 0 (north) to 1 down. */
type World = [number, number];

const toWorld = (p: LngLat): World => [p[0] / 360 + 0.5, 0.5 - Math.log(Math.tan(Math.PI / 4 + (p[1] * Math.PI) / 360)) / (2 * Math.PI)];
const fromWorld = (w: World): LngLat => [(w[0] - 0.5) * 360, (Math.atan(Math.exp((0.5 - w[1]) * 2 * Math.PI)) * 360) / Math.PI - 90];
/** Pixels across the whole world at a zoom. */
const worldPx = (zoom: number) => 512 * 2 ** zoom;
/** Screen pixels a metre covers at a zoom and latitude. */
export const pxPerMetre = (zoom: number, lat: number) => worldPx(zoom) / (40075016.686 * Math.cos((lat * Math.PI) / 180));

/** A place on screen under a camera; null when the map isn't held (no centre or no zoom, audit 25). */
export function project(c: Pick<StageRoom, 'width' | 'height'>, camera: Camera, at: LngLat): [number, number] | null {
  if (!camera.center || camera.zoom == null) return null;
  const s = worldPx(camera.zoom);
  const o = toWorld(camera.center);
  const p = toWorld(at);
  return [c.width / 2 + (p[0] - o[0]) * s, c.height / 2 + (p[1] - o[1]) * s];
}

/** A place between two, as a map draws the straight line between them. */
export function between(a: LngLat, b: LngLat, u: number): LngLat {
  const p = toWorld(a);
  const q = toWorld(b);
  return fromWorld([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
}

/** The room a screen leaves around what it frames: px in from each edge. */
export interface Edges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * The view that frames bounds (west, south, east, north) on a screen inside the room its edges leave (replay ceremony
 * RC23, RC24): as close as fits both ways, no closer than `maxZoom`, the bounds' middle at the room's middle. This is
 * MapLibre's own arithmetic for a flat, north-up fit (`cameraForBounds`), so a map asked to fit the same bounds with
 * the same padding lands on this view: the first beat's fit, the telling's first and last frames and the card's fit
 * are one view each, and nothing jumps between them. Null when the edges leave no room.
 */
export function fitCamera(screen: Pick<StageRoom, 'width' | 'height'>, bounds: readonly [number, number, number, number], pad: Edges, maxZoom: number): { center: LngLat; zoom: number } | null {
  const [w, s, e, n] = bounds;
  const a = toWorld([w, n]);
  const b = toWorld([e, s]);
  const roomW = screen.width - pad.left - pad.right;
  const roomH = screen.height - pad.top - pad.bottom;
  if (!(roomW > 0) || !(roomH > 0)) return null;
  const px = Math.min(roomW / Math.max(1e-12, Math.abs(b[0] - a[0])), roomH / Math.max(1e-12, Math.abs(b[1] - a[1])));
  const zoom = Math.min(maxZoom, Math.log2(px / 512));
  const scale = worldPx(zoom);
  // The room's middle is this far from the screen's: the centre is moved the other way.
  return { center: fromWorld([(a[0] + b[0]) / 2 - (pad.left - pad.right) / 2 / scale, (a[1] + b[1]) / 2 - (pad.top - pad.bottom) / 2 / scale]), zoom };
}

/**
 * One part of a telling, as its camera needs to know it. `hold`: nothing is asked of the camera (the walker stands, or
 * a move begun goes on). `dive`: the telling opens on the view `from` (the whole of what is told; null: none to open
 * on), holds it `hold` ms, and dives to the walker's start by the part's end (RC23). `close`: the telling ends pulling
 * back to the view `to` over `move` ms and holding it to the part's end (RC24). `leg`: the walker moves, at `speed`
 * metres a second along the ground at its steady pace, getting there over the first `ra` of the part and slowing over
 * the last `rb`, at latitude `lat` (where it is farthest from the equator). `card`: a moment with a card, its pin at
 * `at`, the card `pieces` pictures in a grid (0: one picture). `hop`: a break crossed from `from` to `to` (replay ceremony RC18): the camera pulls back until both fit, and closes
 * in at the far end.
 */
export type CameraPart =
  | { k: 'hold'; t0: number; t1: number }
  | { k: 'dive'; t0: number; t1: number; from: View | null; hold: number }
  | { k: 'close'; t0: number; t1: number; to: View | null; move: number }
  | { k: 'leg'; t0: number; t1: number; speed: number; ra: number; rb: number; lat: number }
  | { k: 'card'; t0: number; t1: number; at: LngLat; pieces: number }
  | { k: 'hop'; t0: number; t1: number; from: LngLat; to: LngLat };

/** A telling as its camera reads it: its parts in order, end to end, and where the walker is at a time into it. */
export interface CameraScene {
  total: number;
  parts: CameraPart[];
  walker(ms: number): LngLat | null;
}

/**
 * One move of the camera: the place it keeps at its focus (`focusOf`) goes from `a` at `t0` to `b` at `t1`, eased or
 * straight, cut short at `end` when another move began. The zoom is apart (`zoomOf`), and turns about that place: what
 * the camera follows stays where it is on the screen while it rises and comes down. A move that changes the zoom on
 * its way (`za` to `zb`: a hop's pull-back and its closing in) keeps the nearer-in view's place moving in a straight
 * line on the screen, as the prototype does.
 */
interface Move {
  t0: number;
  t1: number;
  end: number;
  a: World;
  b: World;
  eased: boolean;
  za?: number;
  zb?: number;
}

/** A telling's camera, worked out: read it with `cameraAt`. */
export interface CameraTrack {
  screen: StageRoom;
  parts: CameraPart[];
  /** The place at the camera's focus to start with, and each move it makes, in time order. */
  start: World;
  moves: Move[];
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The last of a sorted list whose `t0` is at or before `ms`, or -1. */
function lastAt(list: { t0: number }[], ms: number): number {
  let lo = 0, hi = list.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t0 <= ms) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

const moveAt = (m: Move, ms: number): World => {
  const u = clamp01((Math.min(ms, m.end) - m.t0) / (m.t1 - m.t0 || 1));
  let e = m.eased ? easeInOut(u) : u;
  if (m.za != null && m.zb != null) {
    // Closing in, the far view is reached as the scale grows; pulling back, the near view is left as it shrinks.
    const z = lerp(m.za, m.zb, e);
    e = m.zb >= m.za ? 1 - 2 ** (m.za - z) * (1 - e) : 2 ** (m.zb - z) * e;
  }
  return [lerp(m.a[0], m.b[0], e), lerp(m.a[1], m.b[1], e)];
};

/**
 * The zoom at which a hop's two ends fit (RC18): inside `hopFitW` of the screen's width and `hopFitH` of its height,
 * and never closer than the walking zoom.
 */
export function hopZoom(screen: Pick<StageRoom, 'width' | 'height'>, from: LngLat, to: LngLat): number {
  const a = toWorld(from);
  const b = toWorld(to);
  const px = Math.min((screen.width * R.hopFitW) / Math.max(1e-12, Math.abs(b[0] - a[0])), (screen.height * R.hopFitH) / Math.max(1e-12, Math.abs(b[1] - a[1])));
  return Math.min(R.baseZoom, Math.log2(px / 512));
}

/** The walker's ground speed `u` of the way through a stretch, as a share of its steady pace (`ease.ts` `steady`'s own slope). */
const paceAt = (u: number, ra: number, rb: number) => Math.max(0, Math.min(1, ra > 0 ? u / ra : 1, rb > 0 ? (1 - u) / rb : 1));

/**
 * How far the camera has risen above the walking zoom, in zoom levels, for a walker at `speed` metres a second on a
 * stretch whose steady pace is `steady`, where `limit` is the most a walker may have at the walking zoom (RC13). Just
 * enough at the steady pace: the walker then crosses exactly `maxCross` of the width a second. Getting up to that
 * pace and slowing from it, never less than keeps to `maxCross`, and rounded (`riseSoft`), so the rise does not start
 * or end with a jolt. A stretch whose steady pace is within the limit does not rise at all.
 */
export function riseFor(speed: number, steady: number, limit: number): number {
  if (!(limit > 0) || steady <= limit) return 0;
  const soft = (v: number) => Math.log2(1 + (v / limit) ** R.riseSoft) / R.riseSoft;
  return Math.max(0, soft(speed) - (soft(steady) - Math.log2(steady / limit)));
}

/** The ground speed, in metres a second, a walker may have at the walking zoom before the camera rises (RC13). */
export const crossLimit = (width: number, lat: number) => (R.maxCross * width) / pxPerMetre(R.baseZoom, lat);

function zoomOf(track: CameraTrack, part: CameraPart | undefined, ms: number): number {
  if (!part) return R.baseZoom;
  const u = clamp01((ms - part.t0) / (part.t1 - part.t0 || 1));
  // The dive and the pull-back: the same easing as their moves (`moveAt`), so the place they close on goes straight.
  if (part.k === 'dive') return part.from ? lerp(part.from.zoom, R.baseZoom, easeInOut(clamp01((ms - part.t0 - part.hold) / (part.t1 - part.t0 - part.hold || 1)))) : R.baseZoom;
  if (part.k === 'close') return part.to ? lerp(R.baseZoom, part.to.zoom, easeInOut(clamp01((ms - part.t0) / (part.move || 1)))) : R.baseZoom;
  if (part.k === 'hop') {
    // Pulled back by `hopPull`, held, and closing in from `hopClose`: the same easing as the hop's two moves.
    const fit = hopZoom(track.screen, part.from, part.to);
    if (u < R.hopPull) return lerp(R.baseZoom, fit, easeInOut(u / R.hopPull));
    return u < R.hopClose ? fit : lerp(fit, R.baseZoom, easeInOut((u - R.hopClose) / (1 - R.hopClose)));
  }
  if (part.k === 'leg') {
    const limit = crossLimit(track.screen.width, part.lat);
    if (part.speed > limit) return R.baseZoom - riseFor(part.speed * paceAt(u, part.ra, part.rb), part.speed, limit);
  }
  return R.baseZoom;
}

/** Where on the screen the camera keeps what it follows. */
const focusOf = (s: StageRoom): [number, number] => [(s.width + s.insets.left - s.insets.right) / 2, s.height * R.focusY];

/** Where the camera is at a time into the telling (RC16): two searches and a little arithmetic, for every frame. */
export function cameraAt(track: CameraTrack, ms: number): { center: LngLat; zoom: number } {
  const i = lastAt(track.moves, ms);
  const zoom = zoomOf(track, track.parts[Math.max(0, lastAt(track.parts, ms))], ms);
  const at = i < 0 ? track.start : moveAt(track.moves[i], ms);
  // The map is told its centre: the middle of the screen, this far from the focus at this zoom.
  const focus = focusOf(track.screen);
  const s = worldPx(zoom);
  return { center: fromWorld([at[0] + (track.screen.width / 2 - focus[0]) / s, at[1] + (track.screen.height / 2 - focus[1]) / s]), zoom };
}

/**
 * Where a card's pin is settled on a screen (RC14): under the middle of the card, `pinUnder` below its lower edge (the
 * pin stands on its place, so the pin itself shows between the two), never nearer the screen's foot than `edge`.
 */
export function pinRest(s: StageRoom, foot: number): [number, number] {
  return [focusOf(s)[0], Math.min(foot + R.pinUnder, s.height - s.insets.bottom - R.edge)];
}

/**
 * The camera of a telling, worked out once when it is planned (RC12-RC14, RC16): `foot(pieces)` is where a card's
 * lower edge rests on this screen (`room.ts` `cardFoot`). Null when the telling has no place to look at.
 */
export function cameraTrack(scene: CameraScene, screen: StageRoom, foot: (pieces: number) => number): CameraTrack | null {
  const first = scene.walker(0);
  if (!first || !(screen.width > 0) || !(screen.height > 0)) return null;
  const focus = focusOf(screen);
  /** The place to keep at the focus so that `place` is at a point of the screen, at a zoom. */
  const focalFor = (place: World, at: [number, number], zoom: number): World => {
    const s = worldPx(zoom);
    return [place[0] - (at[0] - focus[0]) / s, place[1] - (at[1] - focus[1]) / s];
  };
  /** The place a view keeps at the focus. */
  const focalOf = (v: View): World => {
    const s = worldPx(v.zoom);
    const c = toWorld(v.center);
    return [c[0] - (screen.width / 2 - focus[0]) / s, c[1] - (screen.height / 2 - focus[1]) / s];
  };
  // The opening (RC23): from the whole, held a while where no beat showed it before, down to the walker's start.
  const dive = scene.parts[0]?.k === 'dive' && scene.parts[0].from ? scene.parts[0] : null;
  const track: CameraTrack = {
    screen, parts: scene.parts, start: dive?.from ? focalOf(dive.from) : toWorld(first), moves: [],
  };
  const { moves, parts } = track;
  if (dive?.from) moves.push({ t0: dive.t0 + dive.hold, t1: dive.t1, end: dive.t1, a: track.start, b: toWorld(first), eased: true, za: dive.from.zoom, zb: R.baseZoom });
  /** The move the centre is on, or was last on. */
  const active = (): Move | undefined => moves[moves.length - 1];
  const centreAt = (ms: number): World => {
    const m = active();
    return m ? moveAt(m, ms) : track.start;
  };
  const begin = (t0: number, dur: number, to: World, eased: boolean, zooms?: { za: number; zb: number }) => {
    const from = centreAt(t0);
    const was = active();
    if (was) was.end = Math.min(was.end, t0);
    moves.push({ t0, t1: t0 + dur, end: t0 + dur, a: from, b: to, eased, ...zooms });
  };
  const walker = (ms: number): World | null => {
    const p = scene.walker(Math.min(ms, Math.max(0, scene.total - 1)));
    return p ? toWorld(p) : null;
  };
  const cardCentre = (p: Extract<CameraPart, { k: 'card' }>) => focalFor(toWorld(p.at), pinRest(screen, foot(p.pieces)), R.baseZoom);
  /** How far a place is from the focus on screen, with `centre` kept there at a zoom. */
  const offset = (place: World, centre: World, zoom: number): [number, number] => {
    const s = worldPx(zoom);
    return [(place[0] - centre[0]) * s, (place[1] - centre[1]) * s];
  };
  const box = { x: R.holdX * screen.width, up: R.holdUp * screen.height, down: R.holdDown * screen.height };
  const outside = (o: [number, number]) => Math.abs(o[0]) > box.x || o[1] < -box.up || o[1] > box.down;

  /** The walker is kept this far inside the screen while the camera goes after it. */
  const keep = (at: World, centre: World, zoom: number): World => {
    const s = worldPx(zoom);
    const x = focus[0] + (at[0] - centre[0]) * s;
    const y = focus[1] + (at[1] - centre[1]) * s;
    const dx = x - Math.max(R.edge, Math.min(screen.width - R.edge, x));
    const dy = y - Math.max(R.edge, Math.min(screen.height - R.edge, y));
    return [centre[0] + dx / s, centre[1] + dy / s];
  };

  /** The card the camera is settling on or has settled on, so it is not settled twice. */
  let settled: CameraPart | null = null;
  /**
   * Going after the walker (risen), or on to a card from there: the centre's speed (world units a second), where it
   * is headed, and the card's centre once it is the aim. A spring with no overshoot, so it starts and stops softly.
   */
  let follow: { vx: number; vy: number; to: World; aim: World | null } | null = null;
  let pi = -1;
  const dt = R.camStep;
  const secs = dt / 1000;
  for (let t = 0; t < scene.total; t += dt) {
    while (pi + 1 < parts.length && parts[pi + 1].t0 <= t) {
      const p = parts[++pi];
      // Arriving at a card with no stretch before it to settle on (after a break, or one moment after another).
      if (p.k === 'card' && settled !== p) {
        settled = p;
        if (follow) follow.aim = cardCentre(p);
        else begin(p.t0, R.settle, cardCentre(p), true);
      }
      // The close (RC24): back to the view the card uses, from wherever the walker's end left the camera.
      if (p.k === 'close' && p.to) {
        follow = null;
        begin(p.t0, p.move, focalOf(p.to), true, { za: R.baseZoom, zb: p.to.zoom });
      }
      // A break crossed (RC18): back until both ends fit, their middle at the focus; then in again at the far end.
      if (p.k === 'hop') {
        follow = null;
        const dur = p.t1 - p.t0;
        const fit = hopZoom(screen, p.from, p.to);
        const a = toWorld(p.from);
        const b = toWorld(p.to);
        begin(p.t0, dur * R.hopPull, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], true, { za: R.baseZoom, zb: fit });
        begin(p.t0 + dur * R.hopClose, dur * (1 - R.hopClose), b, true, { za: fit, zb: R.baseZoom });
      }
    }
    const part = parts[pi];
    if (!part) continue;
    // Nothing moves the camera from here to the end of a part that is no stretch: on to the first step at or past it.
    if (!follow && part.k !== 'leg') {
      t = Math.max(t, Math.ceil(part.t1 / dt) * dt - dt);
      continue;
    }
    const next = parts[pi + 1];
    const card = part.k === 'leg' && next?.k === 'card' ? next : null;
    const zoom = zoomOf(track, part, t);
    const risen = part.k === 'leg' && zoom < R.baseZoom - R.risen;
    if (!follow && risen && !(card && settled === card)) {
      // The camera rises: from here it goes after the walker, at the speed it already had.
      const was = centreAt(t - dt);
      const now = centreAt(t);
      follow = { vx: (now[0] - was[0]) / secs, vy: (now[1] - was[1]) / secs, to: now, aim: null };
    }
    if (follow) {
      const here = centreAt(t);
      const z1 = zoomOf(track, part, t + dt);
      // Arriving at a card: its pin under where the card will rest (RC14).
      if (card && settled !== card && t >= part.t1 - R.settleLead) {
        settled = card;
        follow.aim = cardCentre(card);
      }
      const ahead = part.k === 'leg' && !follow.aim ? walker(t + R.followLead) : null;
      if (ahead) follow.to = ahead;
      const to = follow.aim ?? follow.to;
      // A critically damped spring towards it: `followEase` behind what it goes after, and quicker on to a card. It
      // tightens as the stretch runs out, so the camera is at rest when the walker stops, not a moment after. And as
      // the camera comes back down, the distance left grows on the screen as fast as the zoom closes in: it is closed
      // that much faster, so the walker never slides off the screen.
      const ease = follow.aim ? R.settleEase : R.followEase;
      const left = part.k === 'leg' ? Math.max(dt / 2, (part.t1 - t) / R.followLand) : ease;
      const w = 2 / (Math.min(ease, left) / 1000) + (Math.max(0, z1 - zoom) * Math.LN2) / secs;
      const decay = Math.exp(-w * secs);
      const step = (x: number, v: number): [number, number] => {
        const k = (v + w * x) * secs;
        return [(x + k) * decay, (v - w * k) * decay];
      };
      const [x, vx] = step(here[0] - to[0], follow.vx);
      const [y, vy] = step(here[1] - to[1], follow.vy);
      follow.vx = vx;
      follow.vy = vy;
      const s = worldPx(z1);
      const at = walker(t + dt);
      // The stretch's last step: the spring has all but closed, and the camera is there as the walker stops, to the
      // moment (at a card, exactly where its pin belongs; before a stand, still).
      if (part.k === 'leg' && t + dt >= part.t1) {
        begin(t, Math.max(1, part.t1 - t), to, false);
        follow = null;
        continue;
      }
      // There, and still (a spring carried past its stretch): the camera holds again.
      const there = Math.hypot(x, y) * s < 0.5 && Math.hypot(vx, vy) * s < 2 && (!!follow.aim || !risen);
      begin(t, dt, there ? to : at ? keep(at, [to[0] + x, to[1] + y], z1) : [to[0] + x, to[1] + y], false);
      if (there) follow = null;
      continue;
    }
    if (part.k !== 'leg' || (card && settled === card)) continue;
    const settle = () => {
      settled = card;
      begin(t, Math.max(R.settleMin, part.t1 - t), cardCentre(card!), true);
    };
    // Arriving at a card: its pin under where the card will rest, done by the time the walker stops (RC14).
    if (card && t >= part.t1 - R.settleLead) {
      settle();
      continue;
    }
    // At the walking zoom: still while the walker is in the middle; a move begun (a re-frame) goes on to its end.
    const moving = active();
    if (moving && t < moving.t1) continue;
    const w = walker(t);
    if (!w || !outside(offset(w, centreAt(t), zoom))) continue;
    // The walker would leave the middle: a card just ahead is settled on now; else the camera re-frames, with room ahead.
    if (card && t + R.reframe > part.t1 - R.settleLead) {
      settle();
      continue;
    }
    const f = walker(t + R.reframe);
    const g = walker(t + R.reframe + R.reframeLook);
    if (!f || !g) continue;
    begin(t, R.reframe, [lerp(f[0], g[0], R.reframeAhead), lerp(f[1], g[1], R.reframeAhead)], true);
  }
  return track;
}
