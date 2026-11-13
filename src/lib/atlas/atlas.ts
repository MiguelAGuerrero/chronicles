// @layer core
import { PRESENCE_CARRIED, PRESENCE_CODE, type PresenceClass } from '../presence/presence';
import { countsToward } from '../discovery/curation';
import { coveredBy, townAt, withOutlines, type OutlineSet } from '../areas/outlines';
import { AREA_REACH_M } from '../areas/rules';
import type { Area, PlaceCandidate, WalkArea } from '../areas/types';
import type { RoadFeature } from '../streets';
import { keepFindKeys, mergePlaces } from '../discovery/archiveMerge';
import { isKindHidden, refineRead } from '../discovery/refinements';
import { isMarkable } from '../discovery/noise';
import { barsOf } from '../discovery/bars';
import type { CategoryId, Kind, Place } from '../discovery/types';
import { boundsOf, distanceM, projector, type Bounds } from '../geo';
import { NAV } from '../nav/rules';
import type { LngLat } from '../types';
import { insideTown, isWard, townBorder } from './hoods';
import type { Pocket } from './pockets';

/*
 * Explore atlas (AT1-AT14), the pure part: which areas are near, how much of
 * each kind sits in an area's ring, what is still waiting there, and the
 * same-scale picture of the ring. Nothing here reads storage or the map; the
 * reader (`read.ts`) and the screen call in.
 */

/** Bumped by hand when what a ring read keeps, or how it is judged, changes (AT12). */
/** a2: activity density (AD14): graded streets in the sketch, from OSM and Overture. */
/** a3: town outlines (TO10): the tab lists again, so a town known only by its outline gets a tile. */
/** a4: atlas grading (AG1, AG3): the findable kinds count only what could be found; thin rings are marked. */
/** a5: towns graded across their whole outline, with pockets of activity (TP1-TP11); neighborhoods read as under a4. */
/** a6: wards inside a city are not towns (fix ward-subdivision); neighborhood rows stand as under a5. */
/** a7: the places archive's curiosities and landmarks count among the findable kinds (PW10); rows stand until an archive is known, then read again (profileStale). */
/** a8: presence by bars (PK1-PK7): a museum the data calls historic lights History too; community spaces join Culture. */
/** a9: a park whose name says a playground or the like, with nothing notable in it, is a community park (PC13); curation over presence's classes, so presence's own code is unchanged. */
/** a10: community parks reads a park's name as presence reads a museum's, past a neighbourhood's "Old Town", and "heritage" keeps no park (tend explore T9); none carried. */
/** a11: a neighborhood with a real shape is counted across it (neighborhood boundaries, HB11); towns stand as under a10. */
/** The atlas's own part of a row's code (a11). */
const ATLAS_OWN = 'a11';
/** A row's code: the atlas's own (a11) and presence's (PR6), so a reclassification re-reads every row. */
export const ATLAS_CODE = `${ATLAS_OWN}.${PRESENCE_CODE}`;

/**
 * TP10: the older rules a level's rows still stand under, because the change did not touch that level. None of a8's
 * (PK7: the bars changed at every level; PC13: community parks, at every level), nor of a9's (T9: park kinds, at every
 * level); the presence codes presence carries stand at every level under the atlas's own part (`PRESENCE_CARRIED`,
 * specs/presence-readers PS9: a9.p1 under a9.p2, now a10.p1 under a10.p2), so a bump of the atlas's own part carries none.
 */
const CARRIED_PRESENCE = PRESENCE_CARRIED.map((c) => `${ATLAS_OWN}.${c}`);
/** a10's codes, which a town's rows still stand under (a11 changed neighborhoods only). */
const A10_CODES = [PRESENCE_CODE, ...PRESENCE_CARRIED].map((c) => `a10.${c}`);
const CARRIED: Partial<Record<AtlasLevel, readonly string[]>> = { neighborhood: CARRIED_PRESENCE, town: [...CARRIED_PRESENCE, ...A10_CODES] };

export const ATLAS_RULES = {
  /** Every area is measured inside this ring around its point, whatever its level (AT4). */
  ringM: 800,
  /** A ring with fewer mapped places than this, of the eight kinds, says nothing about its kinds (AG3). */
  thinPlaces: 3,
  /** A ring measured without Overture while a release is known is tried again after this (activity-density audit 10). */
  overtureRetryMs: 30 * 60_000,
  /** Neighborhoods are listed within this of you (AT1), towns within the other (AT14). */
  nearNeighborhoodM: 2500,
  nearTownM: 12_000,
  /** At most this many tiles per level. */
  cap: 12,
  /** A town's own neighborhoods are looked for within its reach, capped here (AT2), at most townCap of them. */
  townNeighborhoodsM: 5000,
  townCap: 24,
  /** A new near read once you are this far from the last one, under the same build. */
  renearM: 1000,
  /** A failed read waits this long before it is tried again (AT5). */
  retryMs: 120_000,
  /** Walking pace, and how much longer streets are than a straight line. */
  metresPerMin: 80,
  detour: 1.25,
  /** Areas listed next door on a card. */
  nextDoor: 4,
} as const;

export type AtlasLevel = 'neighborhood' | 'town';
export type Step = 0 | 1 | 2 | 3;
export type Steps = Record<CategoryId, Step>;

