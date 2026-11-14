// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { coveredBy, hoodAllowed, inOutline, sameName, townAt, withHoods, withOutlines, type OutlineSet, type TownPick } from './outlines';
import { bboxOf, inRing, representative, type Bbox } from './shapes';
import type { HoodOutline, PlaceCandidate } from './types';

/*
 * Neighborhood boundaries (HB1-HB16): which neighborhood a point is in, from real shapes where the tiles
 * held them and the nearest point where they did not, and the ground a neighborhood owns for a map to draw
 * and a card to count across. One function decides (`hoodAt`); placing a walk, Explore's membership and the
 * share a map draws all call it, so they cannot disagree (HB8).
 */

export { withHoods };
export const hoodRepresentative = representative;

/** A neighborhood's ground: what a map draws and a card counts across (HB9, HB11). */
export interface Ground {
  polygons: LngLat[][][];
  bbox: Bbox;
}

/**
 * HB2-HB4: the neighborhood a point is in. Where the shapes were read at the point and the point's town is
 * known, the smallest shape holding it owns it, never two. Otherwise the nearest neighborhood point within
 * reach, inside the town (TO6). A neighborhood that has a shape never takes ground by its point where
 * shapes were read: its shape ends where it ends. Candidates come through `withOutlines` first.
 */
export function hoodAt(
  p: LngLat,
  candidates: PlaceCandidate[],
  town: TownPick | null,
  set: OutlineSet | null | undefined,
  within: (c: PlaceCandidate) => number = (c) => c.reachM,
): PlaceCandidate | null {
  const covered = coveredBy(set, p);
  if (covered && town) {
    let owner: PlaceCandidate | null = null;
    for (const c of candidates) {
      const h = c.hoodOutline;
      if (c.level !== 'neighborhood' || !h || !inOutline(p, h) || !hoodAllowed(c, town, set)) continue;
      const o = owner?.hoodOutline;
      if (!owner || !o || h.areaM2 < o.areaM2 || (h.areaM2 === o.areaM2 && distanceM(p, c.at) < distanceM(p, owner.at))) owner = c;
    }
    if (owner) return owner;
  }
  let best: PlaceCandidate | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    if (c.level !== 'neighborhood' || (covered && c.hoodOutline)) continue;
    const d = distanceM(p, c.at);
    if (d <= within(c) && d < bestD && hoodAllowed(c, town, set)) [best, bestD] = [c, d];
  }
  return best;
}

/** A shape's polygons with the smaller shapes inside it cut out as holes (HB2, HB9, HB11). */
function shapeGround(shape: HoodOutline, others: HoodOutline[]): Ground {
  const polygons: LngLat[][][] = shape.polygons.map((rings) => rings.slice());
  for (const o of others) {
    if (o === shape || o.id === shape.id || o.areaM2 >= shape.areaM2 || !inOutline(o.at, shape)) continue;
    for (const piece of o.polygons) {
      const outer = piece[0];
      // Only a shape wholly inside its host is cut out of it: one that pokes out would draw its edge across the host's (audit 7).
      const host = polygons.find((rings) => outer.every((v) => inRing(v, rings[0])));
      if (host) host.push(outer);
    }
  }
  return { polygons, bbox: shape.bbox };
}

/** The extent a neighborhood's card counts across (HB11): its shape with the smaller ones cut out; null without a shape. */
export function hoodExtentFor(
  area: { level: string; name: string; at: LngLat },
  set: OutlineSet | null | undefined,
): { outline: Ground; partial: boolean } | null {
  const hoods = set?.hoods;
  if (area.level !== 'neighborhood' || !hoods?.length) return null;
  const shape = hoods.find((h) => sameName(h.name, area.name) && inOutline(area.at, h));
  return shape ? { outline: shapeGround(shape, hoods), partial: false } : null;
}

// ---- a point-only neighborhood's share: the cells `hoodAt` gives it, as an outline

/** Cell size of the share's grid, in metres: the line is drawn along its edges. */
const CELL_M = 20;

/**
 * The ground a neighborhood owns (HB9): its shape with the smaller ones cut out, or, with no shape, the
 * edge of its nearest-point share: the ground `hoodAt` gives it, within its reach, found on a grid fixed to
 * the map (so two shares meet edge to edge) and traced. Null for anything but a neighborhood, or a share with
 * no ground.
 */
