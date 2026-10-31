import type { Area, AreaLevel, WalkArea } from './areas/types';
import type { Bounds } from './geo';
import { metersPerPixel, PIN_GROUP_PX } from './pins';
import type { LngLat, Walk } from './types';

/**
 * The home map's places, built from walks, Area and WalkArea only: never a
 * trace or a file (criterion 24). The open walk is left out until it stops.
 */
export interface PlacesIndex {
  areas: Map<string, Area>;
  /** Per area key: the stopped walks in it, and the metres walked there. */
  byArea: Map<string, { walkIds: Set<string>; metres: number; lastT: number }>;
  /** Per town key: the walks that were in the town but in none of its neighborhoods. */
  elsewhere: Map<string, { walkIds: Set<string>; at: LngLat; metres: number; lastT: number }>;
  walks: Map<string, Walk>;
  /** Stopped walks, placed or not. */
  walkCount: number;
  /** Neighborhoods walked, plus each town's "elsewhere". */
  placeCount: number;
  multiCountry: boolean;
  /** Every place walked, for fitting the map; null when nothing has been. */
  bounds: Bounds | null;
}

export interface Star {
  id: string;
  label: string;
  at: LngLat;
  walkIds: string[];
  /** How many places it stands for (more than one when merged). */
  count: number;
  /** The area keys (or elsewhere ids) behind it. */
  keys: string[];
}

const ELSEWHERE = 'elsewhere:';
const stopped = (w: Walk) => !w.open && w.ended_at != null;

/**
 * Which level the map shows at a zoom (the owner's criteria 12 and 26):
 * neighborhoods from z11, towns from z6, states below that, and countries
 * below z3 only once walks span two countries.
 */
export function levelForZoom(zoom: number, multiCountry: boolean): AreaLevel {
  if (zoom >= 11) return 'neighborhood';
  if (zoom >= 6) return 'town';
  if (zoom < 3 && multiCountry) return 'country';
  return 'state';
}

export function placesIndex(areaList: Area[], rows: WalkArea[], walkList: Walk[]): PlacesIndex {
  const walks = new Map(walkList.filter(stopped).map((w) => [w.id, w]));
  const areas = new Map(areaList.map((a) => [a.key, a]));
  const live = rows.filter((r) => walks.has(r.walk_id) && areas.has(r.area_key));
  const byArea: PlacesIndex['byArea'] = new Map();
  for (const r of live) {
    const e = byArea.get(r.area_key) ?? { walkIds: new Set<string>(), metres: 0, lastT: 0 };
    e.walkIds.add(r.walk_id);
    e.metres += r.metres;
    e.lastT = Math.max(e.lastT, r.last_t);
    byArea.set(r.area_key, e);
  }
  // A walk in a town but in none of that town's neighborhoods is "elsewhere" in it, where it was walked.
  const elsewhere: PlacesIndex['elsewhere'] = new Map();
  const hoodParents = new Map<string, Set<string>>();
  for (const r of live) {
    const a = areas.get(r.area_key)!;
    if (a.level === 'neighborhood' && a.parent_key) {
      const set = hoodParents.get(r.walk_id) ?? new Set<string>();
      set.add(a.parent_key);
      hoodParents.set(r.walk_id, set);
    }
  }
  const sums = new Map<string, { lon: number; lat: number; n: number }>();
  for (const r of live) {
    const a = areas.get(r.area_key)!;
    if (a.level !== 'town' || hoodParents.get(r.walk_id)?.has(a.key)) continue;
    const e = elsewhere.get(a.key) ?? { walkIds: new Set<string>(), at: [0, 0] as LngLat, metres: 0, lastT: 0 };
    e.walkIds.add(r.walk_id);
    e.metres += r.metres;
    e.lastT = Math.max(e.lastT, r.last_t);
    const s = sums.get(a.key) ?? { lon: 0, lat: 0, n: 0 };
    s.lon += r.lon;
    s.lat += r.lat;
    s.n++;
    sums.set(a.key, s);
    e.at = [s.lon / s.n, s.lat / s.n];
    elsewhere.set(a.key, e);
  }
  const countries = new Set([...byArea.keys()].filter((k) => areas.get(k)!.level === 'country'));
  // The fit covers what is starred up close (neighborhoods and "elsewhere"):
  // a town's own point can lie kilometres from where it was walked. With
  // neither, it falls back to the towns, then the states.
  const pointsAt = (level: AreaLevel): LngLat[] =>
    [...byArea.keys()].map((k) => areas.get(k)!).filter((a) => a.level === level).map((a): LngLat => [a.lon, a.lat]);
  let points: LngLat[] = [...pointsAt('neighborhood'), ...[...elsewhere.values()].map((e) => e.at)];
  if (!points.length) points = pointsAt('town');
  if (!points.length) points = pointsAt('state');
  const bounds: Bounds | null = points.length
    ? [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1])), Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))]
    : null;
  return {
    areas, byArea, elsewhere, walks,
    walkCount: walks.size,
    placeCount: [...byArea.keys()].filter((k) => areas.get(k)!.level === 'neighborhood').length + elsewhere.size,
    multiCountry: countries.size > 1,
    bounds,
  };
}

