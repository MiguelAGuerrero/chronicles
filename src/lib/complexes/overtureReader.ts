// @layer shell
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { Archive } from '../activity/release';
import { TileMemo } from '../net/tileReader';
import { piecesFromBuildingsTile, placesFromPlacesTile, type TileFeatureIn } from './overtureSource';
import type { BuildingPiece, ComplexRead, ComplexSource, PlaceIn } from './types';

/*
 * Reads Overture's `buildings` and `places` tiles for complexes (CX15, CX16): one tile of each, a tile once per release while
 * the app is open (`TileMemo`), each load under its own timeout, a read under its own deadline. Any failure is `ok: false`:
 * the caller shows nothing and asks again later. Given its archive opener, so a test runs it with fakes.
 */
const Z = 14;

type Layer = { length: number; feature(i: number): { toGeoJSON(x: number, y: number, z: number): { geometry: unknown; properties?: unknown } } };

function featuresOf(bytes: ArrayBuffer, name: 'building' | 'place', x: number, y: number): TileFeatureIn[] {
  const layer = new VectorTile(new PbfReader(new Uint8Array(bytes))).layers[name] as Layer | undefined;
  const out: TileFeatureIn[] = [];
  for (let i = 0; layer && i < layer.length; i++) {
    const f = layer.feature(i).toGeoJSON(x, y, Z);
    out.push({ geometry: f.geometry as TileFeatureIn['geometry'], properties: (f.properties ?? {}) as Record<string, unknown> });
  }
  return out;
}

export function createOvertureSource(o: { open: (release: string, file: 'buildings' | 'places') => Archive; tileMs: number; readMs: number }): ComplexSource {
  const archives = new Map<string, Archive>();
  const archive = (release: string, file: 'buildings' | 'places') => {
    const k = `${release}/${file}`;
    let a = archives.get(k);
    if (!a) archives.set(k, (a = o.open(release, file)));
    return a;
  };
  const forget = (release: string, file: 'buildings' | 'places') => archives.delete(`${release}/${file}`);
  const buildings = new TileMemo<BuildingPiece[]>(32);
  const places = new TileMemo<PlaceIn[]>(32);

  async function bytes(release: string, file: 'buildings' | 'places', x: number, y: number): Promise<ArrayBuffer | null> {
    const a = archive(release, file);
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const t = await Promise.race([
        a.getZxy(Z, x, y, ctl.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            ctl.abort();
            reject(new Error('timeout'));
          }, o.tileMs);
        }),
      ]);
      return t?.data ?? null;
    } catch (e) {
      // A failed archive is opened afresh on the next read (pmtiles keeps a failed header for good).
      forget(release, file);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    read(release, tiles, shouldStop) {
      return new Promise<ComplexRead>((resolve) => {
        let done = false;
        const finish = (r: ComplexRead) => {
          if (done) return;
          done = true;
          clearTimeout(deadline);
          if (poll) clearInterval(poll);
          resolve(r);
        };
        const deadline = setTimeout(() => finish({ ok: false }), o.readMs);
        const poll = shouldStop ? setInterval(() => shouldStop() && finish({ ok: false }), 200) : null;
        // A tile that fails is left unread and the others stand (complexes audit 6): the caller asks for it again and says the read was partial.
        Promise.all(
          tiles.map(async ([x, y]) => {
            try {
              const [b, p] = await Promise.all([
                buildings.get(release, x, y, async () => {
                  const d = await bytes(release, 'buildings', x, y);
                  return d ? piecesFromBuildingsTile(x, y, featuresOf(d, 'building', x, y)) : [];
                }),
                places.get(release, x, y, async () => {
                  const d = await bytes(release, 'places', x, y);
                  return d ? placesFromPlacesTile(featuresOf(d, 'place', x, y)) : [];
                }),
              ]);
              return { x, y, b, p };
            } catch {
              return null;
            }
          }),
        ).then(
          (lists) => {
            const ok = lists.filter((l): l is { x: number; y: number; b: BuildingPiece[]; p: PlaceIn[] } => l != null);
            if (tiles.length && !ok.length) return finish({ ok: false });
            finish({ ok: true, pieces: ok.flatMap((l) => l.b), places: ok.flatMap((l) => l.p), tiles: ok.map((l) => [l.x, l.y] as [number, number]) });
          },
          () => finish({ ok: false }),
        );
      });
    },
  };
}