/** The kinds in one fixed order on every tile (AT3), so tiles compare at a glance. */
export const ATLAS_ORDER: readonly CategoryId[] = ['history', 'art', 'culture', 'parks', 'viewpoints', 'food', 'shops', 'nightlife'];
export const ATLAS_LABEL: Record<CategoryId, string> = {
  history: 'History', art: 'Art', culture: 'Culture', parks: 'Green', viewpoints: 'Views', food: 'Food', shops: 'Shops', nightlife: 'Nightlife',
};
export const STEP_WORDS = ['none', 'some', 'plenty', 'lots'] as const;

/**
 * Fixed steps per kind (AT4): places inside the ring for one, two and three
 * bars. Each about three times the last, because density spans orders of
 * magnitude; rarer kinds have lower steps. Never relative to the neighbors.
 */
export const STEPS: Record<CategoryId, readonly [number, number, number]> = {
  history: [1, 4, 12],
  art: [1, 4, 12],
  culture: [1, 3, 8],
  parks: [1, 3, 6],
  viewpoints: [1, 2, 5],
  food: [4, 15, 50],
  shops: [4, 15, 50],
  nightlife: [2, 6, 20],
};

/** A place as the atlas counts it. */
export interface AtlasPlace {
  key: string;
  category: CategoryId;
  at: LngLat;
  /** Whether it could be a "?" mark (`isMarkable`); a findable kind counts only these (AG1). */
  markable?: boolean;
  name?: string;
  kind?: Kind;
  /** What `barsOf` reads to light a second bar (PK1, PS2): presence's classes; absent, a place lights its category alone. */
  classes?: PresenceClass[];
}

/** A place that could be found (a mark's place): never named on the tab (AT7). */
export interface AtlasMark extends AtlasPlace {
  kind?: Kind;
}

/** The same-scale picture of a ring (AT6), in a 200 x 150 frame with the ring's point at its middle. */
export interface Sketch {
  streets: { id: string; pts: number[] }[];
  /** Graded stretches (AD14): faint, medium and strong. */
  grades: [number[][], number[][], number[][]];
  parks: number[];
}

/** What a full ring read leaves (cache). */
export interface AtlasProfile {
  steps: Steps;
  /** Busy streets, busiest first. */
  strips: string[];
  /** The busiest strip's peak, where Walk to goes (AT8). */
  stripAt: LngLat | null;
  marks: AtlasMark[];
  sketch: Sketch;
  /** The Overture release its density came from; null when measured from OpenStreetMap alone (AD6, AD7). */
  overture: string | null;
  /** The places archive version its findable kinds counted; null or missing without one (PW10). */
  archive?: string | null;
  /** The map knows almost nothing here: the kinds say nothing (AG3). */
  thin?: boolean;
  /** TP1: what the bars were counted across: the town's whole outline, a neighborhood's own shape (HB11), or the 800 m ring around its point (absent: the ring). */
  extent?: 'outline' | 'ring' | 'shape';
  /** TP3: the outline needed more tiles than a read takes, so this covers part of the town. */
  partial?: boolean;
  /** TP4: the town's pockets of activity, busiest first. */
  pockets?: Pocket[];
  /** TP12: the town's outline could not be read, so this is the ring for now: read again after the retry wait. */
  outlineRetry?: boolean;
  /** TP2: where the picture is drawn around: the busiest pocket for a graded town (absent: the area's point). */
  sketchAt?: LngLat;
}

/** Cache (AT12): one area the atlas listed, and once its ring is read, its profile. */
export interface AtlasArea {
  key: string;
  level: AtlasLevel;
  name: string;
  at: LngLat;
  /** How far from its point you are still in it. */
  reachM: number;
  build: string;
  code: string;
  listed_at: number;
  read_at: number | null;
  failed_at: number | null;
  profile: AtlasProfile | null;
}

export const atlasKey = (a: { level: string; name: string; at: LngLat }) =>
  JSON.stringify([a.level, a.name.normalize('NFC').trim().toLowerCase(), a.at[0].toFixed(3), a.at[1].toFixed(3)]);

/** Whether a row was made under this build and these rules (AT12); a row with no level stands only under the current code (presence-readers audit 11). */
export const rowCurrent = (r: { build: string; code: string; level?: AtlasLevel }, build: string | null) =>
  !!build && r.build === build && (r.level != null ? codeCurrent(r.code, r.level) : r.code === ATLAS_CODE);

/**
 * Whether rows or reads made under this code stand (presence-readers audit 4): the current code, or one carried for the
 * level; a near read, which names no level, stands when every level carries its code. Rows and near reads judge alike.
 */
export function codeCurrent(code: string, level?: AtlasLevel | null): boolean {
  if (code === ATLAS_CODE) return true;
  if (level != null) return !!CARRIED[level]?.includes(code);
  return (['neighborhood', 'town'] as const).every((l) => !!CARRIED[l]?.includes(code));
}

const SAME_M = { neighborhood: 1000, town: 3000 } as const;
const sameArea = (a: { level: AtlasLevel; name: string; at: LngLat }, b: { level: AtlasLevel; name: string; at: LngLat }) =>
  a.level === b.level && a.name === b.name && distanceM(a.at, b.at) <= SAME_M[a.level];

/** Whether a spot is inside what an area is counted across: the 800 m ring around its point, or (TP1) a given extent. */
export type Within = (at: LngLat) => boolean;
const ringWithin = (centre: LngLat): Within => (at) => distanceM(at, centre) <= ATLAS_RULES.ringM;

/** The places inside the ring (or the extent), once each. */
function inRing<T extends AtlasPlace>(places: T[], centre: LngLat, within: Within = ringWithin(centre)): T[] {
  const seen = new Set<string>();
  return places.filter((p) => !seen.has(p.key) && within(p.at) && !!seen.add(p.key));
}

