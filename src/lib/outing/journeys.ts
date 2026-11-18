// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { Leg } from '../walkPlanner/planner';
import type { Area } from './areas';
import { matches, type Candidate, type Want } from './candidates';
import { planStops, type LegCache, type Outing, type OutingReason } from './plan';

/*
 * The one machine (OJ17-OJ19, OJ22, OJ24, OJ42-OJ45; decision 0211): every outing is a journey of chapters over areas. Around where
 * you stand is one area; a reach or a destination gives several, and this file is not told which. A journey is made per leaning the
 * picked chips reach, in the leanings' given order, with a mixed one ahead when the chips span leanings; nothing ranks them, and two
 * that hold the same stops are one. In each area a chapter is a walk among two or three places, or one place standing alone. Places
 * not found yet are offered before the others. This file holds no word of a kind of place: leanings and chips are data it is handed.
 */
export interface AreaData {
  area: Area;
  /** Where a walk in this area starts: the town's point, or where you stand. */
  from: LngLat;
  cands: readonly Candidate[];
  leg: Leg;
}

export interface Chapter {
  area: Area;
  /** One stop, with no path, when a place stands alone. */
  outing: Outing;
}

export interface Journey {
  leaning: string;
  name: string;
  /** The picked chips this journey draws its stops from. */
  wants: Want[];
  chapters: Chapter[];
  footM: number;
}

export interface JourneysInput {
  areas: readonly AreaData[];
  origin: LngLat | null;
  picked: readonly Want[];
  leanings: readonly { id: string; name: string; chips: readonly string[] }[];
  mixed: { id: string; name: string };
  ceilingM: number;
  /** Toward a place the areas keep their order; around, each is the nearest to the one before. */
  toward: boolean;
  /** OJ45: per leaning, how many times "Another like this" was asked. */
  salts?: Readonly<Record<string, number>>;
}

/** How many places a chapter is fitted from, and so how far each "Another like this" moves on. */
export const POOL = 4;
/** Audit 62: how many places beyond the pool's size are tried for a street that reaches them. */
const REACH_TRIES = 4;

/** The places a chapter may use, in the order they are offered: by chip in turn, in each those new to you first, then the nearest. */
function ranked(cands: readonly Candidate[], wants: readonly Want[], from: LngLat, ceilingM: number): Candidate[] {
  const lists = wants.map((w) =>
    cands
      .filter((c) => matches(w.match, c) && distanceM(from, c.at) <= ceilingM)
      .map((c) => ({ c, d: Math.round(distanceM(from, c.at)) }))
      .sort((a, b) => Number(!!a.c.seen) - Number(!!b.c.seen) || a.d - b.d || a.c.at[1] - b.c.at[1] || a.c.at[0] - b.c.at[0] || (a.c.id < b.c.id ? -1 : 1))
      .map((x) => x.c),
  );
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) {
      const c = l[i];
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
  }
  return out;
}

const windowsOf = (n: number): number => Math.ceil(n / POOL);

/** How many different sets of places "Another like this" can draw on in this area for these chips. */
export const chapterWindows = (data: AreaData, wants: readonly Want[], ceilingM: number): number => windowsOf(ranked(data.cands, wants, data.from, ceilingM).length);

/** OJ17: no more than this many journeys are offered. */
export const MAX_JOURNEYS = 3;

/** OJ24: a walk among three, else two, of the offered places (a loop when one can be made, else one way), else the first alone. */
/** The shortest way through the stops from `from` as the crow flies, in any order: no walk by street is shorter. */
function straightM(from: LngLat, stops: readonly Candidate[]): number {
  const go = (at: LngLat, left: readonly Candidate[]): number =>
    left.length ? Math.min(...left.map((c, i) => distanceM(at, c.at) + go(c.at, left.filter((_, k) => k !== i)))) : 0;
  return go(from, stops);
}

/** The ways of taking `n` of the items, each in the items' order, the earliest items first. */
function subsets<T>(items: readonly T[], n: number): T[][] {
  if (n === 0) return [[]];
  if (items.length < n) return [];
  const [head, ...rest] = items;
  return [...subsets(rest, n - 1).map((s) => [head, ...s]), ...subsets(rest, n)];
}

