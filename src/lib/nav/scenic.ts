// @layer core
import { distanceM, projector } from '../geo';
import { formatDistance } from '../format';
import type { LngLat } from '../types';
import type { Units } from '../units';
import { formatTimeLeft, spokenTimeLeft, timeAtPaceMs } from './eta';
import { SCENIC } from './rules';
import { inCorridor, probeOf, type GreenArea, type Probe, type Signals } from './scenicSignals';
import type { EdgeCost, StreetSource } from './streetRoute';
import type { Route, RouteHint, RouteSource, Waypoint } from './types';

export { SCENIC };

/**
 * Scenic routes (specs/scenic-routes, SR2-SR12): beside the direct route, one route per leaning
 * switched on, each at most SCENIC.detour longer. Green and busy streets are found by a search
 * where an appealing metre costs less, tried at a few strengths, the one that gains most within
 * the detour kept; sights by stopping on the way at the places that add the most for the least
 * extra walk. Pure: the streets and the signals are given.
 */

export type Leaning = 'green' | 'sights' | 'busy';
export const LEANINGS: readonly Leaning[] = ['green', 'sights', 'busy'];
export const isLeaning = (v: unknown): v is Leaning => typeof v === 'string' && (LEANINGS as readonly string[]).includes(v);
/** Known leanings, in leaning order, once each. */
export const leaningsIn = (v: unknown): Leaning[] => (Array.isArray(v) ? LEANINGS.filter((l) => v.includes(l)) : []);

/** What a route passes, as the row will say it (SR4). */
export interface Passes {
  parks: { name: string | null; kind: GreenArea['kind'] }[];
  streets: string[];
  found: string[];
  unfound: number;
}

/** One row of the preview: Direct has no leanings. */
export interface RouteOption {
  leanings: Leaning[];
  route: Route;
  passes: Passes;
}

/** SR2, SR9, SR12: whether a destination gets the preview, and what to say when it can't. */
export function scenicPlan(dest: Waypoint, from: LngLat, leanings: readonly Leaning[], units: Units = 'km'): { scenic: true } | { scenic: false; notice: string | null } {
  if (dest.kind === 'start' || !leanings.length) return { scenic: false, notice: null };
  if (distanceM(from, dest.at) > SCENIC.maxM) {
    const reach = units === 'mi' ? formatDistance(SCENIC.maxM, units) : `${SCENIC.maxM / 1000} km`;
    return { scenic: false, notice: `Scenic routes reach ${reach}` };
  }
  return { scenic: true };
}

/** Points every SCENIC.sampleM along a path, each with the length it stands for. */
function samplesAlong(path: LngLat[], step = SCENIC.sampleM): [LngLat, number][] {
  const out: [LngLat, number][] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const len = distanceM(a, b);
    if (len === 0) continue;
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      out.push([[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], len / n]);
    }
  }
  return out;
}

const lengthOf = (path: LngLat[]) => path.slice(1).reduce((m, q, i) => m + distanceM(path[i], q), 0);

/** The shortest distance from a point to a polyline, in metres (a local projection). */
function offPath(p: LngLat, xy: [number, number][], proj: (q: LngLat) => [number, number]): number {
  const [px, py] = proj(p);
  let best = Infinity;
  for (let i = 1; i < xy.length; i++) {
    const [ax, ay] = xy[i - 1];
    const [bx, by] = xy[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy));
  }
  if (xy.length === 1) best = Math.hypot(px - xy[0][0], py - xy[0][1]);
  return best;
}

const sightsPassed = (path: LngLat[], signals: Signals): number[] => {
  if (!path.length) return [];
  const proj = projector(path[0]);
  const xy = path.map(proj);
  return signals.sights.flatMap((s, i) => (offPath(s.at, xy, proj) <= SCENIC.sightM ? [i] : []));
};

const greenM = (path: LngLat[], probe: Probe) => samplesAlong(path).reduce((m, [p, w]) => m + (probe.green(p) ? w : 0), 0);
const busyM = (path: LngLat[], probe: Probe) => samplesAlong(path).reduce((m, [p, w]) => m + ((probe.busy(p)?.grade ?? 0) / 3) * w, 0);

/** How much of what each leaning wants a path has (SR6): metres of green, graded metres of busy street, places passed. */
export const measure = {
  green: (path: LngLat[], signals: Signals) => (path.length ? greenM(path, probeOf(signals, path[0])) : 0),
  busy: (path: LngLat[], signals: Signals) => (path.length ? busyM(path, probeOf(signals, path[0])) : 0),
  sights: (path: LngLat[], signals: Signals) => sightsPassed(path, signals).length,
};

