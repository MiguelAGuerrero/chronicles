import type { CollectedFeatures } from '../components/map/types';
import { db } from './db';
import { boundsOf, distanceM, filterFixes, positionAt, type Bounds } from './geo';
import { snap } from './snapper';
import { deriveSegments, type RoadFeature } from './streets';
import type { LngLat, StreetSegment, TracePoint } from './types';

const AREA_PAD_M = 150;
const NEIGHBORHOOD = ['neighbourhood', 'quarter', 'suburb'];
const SETTLEMENT = ['hamlet', 'village', 'town', 'city'];

/** Neighborhood (or failing that, town) nearest the middle of the walk. */
export function pickArea(places: RoadFeature[], at: LngLat): string | null {
  for (const classes of [NEIGHBORHOOD, SETTLEMENT]) {
    let best: { name: string; d: number } | null = null;
    for (const p of places) {
      const cls = String(p.properties?.class ?? '');
      const name = p.properties?.name;
      if (!classes.includes(cls) || typeof name !== 'string' || p.geometry.type !== 'Point') continue;
      const d = distanceM(at, p.geometry.coordinates as LngLat);
      if (!best || d < best.d) best = { name, d };
    }
    if (best && best.d < 3000) return best.name;
  }
  return null;
}

export function walkBounds(points: TracePoint[], padM = AREA_PAD_M): Bounds | null {
  return boundsOf(filterFixes(points).map((p) => [p.lon, p.lat] as LngLat), padM);
}

/**
 * Runs when a walk stops: derives street segments for the walked area from
 * the tiles on screen, snaps the trace onto them, and closes the walk.
 * Everything written here is derived and can be recomputed from the trace.
 */
export async function finishWalk(
  walkId: string,
  endedAt: number,
  collect: (b: Bounds) => Promise<CollectedFeatures>,
): Promise<void> {
  const points = await db.getPoints(walkId);
  const fixes = filterFixes(points);
  const bounds = walkBounds(points);
  let area: string | null = null;

  if (bounds) {
    const features = await collect(bounds).catch(() => null);
    if (features) {
      await db.putSegments(deriveSegments(features.roads, features.names));
      const mid = fixes[Math.floor(fixes.length / 2)];
      area = pickArea(features.places, [mid.lon, mid.lat]);
    }
    const segments = await db.getSegmentsIn(bounds);
    await db.setVisited(walkId, snap(walkId, points, segments));
    await placeCaptures(walkId, fixes, segments);
  }

  await db.updateWalk(walkId, { open: false, ended_at: endedAt, area });
}

/** Fills each capture's position from the trace, and the street it was taken on. */
async function placeCaptures(walkId: string, fixes: TracePoint[], segments: StreetSegment[]) {
  for (const c of await db.getCaptures(walkId)) {
    const pos = c.lat != null && c.lon != null ? ([c.lon, c.lat] as LngLat) : positionAt(fixes, c.t);
    if (!pos) continue;
    let best: { id: string; d: number } | null = null;
    for (const s of segments)
      for (const line of s.geometry)
        for (const v of line) {
          const d = distanceM(pos, v);
          if (d < 40 && (!best || d < best.d)) best = { id: s.id, d };
        }
    await db.updateCapture(c.id, { lat: pos[1], lon: pos[0], segment_id: best?.id ?? null });
  }
}
