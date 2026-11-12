// @layer core
import { classesOfOverture, densityWeight } from '../presence/presence';
import { tileAt } from '../tileMath';
import { bboxOf, inPolygons, pointInside } from './geom';
import { COMPLEX_CODE, type BuildingPiece, type Complex, type ComplexKind, type PlaceIn } from './types';

/*
 * The rule (CX1-CX3, CX14): which named buildings are complexes, and of what kind. One table, tuned on the saved real
 * fixtures (`__tests__/complexes/*.json`, `scripts/fixture-complexes.mjs`); the minimums gate "made of other places", they
 * are never a measure of size or significance (decision 0103).
 */

/** Shopping: places to go (presence weight 1: shop, boutique, eatery, food counter, drink), never offices or services. */
export const MIN_GO = 8;
/** Markets: places whose Overture category is a farmers', public or flea market. */
export const MIN_MARKET = 2;
/** Campuses (subtype medical or education) and Civic (subtype civic): places of any class inside. */
export const MIN_CAMPUS = 8;
export const MIN_CIVIC = 8;

const MARKET_CATEGORIES = new Set(['farmers_market', 'public_market', 'flea_market']);

/** The z14 tiles holding any vertex of the pieces of one building: all must be read before it is judged (CX14). */
export function neededTiles(pieces: readonly BuildingPiece[]): [number, number][] {
  const out = new Map<string, [number, number]>();
  for (const piece of pieces) {
    out.set(piece.tile.join('/'), piece.tile);
    for (const rings of piece.polygons) for (const ring of rings) for (const p of ring) {
      const t = tileAt(p);
      out.set(`${t.x}/${t.y}`, [t.x, t.y]);
    }
  }
  return [...out.values()];
}

/** The kind of a joined building and what it holds, or null when it fits none (CX3). First match: markets, stations, campuses, civic, shopping. */
export function kindOf(b: { subtype: string | null; class: string | null }, inside: readonly PlaceIn[]): ComplexKind | null {
  if (inside.filter((p) => p.hierarchy.some((h) => MARKET_CATEGORIES.has(h))).length >= MIN_MARKET) return 'markets';
  // A station says so in its class (complexes audit 8): a garage, a hangar or a building with no class is no station.
  if (b.subtype === 'transportation' && b.class != null && (b.class === 'transportation' || /station|terminal/.test(b.class)) && inside.length >= 1) return 'stations';
  if ((b.subtype === 'medical' || b.subtype === 'education') && inside.length >= MIN_CAMPUS) return 'campuses';
  if (b.subtype === 'civic' && inside.length >= MIN_CIVIC) return 'civic';
  if (inside.filter((p) => densityWeight(classesOfOverture(p.hierarchy)) >= 1).length >= MIN_GO) return 'shopping';
  return null;
}

/** Whether any building among these pieces has a tile it needs that was not read: the read did not cover it (complexes audit 2). */
export function hasIncomplete(pieces: readonly BuildingPiece[], readTiles: readonly [number, number][]): boolean {
  const read = new Set(readTiles.map(([x, y]) => `${x}/${y}`));
  const groups = new Map<string, BuildingPiece[]>();
  for (const p of pieces) {
    const g = groups.get(p.id);
    if (g) g.push(p);
    else groups.set(p.id, [p]);
  }
  for (const group of groups.values()) if (!neededTiles(group).every(([x, y]) => read.has(`${x}/${y}`))) return true;
  return false;
}

/** The complexes among these pieces and places: pieces joined by id, judged only when every needed tile is in `readTiles` (CX1-CX3, CX14). */
export function complexesFrom(pieces: readonly BuildingPiece[], places: readonly PlaceIn[], readTiles: readonly [number, number][], release: string): Complex[] {
  const read = new Set(readTiles.map(([x, y]) => `${x}/${y}`));
  const groups = new Map<string, BuildingPiece[]>();
  for (const p of pieces) {
    const g = groups.get(p.id);
    if (g) g.push(p);
    else groups.set(p.id, [p]);
  }
  const out: Complex[] = [];
  for (const [id, group] of groups) {
    // Never a partial outline: a building with a vertex in a tile not read is missing (CX14).
    if (!neededTiles(group).every(([x, y]) => read.has(`${x}/${y}`))) continue;
    const polygons = group.flatMap((p) => p.polygons);
    const bbox = bboxOf(polygons);
    const inside = places.filter((p) => p.at[0] >= bbox[0] && p.at[0] <= bbox[2] && p.at[1] >= bbox[1] && p.at[1] <= bbox[3] && inPolygons(p.at, polygons));
    const first = group[0];
    const kind = kindOf({ subtype: group.find((p) => p.subtype)?.subtype ?? null, class: group.find((p) => p.class)?.class ?? null }, inside);
    if (!kind) continue;
    out.push({ id, name: first.name, kind, polygons, at: pointInside(polygons), bbox, release, code: COMPLEX_CODE });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