/** The share of `a`'s length that lies on `b` (within SCENIC.sharedM). */
function shareOn(a: LngLat[], b: LngLat[]): number {
  const s = samplesAlong(a);
  if (!s.length || b.length < 1) return 0;
  const proj = projector(b[0]);
  const xy = b.map(proj);
  let on = 0;
  let all = 0;
  for (const [p, w] of s) {
    all += w;
    if (offPath(p, xy, proj) <= SCENIC.sharedM) on += w;
  }
  return all ? on / all : 0;
}

/** SR7: how alike two routes are: the smaller of the shares each has on the other. */
export const shared = (a: LngLat[], b: LngLat[]): number => Math.min(shareOn(a, b), shareOn(b, a));

interface Context {
  streets: StreetSource;
  signals: Signals;
  probe: Probe;
  hint?: RouteHint;
}

/** An edge's appeal for a leaning, 0 to 1: its share inside green, or its grade of busy street. */
function appealOf(ctx: Context, leaning: 'green' | 'busy'): EdgeCost {
  const cache = new Map<string, number>();
  return (a, b, m, key) => {
    let v = key != null ? cache.get(key) : undefined;
    if (v === undefined) {
      const s = samplesAlong([a, b]);
      const total = s.reduce((x, [, w]) => x + w, 0) || 1;
      v = s.reduce((x, [p, w]) => x + w * (leaning === 'green' ? (ctx.probe.green(p) ? 1 : 0) : (ctx.probe.busy(p)?.grade ?? 0) / 3), 0) / total;
      if (key != null) cache.set(key, v);
    }
    return v;
  };
}

/** The route of one leaning from `from` to `to`, or null when none gains enough within the detour. */
function bestFor(ctx: Context, leaning: Leaning, from: LngLat, to: LngLat, direct: Route): Route | null {
  const budget = direct.lengthM * (1 + SCENIC.detour) + 1e-6;
  const id = `scenic:${leaning}`;
  if (leaning === 'sights') return viaSights(ctx, from, to, direct, budget, id);
  const score = (path: LngLat[]) => (leaning === 'green' ? greenM(path, ctx.probe) : busyM(path, ctx.probe));
  const base = score(direct.path);
  const appeal = appealOf(ctx, leaning);
  let best: { route: Route; gain: number } | null = null;
  for (const s of SCENIC.strengths) {
    const r = ctx.streets.routeWith(from, to, ctx.hint, (a, b, m, key) => m * (1 - s * appeal(a, b, m, key)), 1 - s);
    if (!r || r.lengthM > budget) continue;
    const gain = score(r.path) - base;
    if (!best || gain > best.gain + 1e-6 || (Math.abs(gain - best.gain) <= 1e-6 && r.lengthM < best.route.lengthM)) best = { route: { ...r, source: id }, gain };
  }
  return best && best.gain >= SCENIC.minGainM ? best.route : null;
}

/**
 * Sights: stops on the way at the places worth seeing that cost the least extra walk, one at a
 * time, while the route stays within the budget (SR6). One bounded search from each end gives a
 * stop's whole walk at once; legs already walked are kept for the next round.
 */