/**
 * AT4: the bars of each kind from the places inside the ring, against the fixed steps.
 * AG1: the five findable kinds count only places that could be found (a plain parish
 * church counts toward nothing); food, shops and nightlife count every place.
 */
export function presenceSteps(places: AtlasPlace[], centre: LngLat, within: Within = ringWithin(centre)): Steps {
  const seen = new Set<string>();
  const counts = Object.fromEntries(ATLAS_ORDER.map((c) => [c, 0])) as Record<CategoryId, number>;
  for (const p of places) {
    if (!countsToward(p)) continue;
    if (seen.has(p.key) || !within(p.at)) continue;
    seen.add(p.key);
    // PK1-PK4: a place lights each of its bars once (a museum the data calls historic, History and Culture).
    for (const bar of barsOf(p)) counts[bar] += 1;
  }
  return Object.fromEntries(ATLAS_ORDER.map((c) => [c, STEPS[c].filter((s) => counts[c] >= s).length as Step])) as Steps;
}

/** AG3: the map knows almost nothing about this ring: fewer than `thinPlaces` places of the eight kinds, ordinary ones included. */
export const thinRing = (places: AtlasPlace[], centre: LngLat, within: Within = ringWithin(centre)): boolean =>
  inRing(places, centre, within).length < ATLAS_RULES.thinPlaces;

/** New rows for the candidates no current row already stands for. */
export function newRows(
  existing: AtlasArea[],
  candidates: { level: string; name: string; at: LngLat; reachM: number }[],
  build: string,
  now: number,
): AtlasArea[] {
  const out: AtlasArea[] = [];
  const have = existing.filter((r) => rowCurrent(r, build));
  for (const c of candidates) {
    if (c.level !== 'neighborhood' && c.level !== 'town') continue;
    const a = { level: c.level as AtlasLevel, name: c.name, at: c.at };
    if ([...have, ...out].some((r) => sameArea(r, a))) continue;
    out.push({ key: atlasKey(a), ...a, reachM: c.reachM, build, code: ATLAS_CODE, listed_at: now, read_at: null, failed_at: null, profile: null });
  }
  return out;
}

export interface Listed {
  area: AtlasArea;
  distanceM: number;
  /** You are in it (AT1): the nearest area of its level, within its reach. */
  here: boolean;
  /** FL12: a looked page with no fresh fix of yours says no distance. */
  unplaced?: boolean;
}

/**
 * AT1, AT14: the current areas of a level near you, nearest first, the one you are in leading.
 * With town outlines kept around you (TO10), the town you are in is the one whose outline
 * holds you (`townOf`), or none while its row isn't listed yet; never the nearest point instead.
 */
export function nearList(rows: AtlasArea[], from: LngLat, level: AtlasLevel, build: string | null, outlines: OutlineSet | null = null): Listed[] {
  const within = level === 'neighborhood' ? ATLAS_RULES.nearNeighborhoodM : ATLAS_RULES.nearTownM;
  const list: Listed[] = [];
  for (const area of rows) {
    if (area.level !== level || !rowCurrent(area, build) || (level === 'neighborhood' && isWard(area.name))) continue;
    const d = distanceM(area.at, from);
    if (d > within || list.some((l) => sameArea(l.area, area))) continue;
    list.push({ area, distanceM: d, here: false });
  }
  list.sort((a, b) => a.distanceM - b.distanceM);
  if (level === 'town' && coveredBy(outlines, from)) {
    const mine = townOf({ at: from }, list.map((l) => l.area), outlines);
    const i = mine ? list.findIndex((l) => l.area === mine) : -1;
    if (i < 0) return list.slice(0, ATLAS_RULES.cap);
    const [here] = list.splice(i, 1);
    return [{ ...here, here: true }, ...list].slice(0, ATLAS_RULES.cap);
  }
  const out = list.slice(0, ATLAS_RULES.cap);
  if (out[0] && out[0].distanceM <= Math.min(out[0].area.reachM, level === 'neighborhood' ? AREA_REACH_M.neighborhood : AREA_REACH_M.city)) out[0].here = true;
  return out;
}

/** AT5: the next ring to read, nearest first, skipping one that failed less than the retry wait ago. */
/** When a ring read with another Overture release, or without one, is due to be read again (AD6, AD7); null when it isn't stale. */
export function rereadAt(a: AtlasArea, release: string | null, archive: string | null = null): number | null {
  if (!a.profile) return null;
  const read = a.read_at ?? 0;
  // TP12: a town's ring read for want of its outline is asked again once the retry wait is over.
  const due: number[] = a.profile.outlineRetry ? [read + ATLAS_RULES.retryMs] : [];
  if (profileStale(a.profile, release)) due.push(read + (a.profile.overture == null ? ATLAS_RULES.overtureRetryMs : ATLAS_RULES.retryMs));
  // PW10: the places archive, as Overture: 30 min after one is known for a ring measured without it.
  if (archiveStaleProfile(a.profile, archive)) due.push(read + (a.profile.archive == null ? ATLAS_RULES.overtureRetryMs : ATLAS_RULES.retryMs));
  return due.length ? Math.min(...due) : null;
}

const archiveStaleProfile = (p: AtlasProfile, archive: string | null) => archive != null && (p.archive ?? null) !== archive;

