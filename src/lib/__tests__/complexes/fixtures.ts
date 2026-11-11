import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BuildingPiece, PlaceIn } from '../../complexes/types';
import type { LngLat } from '../../types';

// The real fixtures (scripts/fixture-complexes.mjs, Overture 2026-10-21.0): named building pieces per z14 tile, and the
// places that lie inside any of them. Downtown Harrisburg (tiles 4691-4693 x 6186-6188) and Whitehall (4756-4757 x 6164-6165).

export const RELEASE = '2026-10-21.0';
export type Raw = {
  release: string;
  tiles: {
    x: number;
    y: number;
    buildings: { id: string; name: string; subtype: string | null; class: string | null; polygons: LngLat[][][] }[];
    places: { at: LngLat; hierarchy: string[]; name: string | null }[];
  }[];
};
export const fixture = (name: 'harrisburg' | 'whitehall'): Raw => JSON.parse(readFileSync(join(__dirname, `${name}.json`), 'utf8'));
export const tilesOf = (r: Raw): [number, number][] => r.tiles.map((t) => [t.x, t.y]);
export const piecesOf = (r: Raw): BuildingPiece[] =>
  r.tiles.flatMap((t) => t.buildings.map((b) => ({ id: b.id, name: b.name, subtype: b.subtype, class: b.class, tile: [t.x, t.y] as [number, number], polygons: b.polygons })));
export const placesOf = (r: Raw): PlaceIn[] => r.tiles.flatMap((t) => t.places.map((p) => ({ at: p.at, hierarchy: p.hierarchy })));