function viaSights(ctx: Context, from: LngLat, to: LngLat, direct: Route, budget: number, id: string): Route | null {
  const passedByDirect = new Set(sightsPassed(direct.path, ctx.signals));
  const base = passedByDirect.size;
  const fromHere = ctx.streets.reach(from, budget);
  const toThere = ctx.streets.reach(to, budget);
  const proj = projector(from);
  const [tx, ty] = proj(to);
  const len2 = tx * tx + ty * ty || 1;
  const along = (p: LngLat) => {
    const [x, y] = proj(p);
    return (x * tx + y * ty) / len2;
  };
  const straight = distanceM(from, to);
  const candidates = ctx.signals.sights
    .map((s, i) => ({ s, i, extra: distanceM(from, s.at) + distanceM(s.at, to) - straight }))
    .filter((c) => !passedByDirect.has(c.i) && inCorridor(c.s.at, from, to))
    // A snap scans the streets: only the nearest the straight way are snapped and measured.
    .sort((a, b) => a.extra - b.extra)
    .slice(0, SCENIC.candidates * 3)
    .flatMap(({ s, i }) => {
      const j = ctx.streets.snap(s.at);
      if (!j || j.m > SCENIC.sightM) return [];
      const a = fromHere(j.on);
      const b = toThere(j.on);
      return a != null && b != null && a + b <= budget ? [{ i, on: j.on, t: along(j.on), walk: a + b }] : [];
    })
    .sort((a, b) => a.walk - b.walk)
    .slice(0, SCENIC.candidates);
  const legs = new Map<string, Route | null>();
  const leg = (a: LngLat, b: LngLat, first: boolean) => {
    const k = `${a.join()}>${b.join()}`;
    if (!legs.has(k)) legs.set(k, ctx.streets.route(a, b, first ? ctx.hint : undefined));
    return legs.get(k)!;
  };
  const via = (stops: { on: LngLat; t: number }[]): Route | null => {
    const pts = [from, ...[...stops].sort((a, b) => a.t - b.t).map((s) => s.on), to];
    const path: LngLat[] = [];
    let m = 0;
    for (let k = 1; k < pts.length; k++) {
      const r = leg(pts[k - 1], pts[k], k === 1);
      if (!r) return null;
      path.push(...(k === 1 ? r.path : r.path.slice(1)));
      m += r.lengthM;
    }
    return { path, lengthM: m, source: id };
  };
  let current = direct;
  let count = base;
  const stops: typeof candidates = [];
  for (let round = 0; round < SCENIC.maxStops; round++) {
    const now = new Set(sightsPassed(current.path, ctx.signals));
    // The cheapest first: the first round takes the cheapest single stop, later ones try the next few.
    const tries = candidates.filter((c) => !now.has(c.i) && !stops.includes(c)).slice(0, 3);
    let pick: { c: (typeof candidates)[number]; r: Route; n: number; score: number } | null = null;
    for (const c of tries) {
      const r = via([...stops, c]);
      if (!r || r.lengthM > budget) continue;
      const n = sightsPassed(r.path, ctx.signals).length;
      if (n <= count) continue;
      const score = (n - count) / Math.max(1, r.lengthM - current.lengthM);
      if (!pick || score > pick.score) pick = { c, r, n, score };
    }
    if (!pick) break;
    stops.push(pick.c);
    current = pick.r;
    count = pick.n;
  }
  return current !== direct && count - base >= SCENIC.minSights ? current : null;
}

/** What a path passes, for the leanings it was chosen for (SR4). */
function passesOf(path: LngLat[], leanings: Leaning[], ctx: Context): Passes {
  const out: Passes = { parks: [], streets: [], found: [], unfound: 0 };
  if (leanings.includes('green')) {
    const inside = new Map<GreenArea, number>();
    for (const [p, w] of samplesAlong(path)) {
      const g = ctx.probe.green(p);
      if (g) inside.set(g, (inside.get(g) ?? 0) + w);
    }
    // A park cut by tile edges is several areas of one name: named once.
    const named = new Set<string>();
    for (const [g, m] of inside) {
      if (m < SCENIC.greenRunM) continue;
      if (g.name) {
        if (!named.has(g.name)) out.parks.push({ name: g.name, kind: g.kind });
        named.add(g.name);
      } else out.parks.push({ name: null, kind: g.kind });
    }
  }
  if (leanings.includes('busy')) {
    const along = new Map<string, { m: number; grade: number }>();
    for (const [p, w] of samplesAlong(path)) {
      const b = ctx.probe.busy(p);
      if (!b?.name) continue;
      const v = along.get(b.name) ?? { m: 0, grade: 0 };
      along.set(b.name, { m: v.m + w, grade: Math.max(v.grade, b.grade) });
    }
    out.streets = [...along].filter(([, v]) => v.m >= SCENIC.busyRunM).sort((a, b) => b[1].grade - a[1].grade || b[1].m - a[1].m).map(([n]) => n);
  }
  if (leanings.includes('sights')) {
    for (const i of sightsPassed(path, ctx.signals)) {
      const s = ctx.signals.sights[i];
      if (s.found) out.found.push(s.name);
      else out.unfound++;
    }
  }
  return out;
}

/**
 * SR2, SR5-SR7: Direct, then one option per leaning switched on that gains enough within the
 * detour; one like Direct is dropped, and two alike are one row naming both. Empty when there
 * is no route at all.
 */