/** AD6, activity-density audit 13: a ring measured with another release, or without Overture while one is known. */
export const profileStale = (p: AtlasProfile, release: string | null, archive: string | null = null) =>
  (release != null && (p.overture ?? null) !== release) || archiveStaleProfile(p, archive);

/** A read without Overture never replaces a profile measured with it (activity-density audit 6). */
export const keptProfile = (old: AtlasProfile | null, fresh: AtlasProfile): AtlasProfile =>
  (old?.overture != null && fresh.overture == null) || (old?.archive != null && fresh.archive == null) ? old! : fresh;

export function readQueue(list: Listed[], now: number, release: string | null = null, archiveAt: (at: LngLat) => string | null = () => null): AtlasArea | null {
  for (const l of list) {
    const a = l.area;
    if (a.profile) {
      const due = rereadAt(a, release, archiveAt(a.at));
      if (due == null || now < due) continue;
    }
    if (a.failed_at != null && now - a.failed_at < ATLAS_RULES.retryMs) continue;
    return a;
  }
  return null;
}

/** Where a near read of a level happened, and how far around it reached. */
export interface NearRead {
  at: LngLat;
  build: string;
  code: string;
  /** Missing on reads made before the hierarchy: the level's own reach. */
  radiusM?: number;
  /** WT9: the town whose page this read listed (its key); missing on reads around you and on those by reach alone. */
  town?: string;
  /** FL15: made for a look (Show areas here), never for the page around you. */
  look?: boolean;
}

/** Near reads kept per level, newest first, so going into a town and back reads nothing twice. */
export const NEAR_KEPT = 12;

/**
 * Whether to list a level's areas around a spot again (AT1, AT12, AT2): no read of this
 * build and these rules within 1 km of it reached as far.
 */
export function needsNear(reads: NearRead[] | NearRead | null, at: LngLat, build: string, radiusM?: number, town?: string | null): boolean {
  const list = !reads ? [] : Array.isArray(reads) ? reads : [reads];
  // WT9: a town's page asks for a read of that town (across its border, or by its reach where it has none).
  if (town) return !list.some((r) => r.build === build && codeCurrent(r.code) && r.town === town);
  // Whole-towns audit 8: a town's read wrote only what is inside its border; it never stands for the read around you.
  return !list.some((r) => !r.town && r.build === build && codeCurrent(r.code) && distanceM(r.at, at) <= ATLAS_RULES.renearM && (radiusM == null || (r.radiusM ?? radiusM) >= radiusM));
}

/** FL15: reads made for looks kept apart from the reads around you, so looking about never pushes them out. */
export const LOOK_KEPT = 6;

/** The kept near reads after a new one: newest first, at most NEAR_KEPT. */
export function withNear(reads: NearRead[], read: NearRead): NearRead[] {
  // Whole-towns audit 13: towns' reads are kept apart from the reads around you, NEAR_KEPT of each, so moving about
  // never pushes out a town's whole-border listing. Free look audit 1: so are the reads of looks (LOOK_KEPT).
  const all = [read, ...reads];
  const towns = new Set(all.filter((r) => r.town).slice(0, NEAR_KEPT));
  const looks = new Set(all.filter((r) => !r.town && r.look).slice(0, LOOK_KEPT));
  const near = new Set(all.filter((r) => !r.town && !r.look).slice(0, NEAR_KEPT));
  return all.filter((r) => towns.has(r) || near.has(r) || looks.has(r));
}

/**
 * AT2: the town or city an area belongs to: the one whose outline holds it,
 * where outlines are kept (TO10); else the nearest, closer for its size,
 * within its reach. Null when none reaches it, or when the outline holding it
 * is a town not listed.
 */
export function townOf(area: { at: LngLat }, towns: AtlasArea[], outlines: OutlineSet | null = null): AtlasArea | null {
  const cands: PlaceCandidate[] = towns.map((t) => ({ level: 'town', name: t.name, at: t.at, reachM: t.reachM }));
  // withOutlines keeps each row's place in the list and adds outline-only towns after them.
  const merged = withOutlines(cands, outlines);
  const pick = townAt(area.at, merged, outlines);
  const i = pick ? merged.indexOf(pick.c) : -1;
  return i >= 0 && i < towns.length ? towns[i] : null;
}

/** What a visit to a page has framed (AT9, TB11): its page and build, and the towns whose whole border it framed. */
export type PageFramed = { page: string; build: string | null; towns: string[] };

/**
 * What a visit to a page of the atlas frames next (AT9, TB11; fix explore-fit-area, Nov 4): its
 * areas (and you, near you) padded by `padM` while its town's border is unknown (150 m near you, a
 * town's reach on its page, where its own point may be all that is listed), then the whole town
 * once the border is known (yours near you, or the open town's). Within a visit nothing else
 * refits: areas listed after the border, a border briefly unknown (the tab blurred), you moving, a
 * Locate or a pan, or coming back into a town it already framed. A new page, a new build or
 * another town frames again; so does a town selected in the row (`townPicked`, fix town-fit). `last` is null at the start of a visit. Two separate frames once
 * raced, and the areas' won.
 */
export function nextFrame(
  last: PageFramed | null,
  p: { page: string; build: string | null; town: { id: string; bounds: Bounds } | null; points: LngLat[]; from: LngLat | null; padM: number },
): { framed: PageFramed; bounds: Bounds } | null {
  const same = !!last && last.page === p.page && last.build === p.build;
  if (p.town) {
    if (same && last.towns.includes(p.town.id)) return null;
    return { framed: { page: p.page, build: p.build, towns: [...(same ? last.towns : []), p.town.id] }, bounds: p.town.bounds };
  }
  if (same || !p.points.length) return null;
  const box = boundsOf(p.page === 'near' && p.from ? [p.from, ...p.points] : p.points, p.padM);
  return box ? { framed: { page: p.page, build: p.build, towns: [] }, bounds: box } : null;
}