export function planChapter(data: AreaData, wants: readonly Want[], ceilingM: number, salt = 0): Chapter | null {
  const all = ranked(data.cands, wants, data.from, ceilingM);
  // OJ45 (audit 11): an area with no other places keeps the ones it has, so "Another like this" never drops a town.
  const at = Math.min(salt, Math.max(0, windowsOf(all.length) - 1));
  const window = all.slice(at * POOL);
  if (!window.length) return null;
  // One cache of legs for the whole chapter: a pair of places is routed once, however many attempts hold it.
  const legs: LegCache = new Map();
  // Audit 62: a place no street reaches (inside a mall, on a campus) takes no room in the pool: it would spoil every walk it is
  // tried in, and a route that fails is the dearest to look for. A set number are looked at, so a town of them costs no more.
  const pool: Candidate[] = [];
  for (const c of window.slice(0, POOL + REACH_TRIES)) {
    if (pool.length >= POOL) break;
    if (planStops([c], data.from, 'oneway', Infinity, data.leg, legs)) pool.push(c);
  }
  // None can be walked to from the town's point: the first is still a stop, with no walk drawn, as before.
  if (!pool.length) return { area: data.area, outing: { stops: [window[0]], path: [window[0].at], lengthM: 0, loop: false } };
  // Audit 61: every way of taking three of the pool, then two, in the pool's own order (a loop before one way), as the single
  // outing's planner does: one far place at the front must not leave a town of bookshops a single stop.
  for (const n of [3, 2]) {
    for (const stops of subsets(pool, n)) {
      // A walk no shorter than the straight lines between its stops: when even those pass the ceiling, no street is asked.
      if (straightM(data.from, stops) > ceilingM) continue;
      const outing = planStops(stops, data.from, 'loop', ceilingM, data.leg, legs) ?? planStops(stops, data.from, 'oneway', ceilingM, data.leg, legs);
      if (outing) return { area: data.area, outing };
    }
  }
  return { area: data.area, outing: { stops: [pool[0]], path: [pool[0].at], lengthM: 0, loop: false } };
}

function inOrder(chapters: Chapter[], origin: LngLat | null, toward: boolean): Chapter[] {
  if (toward || !origin) return chapters;
  const left = [...chapters];
  const out: Chapter[] = [];
  let at = origin;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (distanceM(at, left[i].area.at) < distanceM(at, left[best].area.at)) best = i;
    const [next] = left.splice(best, 1);
    out.push(next);
    at = next.area.at;
  }
  return out;
}

const stopsKey = (cs: readonly Chapter[]) => cs.flatMap((c) => c.outing.stops.map((s) => s.id)).sort().join('|');

export function planJourneys(input: JourneysInput): { journeys: Journey[]; reasons: OutingReason[] } {
  if (!input.picked.length) return { journeys: [], reasons: [] };
  if (!input.origin) return { journeys: [], reasons: ['noPosition'] };
  const byId = (a: Want, b: Want) => (a.id < b.id ? -1 : 1);
  const rows = input.leanings.map((l) => ({ id: l.id, name: l.name, wants: input.picked.filter((w) => l.chips.includes(w.id)).sort(byId) })).filter((r) => r.wants.length);
  const leaningsOf = (cs: readonly Chapter[]) => new Set(cs.flatMap((c) => c.outing.stops.flatMap((s) => input.leanings.filter((l) => input.picked.some((w) => l.chips.includes(w.id) && matches(w.match, s))).map((l) => l.id))));
  // OJ43: chips that span leanings: one journey that draws on them all, ahead of the others.
  if (rows.length > 1) rows.unshift({ id: input.mixed.id, name: input.mixed.name, wants: [...input.picked].sort(byId) });
  const journeys: Journey[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (journeys.length >= MAX_JOURNEYS) break;
    const salt = input.salts?.[r.id] ?? 0;
    // OJ45: past the last other places of every area there is no other journey to offer.
    if (salt > 0 && salt >= Math.max(0, ...input.areas.map((a) => chapterWindows(a, r.wants, input.ceilingM)))) continue;
    const chapters = input.areas.map((a) => planChapter(a, r.wants, input.ceilingM, salt)).filter((c): c is Chapter => !!c);
    if (!chapters.length) continue;
    // A mixed journey whose stops all came from one leaning is that leaning's journey, and is left to it.
    if (r.id === input.mixed.id && leaningsOf(chapters).size < 2) continue;
    const key = stopsKey(chapters);
    if (seen.has(key)) continue;
    seen.add(key);
    const ordered = inOrder(chapters, input.origin, input.toward);
    journeys.push({ leaning: r.id, name: r.name, wants: r.wants, chapters: ordered, footM: ordered.reduce((m, c) => m + c.outing.lengthM, 0) });
  }
  return { journeys, reasons: journeys.length ? [] : ['few'] };
}