export function hoodGround(hood: PlaceCandidate, candidates: PlaceCandidate[], set: OutlineSet | null | undefined): Ground | null {
  if (hood.level !== 'neighborhood') return null;
  if (hood.hoodOutline) {
    return shapeGround(hood.hoodOutline, candidates.flatMap((c) => (c.level === 'neighborhood' && c.hoodOutline ? [c.hoodOutline] : [])));
  }
  const lat0 = Math.round(hood.at[1] * 10) / 10;
  const dLat = CELL_M / 110_540;
  const dLon = CELL_M / (111_320 * Math.cos((lat0 * Math.PI) / 180));
  const reach = hood.reachM;
  const i0 = Math.floor((hood.at[0] - reach / (111_320 * Math.cos((lat0 * Math.PI) / 180))) / dLon);
  const i1 = Math.ceil((hood.at[0] + reach / (111_320 * Math.cos((lat0 * Math.PI) / 180))) / dLon);
  const j0 = Math.floor((hood.at[1] - reach / 110_540) / dLat);
  const j1 = Math.ceil((hood.at[1] + reach / 110_540) / dLat);
  // A neighborhood inside a town's drawn border keeps to it: the line never crosses the border it is drawn beside (ui 1).
  const home = townAt(hood.at, candidates, set);
  const homeId = home?.by === 'outline' ? home.c.outline?.id : undefined;
  const owned = new Set<string>();
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const p: LngLat = [(i + 0.5) * dLon, (j + 0.5) * dLat];
      if (distanceM(p, hood.at) > reach) continue;
      const town = townAt(p, candidates, set);
      if (homeId && !(town?.by === 'outline' && town.c.outline?.id === homeId)) continue;
      if (hoodAt(p, candidates, town, set) === hood) owned.add(`${i},${j}`);
    }
  }
  if (!owned.size) return null;
  const rings = traceRings(owned).map((ring) => relax(smooth(smooth(ring.map(([i, j]): LngLat => [i * dLon, j * dLat])))));
  const polygons = groupRings(rings);
  return polygons.length ? { polygons, bbox: bboxOf(polygons) } : null;
}

type Pt = [number, number];

/** The boundary loops of a set of grid cells: counter-clockwise outer loops, clockwise holes, collinear runs merged. */
function traceRings(cells: Set<string>): Pt[][] {
  const has = (i: number, j: number) => cells.has(`${i},${j}`);
  // Directed edges with the cell on their left; an edge shared by two owned cells is no boundary.
  const next = new Map<string, Pt[]>();
  const add = (a: Pt, b: Pt) => {
    const k = `${a[0]},${a[1]}`;
    (next.get(k) ?? next.set(k, []).get(k)!).push(b);
  };
  for (const key of cells) {
    const [i, j] = key.split(',').map(Number);
    if (!has(i, j - 1)) add([i, j], [i + 1, j]);
    if (!has(i + 1, j)) add([i + 1, j], [i + 1, j + 1]);
    if (!has(i, j + 1)) add([i + 1, j + 1], [i, j + 1]);
    if (!has(i - 1, j)) add([i, j + 1], [i, j]);
  }
  const rings: Pt[][] = [];
  for (const [k, outs] of next) {
    while (outs.length) {
      const start = k.split(',').map(Number) as Pt;
      const ring: Pt[] = [start];
      let cur = start;
      let dir: Pt | null = null;
      for (;;) {
        const ck = `${cur[0]},${cur[1]}`;
        const options = next.get(ck);
        if (!options?.length) break;
        // At a corner where two loops touch, turn left-most first so loops stay simple.
        let pick = 0;
        if (options.length > 1 && dir) {
          const turn = (o: Pt) => dir![0] * (o[1] - cur[1]) - dir![1] * (o[0] - cur[0]);
          pick = options.reduce((bi, o, i) => (turn(o) > turn(options[bi]) ? i : bi), 0);
        }
        const nxt = options.splice(pick, 1)[0];
        dir = [nxt[0] - cur[0], nxt[1] - cur[1]];
        cur = nxt;
        if (cur[0] === start[0] && cur[1] === start[1]) break;
        ring.push(cur);
      }
      if (ring.length >= 3) rings.push(mergeCollinear(ring));
    }
  }
  return rings;
}

function mergeCollinear(ring: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[(i + ring.length - 1) % ring.length];
    const b = ring[i];
    const c = ring[(i + 1) % ring.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) out.push(b);
  }
  return out;
}

/** One pass of corner cutting, so a grid's stairs read as a line (the ring stays within its hull and closed); a ring may be closed already (its last point the first). */
function smooth(ring: LngLat[]): LngLat[] {
  if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, -1);
  const out: LngLat[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  out.push(out[0]);
  return out;
}

/** A closed ring's vertices at an even spacing of about `stepM` metres along it, so an average over neighbors is an average over distance. */
function evenly(ring: LngLat[], stepM: number): LngLat[] {
  const k = 111_320 * Math.cos((ring[0][1] * Math.PI) / 180);
  const segs = ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    return Math.hypot((q[0] - p[0]) * k, (q[1] - p[1]) * 110_540);
  });
  const total = segs.reduce((a, b) => a + b, 0);
  const n = Math.max(3, Math.round(total / stepM));
  const out: LngLat[] = [];
  let i = 0;
  let into = 0;
  for (let m = 0; m < n; m++) {
    const target = (m * total) / n;
    while (i < ring.length - 1 && into + segs[i] < target) into += segs[i++];
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const f = segs[i] === 0 ? 0 : (target - into) / segs[i];
    out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
  }
  return out;
}

/**
 * Takes the grid's wobble out of a closed ring (ui 2): each vertex moves to the mean of its neighbors a few steps either side,
 * a few times over. A straight edge, such as the bisector between two shares, stays where it is; a loop shrinks by less than a metre.
 */