/**
 * A town selected in the row, by a swipe or a key (fix town-fit, the owner, Nov 13): its whole border when known, else
 * its reach around its point and its border once known (`nextFrame`). Every selection frames again: `nextFrame`'s
 * once-a-visit rule kept a town selected a second time at the zoom the last one left, its own frame being the same
 * reach for every town. The visit's record gains the town, never loses one, so a town framed in it still isn't framed
 * again unasked (Locate back into yours, audit 1).
 */
export function townPicked(
  last: PageFramed | null,
  p: { page: string; build: string | null; town: { id: string; bounds: Bounds } | null; at: LngLat; padM: number },
): { framed: PageFramed; bounds: Bounds } {
  const kept = last && last.page === p.page && last.build === p.build ? last.towns : [];
  const towns = p.town && !kept.includes(p.town.id) ? [...kept, p.town.id] : kept;
  return { framed: { page: p.page, build: p.build, towns }, bounds: p.town?.bounds ?? boundsOf([p.at], p.padM)! };
}

/** How far around a town's point its neighborhoods are looked for. */
export const townReachM = (town: AtlasArea) => Math.min(town.reachM, ATLAS_RULES.townNeighborhoodsM);

/**
 * AT2: a town's own neighborhoods, nearest you first: within its reach (capped),
 * and belonging to it rather than to a town beside it.
 */
export function townNeighborhoods(
  rows: AtlasArea[], town: AtlasArea, towns: AtlasArea[], from: LngLat, build: string | null, outlines: OutlineSet | null = null,
  /** WT1: whole outlines around the town (the z10 read the borders use); with the town's own among them, its page is its border. */
  border: OutlineSet | null = null,
): Listed[] {
  const reach = townReachM(town);
  const whole = townBorder(town, border);
  const list: Listed[] = [];
  for (const area of rows) {
    if (area.level !== 'neighborhood' || !rowCurrent(area, build) || isWard(area.name) || list.some((l) => sameArea(l.area, area))) continue;
    if (whole) {
      // WT1, WT2: every neighborhood inside the border that no smaller town inside it owns, however far or many.
      if (!insideTown(area.at, whole, border)) continue;
    } else {
      // WT3: no border: within the town's reach, and not the town beside it's.
      if (distanceM(area.at, town.at) > reach) continue;
      const owner = townOf(area, towns, outlines);
      if (owner && !sameArea(owner, town)) continue;
    }
    list.push({ area, distanceM: distanceM(area.at, from), here: false });
  }
  list.sort((a, b) => a.distanceM - b.distanceM);
  const out = whole ? list : list.slice(0, ATLAS_RULES.townCap);
  if (out[0] && out[0].distanceM <= AREA_REACH_M.neighborhood) out[0].here = true;
  return out;
}

const NOUN: Record<CategoryId, string> = {
  history: 'history', art: 'art', culture: 'culture', parks: 'green space', viewpoints: 'views', food: 'food', shops: 'shops', nightlife: 'nightlife',
};

/**
 * AT16: an area's character in a few words, from its bars: what it has most of.
 * Never a count or a rank: "Lots of history and food", "Plenty of green space",
 * "A little of everything", "Quiet".
 */
export function characterLine(steps: Steps, thin = false): string {
  // AG3: where the map knows almost nothing, say nothing rather than "not much".
  if (thin) return '';
  const top = Math.max(...ATLAS_ORDER.map((c) => steps[c]));
  // Never "Quiet": that is the walk mode's name on Navigate (atlas round 3).
  if (top === 0) return 'Not much on the map here';
  const kinds = ATLAS_ORDER.filter((c) => steps[c] === top);
  if (top === 1) return kinds.length >= 5 ? 'A little of everything' : `A little ${NOUN[kinds[0]]}`;
  const named = kinds.slice(0, 2).map((c) => NOUN[c]);
  return `${top === 3 ? 'Lots' : 'Plenty'} of ${named.join(' and ')}`;
}

/** AT3: how far, as a walking time, or a distance once it is over an hour. */
export function distanceWords(m: number, here: boolean, fmt: (m: number) => string): string {
  if (here) return 'You’re here';
  const min = Math.max(1, Math.round((m * ATLAS_RULES.detour) / ATLAS_RULES.metresPerMin));
  return min < 60 ? `${min} min walk` : `${fmt(m)} away`;
}

/** The walks that went through an area, and when last. */
export interface Familiarity {
  walks: number;
  last: number | null;
}

/** AT3: how many walks went through the area, from the home's placed walks (the same area: level, name, within reach). */
export function familiarity(area: { level: AtlasLevel; name: string; at: LngLat }, areas: Area[], walkAreas: WalkArea[]): Familiarity {
  const keys = new Set(areas.filter((a) => a.level === area.level && a.name === area.name && distanceM([a.lon, a.lat], area.at) <= SAME_M[area.level]).map((a) => a.key));
  const walks = new Map<string, number>();
  for (const w of walkAreas) if (keys.has(w.area_key)) walks.set(w.walk_id, Math.max(walks.get(w.walk_id) ?? 0, w.last_t));
  return { walks: walks.size, last: walks.size ? Math.max(...walks.values()) : null };
}

