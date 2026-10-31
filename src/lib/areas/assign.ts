import { distanceM, filterFixes, isBreak, smoothDwells, withoutPauses, type PauseSpan } from '../geo';
import type { LngLat, TracePoint } from '../types';
import { AREA_RULES, AREA_SAMPLE_M } from './rules';
import type { Area, AreaLevel, BoundarySource, PlaceCandidate, Region, WalkArea } from './types';

export interface Placement {
  areas: Map<string, Area>;
  rows: WalkArea[];
  /** The walk's title place: the neighborhood it spent most metres in, else its town, else its state. */
  title: string | null;
}

/** An area's key: its level, name and parent's key, so a moved place keeps it and a renamed one does not. */
export const areaKey = (level: AreaLevel, name: string, parent: string | null) => `${level}:${name}${parent ? `|${parent}` : ''}`;

/**
 * Places a walk: its active trace (fixes that pass the filter, no paused
 * stretches, no gaps, standstills held still) is cut into AREA_SAMPLE_M
 * pieces, and each piece counts for the nearest place within reach at each
 * level, with country and state from real outlines where the boundary
 * source has them. A walk across two neighborhoods counts in both.
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
  const areas = new Map<string, Area>();
  const acc = new Map<string, { metres: number; first_t: number; last_t: number; lon: number; lat: number }>();

  const nearest = (level: AreaLevel, p: LngLat): PlaceCandidate | null => {
    let best: { c: PlaceCandidate; score: number } | null = null;
    for (const c of candidates) {
      if (c.level !== level) continue;
      const d = distanceM(p, c.at);
      // Within reach; between a town and a city, the one closer for its size.
      if (d <= c.reachM && (!best || d / c.reachM < best.score)) best = { c, score: d / c.reachM };
    }
    return best?.c ?? null;
  };
  const add = (level: AreaLevel, name: string, at: LngLat, parent: string | null, p: LngLat, t: number, w: number) => {
    const key = areaKey(level, name, parent);
    if (!areas.has(key)) areas.set(key, { key, level, name, parent_key: parent, lon: at[0], lat: at[1], rules });
    const a = acc.get(key) ?? { metres: 0, first_t: t, last_t: t, lon: 0, lat: 0 };
    a.metres += w;
    a.first_t = Math.min(a.first_t, t);
    a.last_t = Math.max(a.last_t, t);
    a.lon += p[0] * w;
    a.lat += p[1] * w;
    acc.set(key, a);
    return key;
  };
  const place = (p: LngLat, t: number, w: number) => {
    const inside = boundaries.containing(p);
    const fromPoint = (level: AreaLevel): Region | null => {
      const c = nearest(level, p);
      return c ? { name: c.name, at: c.at } : null;
    };
    let parent: string | null = null;
    const country = inside?.country ?? fromPoint('country');
    if (country) parent = add('country', country.name, country.at, parent, p, t, w);
    const state = inside?.state ?? fromPoint('state');
    if (state) parent = add('state', state.name, state.at, parent, p, t, w);
    const town = nearest('town', p);
    if (town) parent = add('town', town.name, town.at, parent, p, t, w);
    const hood = nearest('neighborhood', p);
    if (hood) add('neighborhood', hood.name, hood.at, parent, p, t, w);
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
        place([a.lon + (b.lon - a.lon) * mid, a.lat + (b.lat - a.lat) * mid], a.t + (b.t - a.t) * mid, AREA_SAMPLE_M);
        along += step;
        carried = 0;
      }
      carried += len - along;
      if (i === run.length - 1 && carried > 0) place([b.lon, b.lat], b.t, carried);
    }
    run = [];
  };
  for (const f of fixes) {
    if (run.length && isBreak(run[run.length - 1], f, pauses)) flush();
    run.push(f);
  }
  flush();

  const rows: WalkArea[] = [...acc].map(([area_key, a]) => ({
    walk_id: walkId, area_key, metres: Math.round(a.metres), first_t: a.first_t, last_t: a.last_t, lon: a.lon / a.metres, lat: a.lat / a.metres,
  }));
  const most = (level: AreaLevel) =>
    rows.filter((r) => areas.get(r.area_key)!.level === level).sort((x, y) => y.metres - x.metres)[0];
  const top = most('neighborhood') ?? most('town') ?? most('state');
  return { areas, rows, title: top ? areas.get(top.area_key)!.name : null };
}

/** Areas no walk refers to any more: dropped after a walk is placed again (a renamed place, say). */
export function staleAreas(keys: string[], rows: { area_key: string }[]): string[] {
  const used = new Set(rows.map((r) => r.area_key));
  return keys.filter((k) => !used.has(k));
}