function relax(ring: LngLat[], window = 4, passes = 3): LngLat[] {
  let pts = evenly(ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring.slice(), 6);
  const n = pts.length;
  if (n < 2 * window + 1) return ring;
  for (let pass = 0; pass < passes; pass++) {
    const next: LngLat[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let x = 0;
      let y = 0;
      for (let d = -window; d <= window; d++) {
        const q = pts[(i + d + n) % n];
        x += q[0];
        y += q[1];
      }
      next[i] = [x / (2 * window + 1), y / (2 * window + 1)];
    }
    pts = next;
  }
  return [...pts, pts[0]];
}

const signedArea = (ring: LngLat[]) => {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return s / 2;
};

/** Outer loops (counter-clockwise) with the holes (clockwise) they contain, as polygons. */
function groupRings(rings: LngLat[][]): LngLat[][][] {
  const outers = rings.filter((r) => signedArea(r) > 0).map((r) => [r]);
  for (const hole of rings.filter((r) => signedArea(r) < 0)) {
    const host = outers.find((o) => inOutline(hole[0], { polygons: [[o[0]]], bbox: bboxOf([[o[0]]]) }));
    if (host) host.push(hole);
  }
  return outers;
}

/**
 * The ground of a listed neighborhood, from what the cache holds (HB9, HB12): null where the tiles under it were
 * not read, so a map keeps its ring and nothing is said. `candidates` are the neighborhoods and towns around it.
 */
export function groundOf(area: { level: string; name: string; at: LngLat }, candidates: PlaceCandidate[], set: OutlineSet | null | undefined): Ground | null {
  if (area.level !== 'neighborhood' || !set || !coveredBy(set, area.at)) return null;
  const cands = withOutlines(candidates, set);
  const c = cands.find((x) => x.level === 'neighborhood' && sameName(x.name, area.name) && distanceM(x.at, area.at) <= 1000);
  return c ? hoodGround(c, cands, set) : null;
}

/** A neighborhood, as the outlines kept for it are filed (SS1). */
export const hoodKeyOf = (hood: { name: string; at: LngLat }): string => `${hood.name}|${hood.at[0].toFixed(5)},${hood.at[1].toFixed(5)}`;

/**
 * What a neighborhood's outline was derived from (SS1): the neighborhood, how many tiles were read, and the candidates
 * weighed, so a revisit with the same takes the outline kept, and a tile or a candidate since derives it again.
 */
export const groundKey = (hood: { name: string; at: LngLat }, tiles: number, near: readonly PlaceCandidate[]): string =>
  `${hoodKeyOf(hood)}#${tiles}#${near.map((c) => `${c.level}:${c.name}:${c.at[0].toFixed(5)},${c.at[1].toFixed(5)}`).join('|')}`;

/** An outline kept for a neighborhood (SS1); `ground` null where it has none (its ring stands). */
export interface KeptGround {
  hood: string;
  key: string;
  ground: Ground | null;
}

/** The outlines kept, with this one newest; the same key replaced, the oldest dropped past `max` (SS1). */
export function keepGround(kept: readonly KeptGround[], entry: KeptGround, max = 24): KeptGround[] {
  const out = [...kept.filter((k) => k.key !== entry.key), entry];
  return out.length > max ? out.slice(out.length - max) : out;
}

/**
 * The outline kept for a neighborhood (SS1): the one derived from exactly `key`, or with no key yet (its tiles still being
 * looked up) its newest, so a revisit draws at once.
 */
export function groundFor(kept: readonly KeptGround[], hood: string, key: string | null): KeptGround | undefined {
  for (let i = kept.length - 1; i >= 0; i--) if (kept[i].hood === hood && (key == null || kept[i].key === key)) return kept[i];
  return undefined;
}

/** How many times, and how far apart, the cache is looked in for a neighborhood's tiles (audit 5). */
export const LOOKS = 8;
export const LOOK_MS = 1500;

/** The points whose tiles a neighborhood's ground needs: its own and its neighbors' beyond it, about 1.5 km each way (audit 4). */
export function hoodProbe([lon, lat]: LngLat): LngLat[] {
  const dLat = 1500 / 110_540;
  const dLon = 1500 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [[lon, lat], [lon + dLon, lat], [lon - dLon, lat], [lon, lat + dLat], [lon, lat - dLat]];
}

/** Whether the cache is looked in again: a probe's tile is not kept yet, and the tries are not spent (audit 5). */
export const lookAgain = (set: OutlineSet, probes: LngLat[], tries: number): boolean => tries < LOOKS && !probes.every((p) => coveredBy(set, p));

/**
 * What a neighborhood's card counts across, the ground its line draws (HB11, audit 4): its shape with the smaller ones cut
 * out, or its share; null where the tiles were not read, so the ring stands.
 */
export function hoodExtent(
  area: { level: string; name: string; at: LngLat },
  candidates: PlaceCandidate[],
  set: OutlineSet | null | undefined,
): { outline: Ground; partial: boolean } | null {
  const own = hoodExtentFor(area, set);
  if (own) return own;
  const g = groundOf(area, candidates, set);
  return g ? { outline: g, partial: false } : null;
}