/** "New to you", "Walked once", "Walked 3 times": the only progress there is. */
export function familiarityWords(f: Familiarity): string {
  if (!f.walks) return 'New to you';
  return f.walks === 1 ? 'Walked once' : `Walked ${f.walks} times`;
}

/** AT7, AT10: the kinds still waiting in the ring, in the tiles' order, never their names; kinds switched off are left out. */
export function waitingKinds(marks: AtlasMark[], found: Set<string>, hidden: Set<Kind> = new Set()): CategoryId[] {
  const kinds = new Set<CategoryId>();
  for (const m of marks) if (!found.has(m.key) && !isKindHidden(hidden, m.kind)) kinds.add(m.category);
  return ATLAS_ORDER.filter((c) => kinds.has(c));
}

/** The finds inside an area's ring, by name, once each. */
export function findsIn<T extends { key: string; name: string; at: LngLat; category: CategoryId }>(finds: T[], centre: LngLat): T[] {
  const seen = new Set<string>();
  return finds.filter((f) => distanceM(f.at, centre) <= ATLAS_RULES.ringM && !seen.has(f.key) && !!seen.add(f.key));
}

/** The sketch frame: 200 x 150, the ring's point at the middle, the ring this many units across its radius (AT6). */
export const SKETCH = { w: 200, h: 150, ringR: 64 } as const;

/** Lon/lat to the sketch frame of an area (AT6): the same scale for every area. */
export function toSketch(centre: LngLat): (p: LngLat) => [number, number] {
  const xy = projector(centre);
  const k = SKETCH.ringR / ATLAS_RULES.ringM;
  return (p) => {
    const [x, y] = xy(p);
    return [Math.round(SKETCH.w / 2 + x * k), Math.round(SKETCH.h / 2 - y * k)];
  };
}

const inFrame = (x: number, y: number, pad = 10) => x >= -pad && x <= SKETCH.w + pad && y >= -pad && y <= SKETCH.h + pad;

function flat(line: LngLat[], to: (p: LngLat) => [number, number]): number[] | null {
  const pts: number[] = [];
  let any = false;
  for (const p of line) {
    const [x, y] = to(p);
    if (pts.length && pts[pts.length - 2] === x && pts[pts.length - 1] === y) continue;
    pts.push(x, y);
    if (inFrame(x, y)) any = true;
  }
  return any && pts.length >= 4 ? pts : null;
}

/** At most this many street lines in a sketch, so a dense downtown stays small. */
const SKETCH_LINES = 900;

/** AT6, AD14: the ring's picture from what one read found: streets with their ids (to show the walked ones), graded streets, parks. */
export function sketchOf(o: { centre: LngLat; segments: { id: string; geometry: LngLat[][] }[]; graded: { lines: LngLat[][]; grade: 1 | 2 | 3 }[]; parks: LngLat[] }): Sketch {
  const to = toSketch(o.centre);
  const all: { id: string; pts: number[]; d: number }[] = [];
  for (const s of o.segments) {
    for (const line of s.geometry) {
      const pts = flat(line, to);
      if (!pts) continue;
      let d = Infinity;
      for (let i = 0; i < pts.length; i += 2) d = Math.min(d, Math.hypot(pts[i] - SKETCH.w / 2, pts[i + 1] - SKETCH.h / 2));
      all.push({ id: s.id, pts, d });
    }
  }
  // Past the cap, the lines nearest the point are kept (explore-atlas audit 5): a dense downtown's middle never drops out.
  const kept = all.length > SKETCH_LINES ? [...all].sort((a, b) => a.d - b.d).slice(0, SKETCH_LINES) : all;
  const streets: Sketch['streets'] = kept.map(({ id, pts }) => ({ id, pts }));
  const grades: Sketch['grades'] = [[], [], []];
  for (const g of o.graded) for (const l of g.lines) {
    const pts = flat(l, to);
    if (pts) grades[g.grade - 1].push(pts);
  }
  const parks = o.parks.flatMap((p) => {
    const [x, y] = to(p);
    return inFrame(x, y, 0) ? [x, y] : [];
  });
  return { streets, grades, parks };
}

const path = (pts: number[]) => {
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
  return d;
};

/** SVG paths for a sketch: the streets, the ones you walked (AT6), one path per grade (AD14). */
export function sketchPaths(s: Sketch, walked: Set<string>): { streets: string; walked: string; grades: [string, string, string] } {
  let streets = '';
  let mine = '';
  for (const l of s.streets) {
    if (walked.has(l.id)) mine += path(l.pts);
    else streets += path(l.pts);
  }
  const g = (s.grades ?? [[], [], []]).map((lines) => lines.map(path).join('')) as [string, string, string];
  return { streets, walked: mine, grades: g };
}

