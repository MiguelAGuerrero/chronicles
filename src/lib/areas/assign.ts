import { distanceM, filterFixes, isBreak, smoothDwells, withoutPauses, type PauseSpan } from '../geo';
import type { LngLat, TracePoint } from '../types';
import { AREA_RULES, AREA_SAMPLE_M } from './rules';
import type { Area, AreaLevel, BoundarySource, PlaceCandidate, Region, WalkArea } from './types';

export interface Placement {
  areas: Map<string, Area>;
  rows: WalkArea[];
  /** The walk's title place: the neighborhood it spent most metres in, else its town; null otherwise. */
  title: string | null;
}

/**
 * An area's key: its level, name and parent's key, so a moved place keeps it
 * and a renamed one does not. JSON, so no character in a name can make two
 * areas collide.
 */
export const areaKey = (level: AreaLevel, name: string, parent: string | null) => JSON.stringify([level, name, parent]);

/** A walk's snap is done once its streets and its places were both read; otherwise the next replay tries again. */
export function snapDone(read: { streetsRead: boolean; placesRead: boolean }): boolean {
  return read.streetsRead && read.placesRead;
}

interface Sample {
  p: LngLat;
  t: number;
  w: number;
  country: Region | null;
  state: Region | null;
  town: PlaceCandidate | null;
  hood: PlaceCandidate | null;
}

/**
 * Places a walk: its active trace (fixes that pass the filter, no paused
 * stretches, no gaps, standstills held still) is cut into AREA_SAMPLE_M
 * pieces. Each piece takes its country and state from real outlines where
 * the boundary source has them, the nearest town within reach in that same
 * state, and the nearest neighborhood within reach. Each neighborhood then
 * hangs under the one town most of its metres were in; with no town it is
 * left out. A walk across two neighborhoods counts in both. A walk with no
 * distance (a standstill) is placed where it stood, with no metres.
 */
