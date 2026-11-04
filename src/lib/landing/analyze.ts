import type { ActivityPoint } from '../activity/points';
import type { PlaceCandidate } from '../areas/types';
import { boundsOf, distanceM, projector } from '../geo';
import { tilesIn } from '../tileMath';
import type { LngLat, StreetSegment } from '../types';
import { GRADE_RULES, gradeStreets, type GradedLine } from './grade';
import mainStreets from './mainStreets.json';
import { Buckets, cross, hull, linkWithin, longest, nearestOn, runLength, type XY } from './spatial';

/**
 * Where a town's activity centres (v1.5, then activity density): how densely
 * places of every kind sit along each street, graded against the read itself
 * (AD9, AD10); the busy streets and pockets those grades make (AD13); one
 * landing point. Pure: places, streets and towns come in from whatever
 * source; nothing here knows a tile schema.
 */
export const LANDING_RULES = {
  /** The area read around the centre. */
  radiusM: 1500,
  /** Towns are looked for this far around the press (a coarse read); only one within radiusM becomes the centre. */
  townM: 3000,
  /** Density and its grades (AD9, AD10). */
  ...GRADE_RULES,
  /** A busy street: one name at medium or above, this long at least, its samples no further apart than this (AD13). */
  busyMinM: 120,
  runGapM: 25,
  /** A pocket: medium-or-stronger stretches no more than a block apart, together this long at least. */
  maxGapM: 80,
  minSpanM: 200,
  /** A pocket's outline is padded by half this. */
  cellM: 50,
  /** A station this close to the pocket is where to start. */
  transitM: 150,
  /** A pocket with no busy street takes the neighbourhood within this. */
  neighbourhoodM: 1000,
} as const;

/** AD3: the z14 tiles a read covers, the map's and Overture's alike. */
export const readTiles = (centre: LngLat) => tilesIn(boundsOf([centre], LANDING_RULES.radiusM)!);

/** Common main-street names, the last fallback (L6). Data, not code. */
export const MAIN_STREET_NAMES: readonly string[] = mainStreets.names;

/** A busy street (AD13): a run of one named street at medium grade or above. */
export interface Strip {
  name: string;
  /** End to end along the run. */
  lengthM: number;
  weight: number;
  /** The street pieces it covers, for drawing. */
  lines: LngLat[][];
  /** Its busiest point, on the street. */
  peak: LngLat;
}

export interface Pocket {
  name: string;
  weight: number;
  spanM: number;
  centre: LngLat;
  /** An outline for shading (the convex hull of its places, padded). */
  hull: LngLat[];
  /** The names of its strips, heaviest first; their lines are kept once, in AreaAnalysis.strips. */
  strips: string[];
}

export type LandingBasis = 'density' | 'main-roads' | 'main-street' | 'centre';

export interface Landing {
  at: LngLat;
  street: string | null;
  via: 'transit' | 'strip' | 'cell' | 'fallback';
}

export interface AreaAnalysis {
  basis: LandingBasis;
  /** Says which rule placed the landing (L6). */
  reason: string;
  pockets: Pocket[];
  strips: Strip[];
  /** Every graded stretch, for drawing (AD12); missing on areas analyzed before activity density. */
  graded: GradedLine[];
  landing: Landing | null;
}

const CENTRE_KINDS = new Set(['city', 'borough', 'town']);
/**
 * The centre to analyze around (L1): the nearest town or city close enough
 * that the pressed spot stays inside the read (its radius), never a village;
 * else the spot pressed (audit).
 */
export function centreFor(pressed: LngLat, towns: PlaceCandidate[]): LngLat {
  let best: LngLat = pressed;
  let bestD: number = LANDING_RULES.radiusM;
  for (const t of towns) {
    if (t.level !== 'town' || (t.kind && !CENTRE_KINDS.has(t.kind))) continue;
    const d = distanceM(pressed, t.at);
    if (d <= bestD) [best, bestD] = [t.at, d];
  }
  return best;
}