export function routeOptions(o: { streets: StreetSource; signals: Signals; leanings: readonly Leaning[]; from: LngLat; to: LngLat; hint?: RouteHint }): RouteOption[] {
  const direct = o.streets.route(o.from, o.to, o.hint);
  if (!direct) return [];
  const ctx: Context = { streets: o.streets, signals: o.signals, probe: probeOf(o.signals, o.from), hint: o.hint };
  const scenic: { leanings: Leaning[]; route: Route }[] = [];
  for (const l of LEANINGS) {
    if (!o.leanings.includes(l)) continue;
    const r = bestFor(ctx, l, o.from, o.to, direct);
    if (!r || shared(r.path, direct.path) >= SCENIC.directShare) continue;
    const same = scenic.find((s) => shared(s.route.path, r.path) >= SCENIC.sameShare);
    if (same) same.leanings.push(l);
    else scenic.push({ leanings: [l], route: r });
  }
  return [
    { leanings: [], route: direct, passes: { parks: [], streets: [], found: [], unfound: 0 } },
    ...scenic.map((s) => ({ ...s, route: { ...s.route, source: `scenic:${s.leanings.join('+')}` }, passes: passesOf(s.route.path, s.leanings, ctx) })),
  ];
}

/**
 * SR10: a route source that keeps a leaning, for re-routes: from wherever you are, the first of
 * its leanings that gains enough within the detour of the direct way from there, else the
 * direct way.
 */
export function scenicRouteSource(streets: StreetSource, signals: Signals, leanings: readonly Leaning[]): RouteSource {
  const id = `scenic:${leanings.join('+')}`;
  return {
    id,
    route(from, to, hint) {
      const direct = streets.route(from, to, hint);
      if (!direct) return null;
      const ctx: Context = { streets, signals, probe: probeOf(signals, from), hint };
      for (const l of LEANINGS) {
        if (!leanings.includes(l)) continue;
        const r = bestFor(ctx, l, from, to, direct);
        if (r) return { ...r, source: id };
      }
      return direct;
    },
  };
}

const TITLES: Record<Leaning, string> = { green: 'Through green', sights: 'Past the sights', busy: 'Along busy streets' };
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const both = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);

/** SR4: "through Prospect Park, along Thayer Street, past Old Bell and two places to find", or null. */
export function passesLine(p: Passes): string | null {
  const parts: string[] = [];
  const named = p.parks.flatMap((x) => (x.name ? [x.name] : []));
  if (named.length) parts.push(`through ${both(named.slice(0, 2))}`);
  else if (p.parks.some((x) => x.kind === 'park')) parts.push(p.parks.filter((x) => x.kind === 'park').length > 1 ? 'through parks' : 'through a park');
  else if (p.parks.length) parts.push('through woods');
  if (p.streets.length) parts.push(`along ${both(p.streets.slice(0, 2))}`);
  const past = [...p.found.slice(0, 2)];
  if (p.unfound === 1) past.push('a place to find');
  else if (p.unfound > 1) past.push(p.unfound < WORDS.length ? `${WORDS[p.unfound]} places to find` : 'places to find');
  if (past.length) parts.push(`past ${both(past)}`);
  return parts.length ? parts.join(', ') : null;
}

/** SR3, SR14: one row in words, and its label for a screen reader. Never a score. */
export function rowWords(o: RouteOption, direct: RouteOption, pace: number): { title: string; time: string; distance: string; longer: string | null; passes: string | null; label: string } {
  const title = o.leanings.length
    ? o.leanings.map((l, i) => (i ? TITLES[l][0].toLowerCase() + TITLES[l].slice(1) : TITLES[l])).join(', ')
    : 'Direct';
  const ms = timeAtPaceMs(o.route.lengthM, pace);
  const extra = ms - timeAtPaceMs(direct.route.lengthM, pace);
  const longer = !o.leanings.length ? null : extra < 60_000 ? 'under a minute longer' : `${Math.round(extra / 60_000)} min longer`;
  const passes = o.leanings.length ? passesLine(o.passes) : null;
  const distance = formatDistance(o.route.lengthM);
  return { title, time: formatTimeLeft(ms), distance, longer, passes, label: [title, spokenTimeLeft(ms), distance, longer, passes].filter(Boolean).join(', ') };
}

/** SR8: the offered route whose line a map tap landed on (within `maxM`), or null. */
export function optionAt(options: RouteOption[], at: LngLat, maxM: number): number | null {
  let best: { i: number; d: number } | null = null;
  const proj = projector(at);
  options.forEach((o, i) => {
    const d = offPath(at, o.route.path.map(proj), proj);
    if (d <= maxM && (!best || d < best.d)) best = { i, d };
  });
  return (best as { i: number } | null)?.i ?? null;
}

export { lengthOf as pathLength };
