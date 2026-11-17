// @layer core
import { distanceM, projector } from '../geo';
import type { LngLat } from '../types';

/*
 * Where an outing looks (OJ20, OJ37, OJ41, OJ42; decision 0199): a list of areas, each a point a chapter may be planned around. With
 * no destination they are where you stand and the towns within a reach; toward a place, the towns near the straight line to it, in
 * order, the place last. The planner is handed the list and does not know which it was. Towns are plain rows (the gazetteer's); a
 * town you have not been in is looked at before one you have. Pure geometry: nothing is read here.
 */
export interface TownRow {
  name: string;
  at: LngLat;
}

export interface Area {
  /** A town's name; null for where you stand. */
  name: string | null;
  at: LngLat;
  /** OJ42: a town not yet in any recorded outing. */
  isNew?: boolean;
}

export const AREA_RULES = {
  /** A town this close to one already taken is the same place: their reads would overlap. */
  sameM: 2000,
  /** Toward a place: how far off the straight line a town may lie, as a share of its length, and at least this. */
  corridorShare: 0.2,
  corridorMinM: 3000,
  corridorMaxM: 10_000,
  /** OJ37: how many areas one look reads; a bound on reading, never on what a journey may hold. */
  readMax: 8,
} as const;

const been = (t: TownRow, walked: readonly TownRow[]) => walked.some((w) => w.name === t.name && distanceM(w.at, t.at) <= 5000);

function distinct(sorted: { t: TownRow; d: number }[], taken: LngLat[]): { t: TownRow; d: number }[] {
  const out: { t: TownRow; d: number }[] = [];
  const held = [...taken];
  for (const x of sorted) {
    if (held.some((p) => distanceM(p, x.t.at) <= AREA_RULES.sameM)) continue;
    held.push(x.t.at);
    out.push(x);
  }
  return out;
}

const byNear = (a: { t: TownRow; d: number }, b: { t: TownRow; d: number }) => a.d - b.d || (a.t.name < b.t.name ? -1 : 1);

const newFirst = <T extends { isNew: boolean }>(xs: T[]): T[] => [...xs.filter((x) => x.isNew), ...xs.filter((x) => !x.isNew)];

/**
 * OJ41, OJ42: where you stand, then the towns within the reach. The nearest are the ones looked at (a town is never left out for
 * having been walked, audit 4); among them those new to you come first.
 */
export function areasAround(towns: Iterable<TownRow>, from: LngLat, reachM: number, walked: readonly TownRow[]): Area[] {
  const inside: { t: TownRow; d: number }[] = [];
  for (const t of towns) {
    const d = distanceM(from, t.at);
    if (d <= reachM) inside.push({ t, d: Math.round(d) });
  }
  const kept = distinct(inside.sort(byNear), [from]).slice(0, AREA_RULES.readMax - 1).map((x) => ({ ...x, isNew: !been(x.t, walked) }));
  return [{ name: null, at: from }, ...newFirst(kept).map((x) => ({ name: x.t.name, at: x.t.at, isNew: x.isNew }))];
}

/**
 * OJ20: the towns near the straight line from here to the place, in order along it, the place last; none behind you or beyond it.
 * When there are more than one look reads, they are taken spread along the way (one from each equal stretch of it, a town new to you
 * before one that is not), never the first few beside home (audit 3).
 */
export function areasToward(towns: Iterable<TownRow>, from: LngLat, to: TownRow, walked: readonly TownRow[]): Area[] {
  const proj = projector(from);
  const [tx, ty] = proj(to.at);
  const len = Math.hypot(tx, ty) || 1;
  const width = Math.max(AREA_RULES.corridorMinM, Math.min(AREA_RULES.corridorMaxM, AREA_RULES.corridorShare * len));
  const near: { t: TownRow; d: number }[] = [];
  for (const t of towns) {
    const [x, y] = proj(t.at);
    const along = (x * tx + y * ty) / len;
    const off = Math.abs(x * ty - y * tx) / len;
    if (along <= 0 || along >= len || off > width) continue;
    near.push({ t, d: Math.round(along) });
  }
  const kept = distinct(near.sort(byNear), [from, to.at]).map((x) => ({ ...x, isNew: !been(x.t, walked) }));
  const max = AREA_RULES.readMax - 1;
  let chosen = kept;
  if (kept.length > max) {
    const taken = new Set<number>();
    for (let b = 0; b < max; b++) {
      const lo = (len * b) / max;
      const hi = (len * (b + 1)) / max;
      const inBin = kept.map((x, i) => ({ x, i })).filter(({ x, i }) => !taken.has(i) && x.d >= lo && x.d < hi);
      const pick = inBin.find(({ x }) => x.isNew) ?? inBin[0];
      if (pick) taken.add(pick.i);
    }
    // A stretch with no town leaves its place to the nearest town not yet taken.
    for (let i = 0; taken.size < max && i < kept.length; i++) taken.add(i);
    chosen = kept.filter((_, i) => taken.has(i));
  }
  return [...chosen.map((x) => ({ name: x.t.name, at: x.t.at, isNew: x.isNew })), { name: to.name, at: to.at, isNew: !been(to, walked) }];
}

export const areaKey = (a: Pick<Area, 'at'>): string => `${a.at[0].toFixed(5)},${a.at[1].toFixed(5)}`;

/** OJ26: the look without the towns left out; where you stand and the destination's town are never left out. */
export function withoutAreas(areas: readonly Area[], left: ReadonlySet<string>, destKey: string | null): Area[] {
  return areas.filter((a) => a.name === null || areaKey(a) === destKey || !left.has(areaKey(a)));
}
