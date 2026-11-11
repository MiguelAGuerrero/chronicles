// @layer shell
import { tileAt } from '../tileMath';
import type { LngLat } from '../types';
import { tilesFor } from './extent';
import { inArea } from './mapLayer';
import { complexAt, COMPLEX_NEAR_DEG } from './place';
import { complexesFrom } from './rule';
import type { BuildingPiece, Complex, ComplexSource, ComplexStore, PlaceIn } from './types';

/**
 * Reads, judges and keeps complexes (CX12, CX14, CX16). `readArea` is the only thing that touches the network (through the
 * source); `lineFor` and `near` read the store alone, so showing a moment makes no request.
 */
export interface Complexes {
  readArea(area: { at: LngLat; reachM: number }, release: string, shouldStop?: () => boolean): Promise<{ complexes: Complex[]; partial: boolean }>;
  near(at: LngLat, spanDeg?: number): Promise<Complex[]>;
  lineFor(fix: LngLat): Promise<{ complex: Complex; near: boolean } | null>;
}

export function createComplexes(p: { source: ComplexSource; store: ComplexStore; now: () => number }): Complexes {
  // What this session has read, by release and tile: a tile is asked for once per release (CX16). Pieces are kept with their tile so a
  // building cut across tiles is joined on every judgement.
  const tiles = new Map<string, { pieces: BuildingPiece[]; places: PlaceIn[] }>();
  const key = (release: string, x: number, y: number) => `${release}/${x}/${y}`;

  return {
    async readArea(area, release, shouldStop) {
      const { tiles: want, partial } = tilesFor(area);
      const need = want.filter(([x, y]) => !tiles.has(key(release, x, y)));
      if (need.length) {
        let r;
        try {
          r = await p.source.read(release, need, shouldStop);
        } catch {
          r = { ok: false as const };
        }
        // A failed read shows nothing, stores nothing and is tried again on the next ask (CX16).
        if (!r.ok) return { complexes: [], partial: true };
        for (const [x, y] of r.tiles) tiles.set(key(release, x, y), { pieces: [], places: [] });
        for (const piece of r.pieces) tiles.get(key(release, piece.tile[0], piece.tile[1]))?.pieces.push(piece);
        for (const pl of r.places) {
          const t = tileAt(pl.at);
          tiles.get(key(release, t.x, t.y))?.places.push(pl);
        }
      }
      const held = [...tiles.entries()].filter(([k]) => k.startsWith(`${release}/`));
      const readTiles = held.map(([k]) => k.split('/').slice(1).map(Number) as [number, number]);
      const complexes = complexesFrom(held.flatMap(([, v]) => v.pieces), held.flatMap(([, v]) => v.places), readTiles, release);
      if (complexes.length) await p.store.putComplexes(complexes).catch(() => undefined);
      return { complexes: inArea(complexes, area), partial };
    },
    near: (at, spanDeg = COMPLEX_NEAR_DEG) => p.store.complexesNear(at, spanDeg),
    async lineFor(fix) {
      return complexAt(fix, await p.store.complexesNear(fix, COMPLEX_NEAR_DEG));
    },
  };
}