export function assignAreas(
  walkId: string,
  points: TracePoint[],
  pauses: PauseSpan[],
  candidates: PlaceCandidate[],
  boundaries: BoundarySource,
  startedAt: number | null = null,
): Placement {
  const fixes = smoothDwells(filterFixes(withoutPauses(points, pauses), startedAt));
  const rules = `${AREA_RULES}/${boundaries.id}`;

  const nearest = (level: AreaLevel, p: LngLat, allowed: (c: PlaceCandidate) => boolean = () => true): PlaceCandidate | null => {
    let best: { c: PlaceCandidate; score: number } | null = null;
    for (const c of candidates) {
      if (c.level !== level) continue;
      const d = distanceM(p, c.at);
      // Within reach; between a town and a city, the one closer for its size.
      if (d <= c.reachM && (!best || d / c.reachM < best.score) && allowed(c)) best = { c, score: d / c.reachM };
    }
    return best?.c ?? null;
  };
  // Which state each candidate's own point lies in, so a town across a state line is never taken.
  const stateOf = new Map<PlaceCandidate, string | null>();
  const candidateState = (c: PlaceCandidate) => {
    if (!stateOf.has(c)) stateOf.set(c, boundaries.containing(c.at)?.state?.name ?? null);
    return stateOf.get(c)!;
  };

  const samples: Sample[] = [];
  const sample = (p: LngLat, t: number, w: number) => {
    const inside = boundaries.containing(p);
    const pointRegion = (level: AreaLevel): Region | null => {
      const c = nearest(level, p);
      return c ? { name: c.name, at: c.at } : null;
    };
    const state = inside?.state ?? pointRegion('state');
    const sameState = (c: PlaceCandidate) => !inside?.state || candidateState(c) == null || candidateState(c) === inside.state.name;
    samples.push({
      p, t, w,
      country: inside?.country ?? pointRegion('country'),
      state,
      town: nearest('town', p, sameState),
      hood: nearest('neighborhood', p),
    });
  };

  // Walk each unbroken run, placing the middle of every AREA_SAMPLE_M piece.
  let run: TracePoint[] = [];
  const flush = () => {
    let carried = 0;
    for (let i = 1; i < run.length; i++) {
      const a = run[i - 1];
      const b = run[i];
      const len = distanceM([a.lon, a.lat], [b.lon, b.lat]);
      let along = 0;
      while (len - along >= AREA_SAMPLE_M - carried) {
        const step = AREA_SAMPLE_M - carried;
        const mid = (along + step / 2) / len;
        sample([a.lon + (b.lon - a.lon) * mid, a.lat + (b.lat - a.lat) * mid], a.t + (b.t - a.t) * mid, AREA_SAMPLE_M);
        along += step;
        carried = 0;
      }
      carried += len - along;
      if (i === run.length - 1 && carried > 0) sample([b.lon, b.lat], b.t, carried);
    }
    run = [];
  };
  for (const f of fixes) {
    if (run.length && isBreak(run[run.length - 1], f, pauses)) flush();
    run.push(f);
  }
  flush();
  if (samples.length === 0 && fixes.length) sample([fixes[0].lon, fixes[0].lat], fixes[0].t, 0);

  const areas = new Map<string, Area>();
  const acc = new Map<string, { metres: number; first_t: number; last_t: number; lon: number; lat: number; weight: number }>();
  const add = (level: AreaLevel, region: { name: string; at: LngLat }, parent: string | null, s: Sample) => {
    const key = areaKey(level, region.name, parent);
    if (!areas.has(key)) areas.set(key, { key, level, name: region.name, parent_key: parent, lon: region.at[0], lat: region.at[1], rules });
    const a = acc.get(key) ?? { metres: 0, first_t: s.t, last_t: s.t, lon: 0, lat: 0, weight: 0 };
    const weight = s.w || 1;
    a.metres += s.w;
    a.first_t = Math.min(a.first_t, s.t);
    a.last_t = Math.max(a.last_t, s.t);
    a.lon += s.p[0] * weight;
    a.lat += s.p[1] * weight;
    a.weight += weight;
    acc.set(key, a);
    return key;
  };

  // Country, state and town per piece; each piece's town key is kept for its neighborhood.
  const townKeyOf: (string | null)[] = samples.map((s) => {
    let parent: string | null = null;
    if (s.country) parent = add('country', s.country, parent, s);
    if (s.state) parent = add('state', s.state, parent, s);
    return s.town ? add('town', s.town, parent, s) : null;
  });
  // Each neighborhood under the town most of its metres were in; none without a town.
  const hoodTowns = new Map<PlaceCandidate, Map<string, number>>();
  samples.forEach((s, i) => {
    const town = townKeyOf[i];
    if (!s.hood || !town) return;
    const m = hoodTowns.get(s.hood) ?? new Map<string, number>();
    m.set(town, (m.get(town) ?? 0) + (s.w || 1));
    hoodTowns.set(s.hood, m);
  });
  const hoodParent = new Map<PlaceCandidate, string>();
  for (const [hood, towns] of hoodTowns) hoodParent.set(hood, [...towns].sort((x, y) => y[1] - x[1])[0][0]);
  for (const s of samples) {
    const parent = s.hood && hoodParent.get(s.hood);
    if (s.hood && parent) add('neighborhood', s.hood, parent, s);
  }

  const rows: WalkArea[] = [...acc].map(([area_key, a]) => ({
    walk_id: walkId, area_key, metres: Math.round(a.metres), first_t: a.first_t, last_t: a.last_t, lon: a.lon / a.weight, lat: a.lat / a.weight,
  }));
  const most = (level: AreaLevel) =>
    rows.filter((r) => areas.get(r.area_key)!.level === level).sort((x, y) => y.metres - x.metres)[0];
  // Never titled by a state alone: the caller falls back to the nearest named place.
  const top = most('neighborhood') ?? most('town');
  return { areas, rows, title: top ? areas.get(top.area_key)!.name : null };
}

/** Areas no walk refers to any more: dropped after a walk is placed again (a renamed place, say). */
export function staleAreas(keys: string[], rows: { area_key: string }[]): string[] {
  const used = new Set(rows.map((r) => r.area_key));
  return keys.filter((k) => !used.has(k));
}