/**
 * The stars at one level, merged when closer than PIN_GROUP_PX on screen at
 * this zoom. Every star is drawn the same size: a star marks "walked here",
 * not how much.
 */
export function starsFor(index: PlacesIndex, level: AreaLevel, zoom: number, lat: number): Star[] {
  const base: Star[] = [];
  for (const [key, e] of index.byArea) {
    const a = index.areas.get(key)!;
    if (a.level === level) base.push({ id: key, label: a.name, at: [a.lon, a.lat], walkIds: [...e.walkIds], count: 1, keys: [key] });
  }
  if (level === 'neighborhood') {
    for (const [town, e] of index.elsewhere) {
      const id = ELSEWHERE + town;
      base.push({ id, label: `Elsewhere in ${index.areas.get(town)!.name}`, at: e.at, walkIds: [...e.walkIds], count: 1, keys: [id] });
    }
  }
  // The busiest place leads its group; ties by name, so the grouping is stable.
  base.sort((x, y) => y.walkIds.length - x.walkIds.length || x.label.localeCompare(y.label));
  const radius = metersPerPixel(zoom, lat) * PIN_GROUP_PX;
  const stars: Star[] = [];
  for (const s of base) {
    let best: Star | null = null;
    let bestD = radius;
    for (const t of stars) {
      const d = distance(t.at, s.at);
      if (d <= bestD) {
        best = t;
        bestD = d;
      }
    }
    if (best) {
      best.count += 1;
      best.keys.push(...s.keys);
      best.walkIds = [...new Set([...best.walkIds, ...s.walkIds])];
    } else stars.push({ ...s, walkIds: [...s.walkIds], keys: [...s.keys] });
  }
  return stars;
}

function distance(a: LngLat, b: LngLat): number {
  const kx = 111_320 * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 110_540);
}

/** What the sheet shows for one place: its name, its parents, its walks newest first and the metres walked there. */
export function placeWalks(index: PlacesIndex, key: string): { title: string; subtitle: string; walks: Walk[]; metres: number } {
  const town = key.startsWith(ELSEWHERE) ? key.slice(ELSEWHERE.length) : null;
  const entry = town ? index.elsewhere.get(town) : index.byArea.get(key);
  const self = town ? null : index.areas.get(key);
  const title = town ? `Elsewhere in ${index.areas.get(town)?.name ?? ''}` : (self?.name ?? '');
  // Parents, nearest first, short of the country: "Montclair, New Jersey".
  const names: string[] = [];
  for (let p = town ? index.areas.get(town)?.parent_key ?? null : self?.parent_key ?? null; p; p = index.areas.get(p)?.parent_key ?? null) {
    const a = index.areas.get(p);
    if (!a || a.level === 'country') break;
    names.push(a.name);
  }
  const walks = [...(entry?.walkIds ?? [])].map((id) => index.walks.get(id)!).filter(Boolean).sort((x, y) => y.started_at - x.started_at);
  return { title, subtitle: names.join(', '), walks, metres: entry?.metres ?? 0 };
}

/** Stopped walks with no places yet (offline at stop, or from before v0.5). */
export function unplacedWalks(walks: Walk[], rows: WalkArea[]): Walk[] {
  const placed = new Set(rows.map((r) => r.walk_id));
  return walks.filter((w) => stopped(w) && !placed.has(w.id));
}

let running: Promise<{ placed: string[]; failed: string[] }> | null = null;

/**
 * Places walks one after another (criterion 25): one pass at a time, and a
 * second call while one runs joins it. A walk that fails is left for the
 * next pass; stopping midway (`stopped`) keeps what was already placed.
 */
export function placeAll(
  ids: string[],
  placeOne: (id: string) => Promise<void>,
  onProgress?: (done: number) => void,
  stopped?: () => boolean,
): Promise<{ placed: string[]; failed: string[] }> {
  if (running) return running;
  const pass = (async () => {
    const placed: string[] = [];
    const failed: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      try {
        await placeOne(ids[i]);
        placed.push(ids[i]);
      } catch {
        failed.push(ids[i]);
      }
      onProgress?.(i + 1);
      if (stopped?.()) break;
    }
    return { placed, failed };
  })();
  running = pass;
  pass.finally(() => {
    if (running === pass) running = null;
  }).catch(() => {});
  return pass;
}
