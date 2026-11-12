// @layer shell
import { tileAt } from '../tileMath';
import type { LngLat } from '../types';
import { tilesFor } from './extent';
import { inArea } from './mapLayer';
import { complexAt, COMPLEX_NEAR_DEG } from './place';
import { complexesFrom, hasIncomplete } from './rule';
import type { BuildingPiece, Complex, ComplexSource, ComplexStore, PlaceIn } from './types';

/**
 * Reads, judges and keeps complexes (CX12, CX14, CX16). `readArea` is the only thing that touches the network (through the
 * source); `lineFor` and `near` read the store alone, so showing a moment makes no request.
 */
export interface Complexes {
  /** `failed` is a read that got nothing (offline, a stalled host): asked again later. `partial` is a read that covered only part of the area. */
  readArea(area: { at: LngLat; reachM: number }, release: string, shouldStop?: () => boolean): Promise<{ complexes: Complex[]; partial: boolean; failed?: boolean }>;
  near(at: LngLat, spanDeg?: number): Promise<Complex[]>;
  lineFor(fix: LngLat): Promise<{ complex: Complex; near: boolean } | null>;
}

export function createComplexes(p: { source: ComplexSource; store: ComplexStore; now: () => number }): Complexes {
  // What this session has read, by release and tile: a tile is asked for once per release (CX16). Pieces are kept with their tile so a
  // building cut across tiles is joined on every judgement.
  const tiles = new Map<string, { pieces: BuildingPiece[]; places: PlaceIn[] }>();
  // A place near a tile's edge is in both tiles' buffers: once (complexes audit 1). And a complex is stored once (complexes audit 5).
  const seenPlaces = new Set<string>();
  const stored = new Set<string>();
  const key = (release: string, x: number, y: number) => `${release}/${x}/${y}`;

  return {
    async readArea(area, release, shouldStop) {
      const { tiles: want, partial: overBudget } = tilesFor(area);
      const need = want.filter(([x, y]) => !tiles.has(key(release, x, y)));
      if (need.length) {
        let r;
        try {
          r = await p.source.read(release, need, shouldStop);
        } catch {
          r = { ok: false as const };
        }
        // A failed read shows nothing, stores nothing and is tried again on the next ask (CX16).
        if (!r.ok) return { complexes: [], partial: true, failed: true };
        for (const [x, y] of r.tiles) tiles.set(key(release, x, y), { pieces: [], places: [] });
        for (const piece of r.pieces) tiles.get(key(release, piece.tile[0], piece.tile[1]))?.pieces.push(piece);
        for (const pl of r.places) {
          // Filed under the tile it lies in; one whose own tile is not read yet is left for when it is (it may be here only from a
          // neighbour's buffer), never marked seen.
          const t = tileAt(pl.at);
          const slot = tiles.get(key(release, t.x, t.y));
          if (!slot) continue;
          const k = `${release}/${pl.id ?? `${pl.at.join(',')}:${pl.hierarchy.join('>')}`}`;
          if (seenPlaces.has(k)) continue;
          seenPlaces.add(k);
          slot.places.push(pl);
        }
      }
      const held = [...tiles.entries()].filter(([k]) => k.startsWith(`${release}/`));
      const readTiles = held.map(([k]) => k.split('/').slice(1).map(Number) as [number, number]);
      const allPieces = held.flatMap(([, v]) => v.pieces);
      const complexes = complexesFrom(allPieces, held.flatMap(([, v]) => v.places), readTiles, release);
      const fresh = complexes.filter((c) => !stored.has(`${release}/${c.id}/${c.code}`));
      if (fresh.length) {
        const ok = await p.store.putComplexes(fresh).then(() => true, () => false);
        if (ok) for (const c of fresh) stored.add(`${release}/${c.id}/${c.code}`);
      }
      // Partial when the budget cut the tiles, a wanted tile did not read, or a building needs a tile that was never read (complexes audit 2).
      const unread = want.some(([x, y]) => !tiles.has(key(release, x, y)));
      return { complexes: inArea(complexes, area), partial: overBudget || unread || hasIncomplete(allPieces, readTiles) };
    },
    near: (at, spanDeg = COMPLEX_NEAR_DEG) => p.store.complexesNear(at, spanDeg),
    async lineFor(fix) {
      return complexAt(fix, await p.store.complexesNear(fix, COMPLEX_NEAR_DEG));
    },
  };
}