const CLASS_RANK: Record<string, number> = { trunk: 3, primary: 3, secondary: 2, tertiary: 1 };
const rankOf = (s: StreetSegment) => CLASS_RANK[s.kind_detail.split('/')[0]] ?? 0;
const SUFFIXES = new Set(['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'lane', 'ln', 'way', 'drive', 'dr', 'place', 'pl', 'square', 'sq', 'plaza', 'row', 'terrace']);
const DIRECTIONS = new Set(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'north', 'south', 'east', 'west']);

/** "North Main St. NW" → "main": directions and the street word off both ends. */
export function coreName(name: string): string {
  const words = name.toLowerCase().replace(/\./g, '').split(/\s+/).filter(Boolean);
  while (words.length > 1 && DIRECTIONS.has(words[0])) words.shift();
  while (words.length > 1 && DIRECTIONS.has(words[words.length - 1])) words.pop();
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}

/** A landing never moves further than this onto a named street; beyond it, it stays put, unnamed. */
const SNAP_M = 150;

/**
 * The analysis (L4-L7). Strips are runs of places along a named street,
 * linked place to place no more than a block apart; pockets are dense places
 * linked the same way. Both are found by density alone, as many as there
 * are. With nothing dense, the fallbacks run in order.
 */
export function analyzeArea(o: {
  centre: LngLat;
  points: ActivityPoint[];
  segments: StreetSegment[];
  /** Named place points (neighbourhoods name pockets). */
  towns: PlaceCandidate[];
  transit: LngLat[];
}): AreaAnalysis {
  const R = LANDING_RULES;
  const toXY = projector(o.centre);
  const kx = toXY([o.centre[0] + 1, o.centre[1]])[0];
  const ky = toXY([o.centre[0], o.centre[1] + 1])[1];
  const toLL = (p: XY): LngLat => [o.centre[0] + p[0] / kx, o.centre[1] + p[1] / ky];

  const points = o.points.filter((p) => p.weight > 0 && distanceM(p.at, o.centre) <= R.radiusM);
  const named = o.segments.filter((s) => s.name).map((s) => ({ name: s.name!, seg: s, lines: s.geometry.map((l) => l.map(toXY)) }));
  const byStreet = new Map<string, typeof named>();
  for (const n of named) {
    const list = byStreet.get(n.name);
    if (list) list.push(n);
    else byStreet.set(n.name, [n]);
  }

  // Named pieces bucketed by points along them, for "the nearest named street".
  const pieceBuckets = new Buckets<number>(SNAP_M);
  named.forEach((n, i) => {
    for (const line of n.lines)
      for (let k = 0; k < line.length; k++) {
        pieceBuckets.add(line[k], i);
        if (k > 0) {
          const len = Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
          const steps = Math.floor(len / (SNAP_M / 2));
          for (let j = 1; j <= steps; j++) pieceBuckets.add([line[k - 1][0] + ((line[k][0] - line[k - 1][0]) * j) / (steps + 1), line[k - 1][1] + ((line[k][1] - line[k - 1][1]) * j) / (steps + 1)], i);
        }
      }
  });
  const nearestNamed = (p: XY, within: number, only?: (n: (typeof named)[number]) => boolean) => {
    let best: { q: XY; d: number; name: string } | null = null;
    const seen = new Set<number>();
    for (const { v: i } of pieceBuckets.near(p, within + SNAP_M / 2)) {
      if (seen.has(i)) continue;
      seen.add(i);
      if (only && !only(named[i])) continue;
      for (const l of named[i].lines) {
        const r = nearestOn(p, l);
        if (r.d <= within && (!best || r.d < best.d)) best = { ...r, name: named[i].name };
      }
    }
    return best;
  };

  // The grades (AD9, AD10).
  const g = gradeStreets({ centre: o.centre, points, segments: o.segments });
  const { samples, grades } = g;
  /** A sample's share of the places near it: summed over a run, about the weight of its places. */
  const mass = (i: number) => (samples[i].density * R.stepM) / R.kernelM;
  const busy = (i: number) => grades[i] >= 2;

  // Busy streets (AD13): per name, medium-or-stronger samples linked along the street.
  type StripX = Strip & { members: Set<number> };
  const strips: StripX[] = [];
  const busyByName = new Map<string, number[]>();
  samples.forEach((s, i) => {
    if (!busy(i)) return;
    const list = busyByName.get(s.name);
    if (list) list.push(i);
    else busyByName.set(s.name, [i]);
  });
  for (const [name, idx] of busyByName) {
    for (const group of linkWithin(idx.map((i) => samples[i].xy), R.runGapM, false)) {
      const members = group.members.map((k) => idx[k]);
      const lengthM = runLength(members.map((i) => samples[i].xy));
      if (lengthM < R.busyMinM) continue;
      const set = new Set(members);
      let peak = members[0];
      for (const i of members) if (samples[i].density > samples[peak].density) peak = i;
      const lines = g.stretches.filter((st) => st.grade >= 2 && st.members.some((i) => set.has(i))).map((st) => st.line);
      const weight = members.reduce((acc, i) => acc + mass(i), 0);
      strips.push({ name, lengthM, weight, lines, peak: samples[peak].at, members: set });
    }
  }
  strips.sort((a, b) => b.weight - a.weight);

  // Pockets: medium-or-stronger stretches of any street, no more than a block apart.
  const busyIdx = samples.map((_, i) => i).filter(busy);
  type PocketX = Omit<Pocket, 'strips'> & { members: Set<number>; list: number[]; strips: StripX[] };
  const pockets: PocketX[] = [];
  for (const group of linkWithin(busyIdx.map((i) => samples[i].xy), R.maxGapM, false)) {
    const list = group.members.map((k) => busyIdx[k]);
    if (runLength(list.map((i) => samples[i].xy)) < R.minSpanM) continue;
    const weight = list.reduce((acc, i) => acc + mass(i), 0);
    const spanM = longest(list.map((i) => samples[i].xy));
    const sum = list.reduce((acc, i) => acc + samples[i].density, 0);
    const centre: XY = [list.reduce((acc, i) => acc + samples[i].xy[0] * samples[i].density, 0) / sum, list.reduce((acc, i) => acc + samples[i].xy[1] * samples[i].density, 0) / sum];
    const pad = R.cellM / 2;
    const corners = list.flatMap((i) => [[-pad, -pad], [pad, -pad], [-pad, pad], [pad, pad]].map(([dx, dy]) => [samples[i].xy[0] + dx, samples[i].xy[1] + dy] as XY));
    pockets.push({ name: '', weight, spanM, centre: toLL(centre), hull: hull(corners).map(toLL), strips: [], members: new Set(list), list });
  }
  pockets.sort((a, b) => b.weight - a.weight);
  for (const s of strips) {
    let best: PocketX | null = null;
    let bestN = 0;
    for (const p of pockets) {
      let n = 0;
      for (const m of s.members) if (p.members.has(m)) n++;
      if (n > bestN) [best, bestN] = [p, n];
    }
    best?.strips.push(s);
  }
  for (const p of pockets) {
    p.strips.sort((a, b) => b.weight - a.weight);
    if (p.strips[0]) p.name = p.strips[0].name;
    else {
      let hood: string | null = null;
      let hoodD: number = R.neighbourhoodM;
      for (const t of o.towns) {
        if (t.level !== 'neighborhood') continue;
        const d = distanceM(t.at, p.centre);
        if (d <= hoodD) [hood, hoodD] = [t.name, d];
      }
      p.name = hood ?? 'A busy pocket';
    }
  }
  const strip = ({ members: _m, ...rest }: StripX): Strip => rest;
  const cleanStrips = strips.map(strip);
  const cleanPockets: Pocket[] = pockets.map(({ members: _m, list: _l, strips: ps, ...p }) => ({ ...p, strips: ps.map((x) => x.name) }));
  /** Onto a named street within reach, else where it is, unnamed (audit). */
  const land = (p: XY, via: Landing['via']): Landing => {
    const n = nearestNamed(p, SNAP_M);
    return n ? { at: toLL(n.q), street: n.name, via } : { at: toLL(p), street: null, via };
  };

  if (pockets.length || strips.length) {
    const top = pockets[0];
    const topStrips = top ? top.strips : [...strips].sort((a, b) => b.weight - a.weight);
    let landing: Landing | null = null;
    // A station by the pocket first, landing on the pocket's own street (L7).
    if (top) {
      const memberBuckets = new Buckets<number>(R.transitM);
      for (const i of top.list) memberBuckets.add(samples[i].xy, i);
      let station: XY | null = null;
      let stationD: number = R.transitM;
      for (const t of o.transit) {
        const xy = toXY(t);
        for (const { p } of memberBuckets.near(xy, R.transitM)) {
          const d = Math.hypot(p[0] - xy[0], p[1] - xy[1]);
          if (d <= stationD) [station, stationD] = [xy, d];
        }
      }
      if (station) {
        const own = new Set(topStrips.map((x) => x.name));
        const onOwn = own.size ? nearestNamed(station, R.transitM + R.frontageM, (n) => own.has(n.name)) : null;
        landing = onOwn ? { at: toLL(onOwn.q), street: onOwn.name, via: 'transit' } : null;
        if (!landing && !own.size) landing = land(station, 'transit');
      }
    }
    if (!landing && topStrips[0]) {
      const peak = toXY(topStrips[0].peak);
      const n = nearestNamed(peak, 5, (x) => x.name === topStrips[0].name);
      landing = { at: n ? toLL(n.q) : topStrips[0].peak, street: topStrips[0].name, via: 'strip' };
    }
    if (!landing && top) {
      let densest = top.list[0];
      for (const i of top.list) if (samples[i].density > samples[densest].density) densest = i;
      landing = land(samples[densest].xy, 'cell');
    }
    return { basis: 'density', reason: 'Busiest area', pockets: cleanPockets, strips: cleanStrips, graded: g.graded, landing };
  }

  // Fallbacks, only with nothing graded medium (L6). The graded stretches still draw (activity-density audit 1).
  const nearestTo = (list: typeof named) => {
    let best: { q: XY; d: number; name: string } | null = null;
    for (const n of list)
      for (const l of n.lines) {
        const r = nearestOn([0, 0], l);
        if (!best || r.d < best.d) best = { ...r, name: n.name };
      }
    return best;
  };
  // (a) the crossing nearest the centre of the highest-class pair of named streets that do cross.
  const ranked = [...byStreet]
    .map(([name, pieces]) => ({ name, pieces, rank: Math.max(...pieces.map((p) => rankOf(p.seg))), d: nearestTo(pieces)!.d }))
    .filter((x) => x.rank > 0 && x.d <= R.radiusM)
    .sort((a, b) => b.rank - a.rank || a.d - b.d)
    .slice(0, 8);
  for (let i = 0; i < ranked.length; i++)
    for (let j = i + 1; j < ranked.length; j++) {
      const A = ranked[i];
      const B = ranked[j];
      let at: XY | null = null;
      for (const la of A.pieces.flatMap((p) => p.lines))
        for (const lb of B.pieces.flatMap((p) => p.lines))
          for (let x = 1; x < la.length; x++)
            for (let y = 1; y < lb.length; y++) {
              const c = cross(la[x - 1], la[x], lb[y - 1], lb[y]);
              if (c && Math.hypot(c[0], c[1]) <= R.radiusM && (!at || Math.hypot(c[0], c[1]) < Math.hypot(at[0], at[1]))) at = c;
            }
      if (at) {
        return {
          basis: 'main-roads', reason: `Main roads: ${A.name} & ${B.name}`, pockets: [], strips: [], graded: g.graded,
          landing: { at: toLL(at), street: A.name, via: 'fallback' },
        };
      }
    }
  // (b) a street on the main-street list, in its usual forms.
  const listed = new Set(MAIN_STREET_NAMES.map((n) => n.toLowerCase()));
  const main = nearestTo(named.filter((n) => listed.has(n.name.toLowerCase()) || listed.has(coreName(n.name))));
  if (main && main.d <= R.radiusM) {
    return { basis: 'main-street', reason: `A main street: ${main.name}`, pockets: [], strips: [], graded: g.graded, landing: { at: toLL(main.q), street: main.name, via: 'fallback' } };
  }
  // (c) the town centre, on its nearest named street.
  const any = nearestTo(named);
  return {
    basis: 'centre', reason: 'Town centre', pockets: [], strips: [], graded: g.graded,
    landing: any ? { at: toLL(any.q), street: any.name, via: 'fallback' } : { at: o.centre, street: null, via: 'fallback' },
  };
}