/** AT8: the other areas of its level nearest to this one, with the distance from it. */
export function nextDoor(area: AtlasArea, rows: AtlasArea[], build: string | null): { area: AtlasArea; distanceM: number }[] {
  return rows
    .filter((r) => r.level === area.level && rowCurrent(r, build) && !sameArea(r, area))
    .map((r) => ({ area: r, distanceM: distanceM(r.at, area.at) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .filter((r, i, all) => all.findIndex((o) => sameArea(o.area, r.area)) === i)
    .slice(0, ATLAS_RULES.nextDoor);
}

/**
 * AT8: Walk to an area: it is named for the area, and starts you at its busiest
 * street (`via`) when it has one, else at its point (atlas round 3).
 */
export function walkTarget(area: AtlasArea): { at: LngLat; label: string; via: string | null } {
  const p = area.profile;
  return p?.stripAt && p.strips[0] ? { at: p.stripAt, label: area.name, via: p.strips[0] } : { at: area.at, label: area.name, via: null };
}

/** Atlas round 3: the town you're in is the page's title, so it isn't listed again among the other towns. */
export const otherTowns = (towns: Listed[]): Listed[] => towns.filter((l) => !l.here);

/** A point on Explore's small map: named, or a dot alone when `name` is null. */
export interface AreaPin {
  id: string;
  at: LngLat;
  name: string | null;
  selected: boolean;
}

/**
 * The map's area points, of one level only (fix map-levels): the selected area's, else neighborhoods.
 * A town's point among its neighborhoods, or a neighborhood among towns, drew names over each other.
 * Only the selected area is named (fix pins-selected-only); every other point of the level is a dot.
 * On a town's own page (`inTown`) the level is always neighborhoods, even with the town's tile selected
 * (audit 1), and a town with none listed draws its own point (audit 2).
 */
export function areaPins(listed: Listed[], selected: string | null, inTown: boolean): AreaPin[] {
  const level: AtlasLevel = inTown ? 'neighborhood' : listed.find((l) => l.area.key === selected)?.area.level ?? 'neighborhood';
  const found = listed.filter((l) => l.area.level === level);
  const same = inTown && found.length === 0 ? listed.slice(0, 1) : found;
  return same.map((l) => ({ id: l.area.key, at: l.area.at, name: l.area.key === selected ? l.area.name : null, selected: l.area.key === selected }));
}

/**
 * How the marks work, in words (atlas round 3, AG4): presence, never a count of
 * places, the same everywhere, and what each kind counts.
 */
export const MARKS_EXPLAINED: readonly string[] = [
  'Marks say how much of each kind is around an area, never how good it is.',
  'History, art, culture, green and views count only places worth finding, the ones that can turn up as a “?”; one place can count toward two, as some museums count toward history and culture. Food, shops and nightlife count every place.',
  'One mark: a place or two of the kind. Two: a handful. Three: a street’s worth.',
  'Every area is judged the same way, within about a ten-minute walk of its point, so the same marks mean the same anywhere.',
];

/** The line a town counted across its whole outline says in place of the ring's (TP8). */
const WHOLE_TOWN_LINE = 'A town is counted across its whole outline, and a neighborhood within about a ten-minute walk of its point, so the same marks mean the same anywhere. Where a town is busiest is listed apart.';

/** HB11: the line a neighborhood counted across its own shape says in place of the ring's. */
const SHAPE_LINE = 'A neighborhood is counted across the ground drawn around it where the map has one, and within about a ten-minute walk of its point where it has not.';

/** TP8: how the marks work for an area: a graded town says it is counted across its outline (no digits, AT11). */
export const marksExplained = (p: Pick<AtlasProfile, 'extent'> | null | undefined): readonly string[] =>
  p?.extent === 'outline' ? [...MARKS_EXPLAINED.slice(0, -1), WHOLE_TOWN_LINE] : p?.extent === 'shape' ? [...MARKS_EXPLAINED.slice(0, -1), SHAPE_LINE] : MARKS_EXPLAINED;

/** TP8: the card's heading over the kinds: a town counted across its outline is no longer "around its centre". */
export const kindsHeading = (level: AtlasLevel, p: Pick<AtlasProfile, 'extent'> | null | undefined): string =>
  level === 'town' && p?.extent !== 'outline' ? 'What’s here · around its centre' : 'What’s here';

/** TP7: the busy areas of a town, busiest first, each a street with where Walk to goes; a pocket no street runs through is not listed (the owner, Nov 4: a busy area is a street, never a place); two pockets on one street list it once, at the busier; none for a neighborhood or a ring-graded town. */
export const busyAreas = (a: AtlasArea): { label: string; at: LngLat }[] =>
  a.level === 'town' && a.profile?.extent === 'outline'
    ? (a.profile.pockets ?? []).flatMap((p, i, all) => (p.name && all.findIndex((q) => q.name === p.name) === i ? [{ label: p.name, at: p.at }] : []))
    : [];

/** AT13: one sentence a screen reader says for a tile; how far and the walked count are its only numbers (AT11). */
export function tileLabel(l: Listed, fam: Familiarity, fmt: (m: number) => string): string {
  const a = l.area;
  const head = l.unplaced ? `${a.name}. ${familiarityWords(fam)}.` : `${a.name}. ${distanceWords(l.distanceM, l.here, fmt)}. ${familiarityWords(fam)}.`;
  if (!a.profile) return `${head} Being read.`;
  if (a.profile.thin) return head;
  const part = a.profile.partial ? ' Covers part of the town.' : '';
  const kinds = ATLAS_ORDER.filter((c) => a.profile!.steps[c]).map((c) => `${ATLAS_LABEL[c]}: ${STEP_WORDS[a.profile!.steps[c]]}`);
  return [head, kinds.length ? `${kinds.join(', ')}.` : 'Quiet: little of any kind.', a.profile.strips[0] ? `Busy along ${a.profile.strips[0]}.` : '', part.trim()]
    .filter(Boolean).join(' ');
}

/** AT6, AT7: one "?" per kind waiting in the ring, at its place nearest the area's point; never named. */
export function waitingMarks(marks: AtlasMark[], found: Set<string>, centre: LngLat, hidden: Set<Kind> = new Set(), o: { all?: boolean } = {}): AtlasMark[] {
  // WT7: every one still to find (the map, split into "?" and dots), else the nearest of each kind (the card).
  if (o.all) return marks.filter((m) => !found.has(m.key) && !isKindHidden(hidden, m.kind));
  const best = new Map<CategoryId, { m: AtlasMark; d: number }>();
  for (const m of marks) {
    if (found.has(m.key) || isKindHidden(hidden, m.kind)) continue;
    const d = distanceM(m.at, centre);
    const b = best.get(m.category);
    if (!b || d < b.d) best.set(m.category, { m, d });
  }
  return ATLAS_ORDER.filter((c) => best.has(c)).map((c) => best.get(c)!.m);
}

/** explore-atlas audit 11: Walk to only where navigation will route (its straight-line limit). */
export const canWalkTo = (m: number) => m <= NAV.maxM;

/** What the read loop does next (AT5, AT12; explore-atlas audit 2, 3, 4). Pure, so the loop's choices are tested. */
export type AtlasStep =
  | { kind: 'adopt'; build: string }
  | AtlasStepNear
  | { kind: 'ring'; area: AtlasArea }
  | { kind: 'wait'; ms: number }
  | { kind: 'idle' };

/** A level to list around a spot, with the reads already made of it. */
export interface NearTarget {
  level: AtlasLevel;
  at: LngLat;
  radiusM: number;
  reads: NearRead[];
  /** WT9: a town's page: the town's key, listed once per build across its border. */
  town?: string;
}

interface StepInput {
  /** The build the hook lists rows under; null before one is known. */
  build: string | null;
  /** The map's build as just checked ('unknown' offline). */
  latest: string;
  /** What should be listed, in order (the view's neighborhoods first, then the towns around you). */
  nears: NearTarget[];
  /** The tiles on screen, in reading order. */
  list: Listed[];
  now: number;
  /** The Overture release known now (AD6). */
  release?: string | null;
  /** The places archive version known for a point, or null (PW10). */
  archiveAt?: (at: LngLat) => string | null;
}

export type AtlasStepNear = { kind: 'near'; level: AtlasLevel; at: LngLat; radiusM: number; town?: string };

export function atlasStep(o: StepInput): AtlasStep {
  // Checked before every step: a newer build is adopted, never chased by reading near again and again (audit 2).
  if (o.latest === 'unknown') return o.build ? afterBuild(o, o.build) : { kind: 'wait', ms: ATLAS_RULES.retryMs };
  if (o.latest !== o.build) return { kind: 'adopt', build: o.latest };
  return afterBuild(o, o.build);
}

function afterBuild(o: StepInput, build: string): AtlasStep {
  const near = o.nears.find((n) => needsNear(n.reads, n.at, build, n.radiusM, n.town));
  if (near) return { kind: 'near', level: near.level, at: near.at, radiusM: near.radiusM, ...(near.town ? { town: near.town } : {}) };
  const archiveAt = o.archiveAt ?? (() => null);
  const next = readQueue(o.list, o.now, o.release ?? null, archiveAt);
  if (next) return { kind: 'ring', area: next };
  // A ring that failed is tried again once its wait is over (AT5, audit 3).
  const waits = o.list.filter((l) => !l.area.profile && l.area.failed_at != null).map((l) => l.area.failed_at! + ATLAS_RULES.retryMs - o.now);
  // And a ring due a re-read for Overture is asked for when it comes due (activity-density audit 10).
  for (const l of o.list) {
    const due = rereadAt(l.area, o.release ?? null, archiveAt(l.area.at));
    if (due != null) waits.push(due - o.now);
  }
  return waits.length ? { kind: 'wait', ms: Math.max(0, Math.min(...waits)) } : { kind: 'idle' };
}

/** AT7: a ring's marks as the atlas keeps them: its markable places by key, kind and spot, with their names dropped. */
export function marksOf<T extends AtlasMark & { name?: string }>(places: T[], markable: (p: T) => boolean): AtlasMark[] {
  return places.filter(markable).map((p) => ({ key: p.key, category: p.category, kind: p.kind, at: p.at }));
}

/**
 * PW10: a ring's findable kinds and marks, from the map's places and the places archive's together (one mark per
 * place, PW8; the owner's edits are applied when the archive is built), against the fixed STEPS. `thin` is judged from the map's places alone, so a
 * ring reads the same with or without the archive.
 */
export function ringOf(tilePlaces: Place[], archivePlaces: Place[] | null, centre: LngLat, within: Within = ringWithin(centre), finds: { key: string; name: string; at: LngLat }[] = [], landcover?: RoadFeature[]) {
  // community-parks PC21: the merge, then the refinement with the tiles' outlines and the archive's places.
  const merged = refineRead(archivePlaces ? mergePlaces(tilePlaces, archivePlaces) : tilePlaces, { landcover, archive: archivePlaces });
  // A found place keeps its find's key, so the atlas shows it found (places-worth-the-stop audit 1).
  const counted = keepFindKeys(merged, finds);
  // AG1: each place says whether it could be found (chains too), so the findable kinds count only those.
  const ring = counted.filter((p) => within(p.at)).map((p) => ({ ...p, markable: isMarkable(p) }));
  const mapRing = tilePlaces.filter((p) => within(p.at));
  return { ring, steps: presenceSteps(ring, centre, within), marks: marksOf(ring, isMarkable), thin: thinRing(mapRing, centre, within) };
}
