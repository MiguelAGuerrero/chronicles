// @layer shell
import type { CollectedFeatures } from '../../../components/map/types';
import type { ActivityPoint } from '../../activity/points';
import { activityFromTilePois, mergeSources } from '../../activity/points';
import { placesFromTilePois } from '../../discovery/tilePois';
import { parseHidden } from '../../explore/explore';
import { gradeStreets } from '../../landing/grade';
import { metaStore } from '../../meta';
import type { Ports } from '../../ports/types';
import { deriveSegments } from '../../streets';
import { tilesIn } from '../../tileMath';
import type { LngLat, StreetSegment } from '../../types';
import { SCENIC } from '../rules';
import { corridorBounds, greenFromTiles, sightsFrom, type Signals } from '../scenicSignals';

/** One read of the corridor: its streets, and what a scenic route leans toward. */
export interface ScenicRead {
  segments: StreetSegment[];
  signals: Signals;
}

/** The two reads it makes, passed in: both reach the network (and `fetchTiles` the db singleton). */
export interface ScenicIo {
  fetchTiles(url: string, tiles: [number, number][], zoom?: number, shouldStop?: () => boolean): Promise<CollectedFeatures>;
  readOverture(tiles: [number, number][], shouldStop?: () => boolean): Promise<{ release: string; points: ActivityPoint[] } | null>;
}

/**
 * The read behind a scenic route (SR13, SR9): the z14 tiles of the corridor between the two ends
 * from the tile host, and Overture's places for the same tiles, as "What's good here?" reads them.
 * Its streets and places join today's caches, tagged with the build; the green, the sights and the
 * graded busy streets are made from it and never kept. Any failure, or a Cancel, gives null.
 */
export function createScenicRead(p: Pick<Ports, 'db'>, io: ScenicIo) {
  const meta = metaStore(p.db);
  return {
    async read(from: LngLat, to: LngLat, shouldStop: () => boolean): Promise<ScenicRead | null> {
      try {
        const [url, build] = await Promise.all([meta.get('tile_url'), meta.get('tile_build')]);
        if (!url || !build) return null;
        const tiles = tilesIn(corridorBounds(from, to));
        if (tiles.length > SCENIC.maxTiles) return null;
        const [features, overture] = await Promise.all([
          io.fetchTiles(url, tiles, undefined, shouldStop),
          io.readOverture(tiles, shouldStop).catch(() => null),
        ]);
        if (shouldStop()) return null;
        const segments = deriveSegments(features.roads, features.names, build);
        const places = placesFromTilePois(features.pois, build);
        await p.db.putSegments(segments).catch(() => {});
        await p.db.putPlaces(places).catch(() => {});
        const points = mergeSources(activityFromTilePois(features.pois), overture?.points ?? []);
        const centre: LngLat = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
        const busy = gradeStreets({ centre, points, segments }).graded.map((g) => ({ name: g.name, grade: g.grade, lines: g.lines }));
        // PK18: read as the switches read it, so a choice saved before a kind existed hides what it hid.
        const [off, known] = await Promise.all([meta.get('explore_hidden').catch(() => null), meta.get('explore_kinds_known').catch(() => null)]);
        const hidden = parseHidden(off ? JSON.stringify(off) : null, known ? JSON.stringify(known) : null);
        const found = new Set((await p.db.listFinds().catch(() => [])).map((f) => f.key));
        const green = greenFromTiles(features.landcover ?? [], places.filter((x) => x.category === 'parks'));
        if (shouldStop()) return null;
        return { segments, signals: { green, sights: sightsFrom(places, hidden, found), busy } };
      } catch {
        return null;
      }
    },
  };
}
