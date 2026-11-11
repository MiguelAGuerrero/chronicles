/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import type { LngLat } from '../../types';
import type { PlacePoint } from '../../walk/cells';
import { tilesAround } from '../../walk/layer';
import { walkTileKey } from '../../walk/match';
import type { RingRead } from '../../walk/placeSignals';
import type { WayFacts } from '../../walk/types';

// The real places of specs/place-form PF15, cut from Overture's tiles by scripts/fixture-place-form.mjs, each with the word the owner confirmed.

export type Word = 'exit' | 'grid' | 'mainStreet' | 'village' | null;
export interface FixturePlace {
  id: string;
  name: string;
  at: LngLat;
  word: Word;
  /** A second word the owner accepts for a place marked "?"; null means silence is accepted too. */
  accept?: Word;
  tiles: string[];
  ways: WayFacts[];
  junctions: LngLat[];
  places: (PlacePoint & { category: string })[];
  buildings: LngLat[];
}
export interface FixtureSet {
  release: string;
  confirmed: string;
  ringM: number;
  dataM: number;
  places: FixturePlace[];
}

const here = new URL('.', import.meta.url);
type Raw = { release: string; confirmed: string; ringM: number; dataM: number; places: Record<string, Omit<FixturePlace, 'id' | 'junctions' | 'places' | 'buildings'> & { junctions: number[][]; places: [number, number, number, string][]; buildings: number[] }> };

/** One set of places, or null when its file is not cut yet (the held-out set is cut after the thresholds, PF6). */
export function loadSet(name: 'Calibration' | 'HeldOut'): FixtureSet | null {
  const file = new URL(`placeForm${name}.json`, here);
  if (!existsSync(file)) return null;
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Raw;
  const places = Object.entries(raw.places).map(([id, p]) => {
    const kx = 111320 * Math.cos((p.at[1] * Math.PI) / 180);
    const at = (dx: number, dy: number): LngLat => [p.at[0] + dx / kx, p.at[1] + dy / 110540];
    const buildings: LngLat[] = [];
    for (let i = 0; i < p.buildings.length; i += 2) buildings.push(at(p.buildings[i], p.buildings[i + 1]));
    return {
      ...p,
      id,
      junctions: p.junctions.map(([dx, dy]) => at(dx, dy)),
      places: p.places.map(([dx, dy, weight, category]) => ({ at: at(dx, dy), weight, category })),
      buildings,
    } as FixturePlace;
  });
  return { release: raw.release, confirmed: raw.confirmed, ringM: raw.ringM, dataM: raw.dataM, places };
}

export const RING_M = 800;

/** A fixture place as a ring read, around its own centre or a moved one; places and buildings can be left out as a failed read. */
export function readOf(p: FixturePlace, o: { at?: LngLat; places?: boolean; buildings?: boolean; ways?: WayFacts[] } = {}): RingRead {
  const at = o.at ?? p.at;
  return {
    at,
    radiusM: RING_M,
    tilesRead: p.tiles,
    ways: o.ways ?? p.ways,
    junctions: p.junctions,
    places: o.places === false ? null : p.places.map(({ at: a, weight }) => ({ at: a, weight })),
    buildings: o.buildings === false ? null : p.buildings,
  };
}

/** A point moved so many metres east and north. */
export function moved(at: LngLat, dxM: number, dyM: number): LngLat {
  return [at[0] + dxM / (111320 * Math.cos((at[1] * Math.PI) / 180)), at[1] + dyM / 110540];
}

/** The keys of the tiles under a ring (what a read must have covered). */
export const ringTiles = (at: LngLat, radiusM = RING_M) => tilesAround(at, radiusM).map(([x, y]) => walkTileKey(x, y));

/** The accepted words for a place: its word, and a second the owner accepted. */
export const acceptable = (p: FixturePlace): Word[] => (p.accept === undefined ? [p.word] : [p.word, p.accept]);

/** Pairs of words that are plainly wrong for each other (PF7), in either direction; no grouping of the words by size. */
export const WRONG_PAIRS: [Exclude<Word, null>, Exclude<Word, null>][] = [
  ['grid', 'village'],
  ['grid', 'exit'],
  ['mainStreet', 'exit'],
];
export const plainlyWrong = (expected: Word, got: Word) => WRONG_PAIRS.some(([a, b]) => (expected === a && got === b) || (expected === b && got === a));
