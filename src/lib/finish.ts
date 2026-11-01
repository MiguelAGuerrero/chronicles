import type { CollectedFeatures } from '../components/map/types';
import { db } from './db';
import { isNamedStreet } from './deletion/core';
import { boundsOf, distanceM, pausedMs, positionAt, withoutPauses, type Bounds, type PauseSpan } from './geo';
import { keptFixes, readTrace, smoothKept, traceDistances } from './rides';
import { snap } from './snapper';
import { deriveSegments, type RoadFeature } from './streets';
import { assignAreas, snapDone } from './areas/assign';
import { placesFromTilePois } from './discovery/tilePois';
import { appBoundaries } from './areas/boundaries';
import { placesFromTiles } from './areas/tilePlaces';
import type { Area, WalkArea } from './areas/types';
import { ensureTileBuild } from './tiles';
import type { LngLat, StreetSegment, TracePoint, Walk, WalkSummary } from './types';

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

export function walkBounds(fixes: TracePoint[], padM = AREA_PAD_M): Bounds | null {
  return boundsOf(fixes.map((p) => [p.lon, p.lat] as LngLat), padM);
}

export interface Collector {
  /** Plans camera stops covering the bounds, nearest the trace first. */
  plan(bounds: Bounds, trace: LngLat[]): LngLat[];
  collect(centers: LngLat[]): Promise<CollectedFeatures>;
  /** Place points over a wider area than the street tiles (towns and cities); null when they could not be read. */
  collectPlaces(center: LngLat): Promise<RoadFeature[] | null>;
}

/**
 * Derives the streets for a walk's area from the tiles and snaps the trace
 * onto them, then writes the visited rows and the walk's summary in one
 * transaction. Runs after stop, behind the replay's first beat, and again
 * whenever the tile build has changed since the walk was last snapped.
 * Everything written here is derived and can be recomputed from the trace.
 */
export async function snapWalk(walk: Walk, collector: Collector): Promise<WalkSummary> {
  const build = await ensureTileBuild();
  const pauses = await db.getPauses(walk.id);
  const stills = await db.getStills(walk.id).catch(() => []);
  const points = withoutPauses(await db.getPoints(walk.id), pauses);
  const tr = readTrace(points, walk.started_at, pauses, stills);
  // Streets are read where you walked (a ride credits none, R7); places and captures take the rides too (R8, R9).
  const fixes = tr.walked;
  const kept = keptFixes(tr);
  const bounds = walkBounds(fixes);
  const keptBounds = walkBounds(kept);
  let derived: StreetSegment[] = [];
  let area = walk.area;

  // The places the walk was in: kept as they were when the place points can't be read (offline).
  let placed: { areas: Area[]; rows: WalkArea[] } | null = null;
  let streetsRead = false;
  let features: CollectedFeatures | null = null;
  if (bounds) {
    const trace = fixes.map((p) => [p.lon, p.lat] as LngLat);
    features = await collector.collect(collector.plan(bounds, trace)).catch(() => null);
    if (features) {
      // Views that timed out leave streets unread: the walk is snapped again later.
      streetsRead = features.complete;
      derived = deriveSegments(features.roads, features.names, build);
      // Places of interest come from the same z14 reads as the streets (D1).
      await db.putPlaces(placesFromTilePois(features.pois ?? [], build)).catch(() => {});
      const mid = fixes[Math.floor(fixes.length / 2)];
      area = pickArea(features.places, [mid.lon, mid.lat]) ?? area;
    }
  }
  // A walk that is all ride is still placed from its ride (R8); a failed street read waits, as before.
  if (keptBounds && (features || !bounds)) {
    const center: LngLat = [(keptBounds[0] + keptBounds[2]) / 2, (keptBounds[1] + keptBounds[3]) / 2];
    const wide = await collector.collectPlaces(center).catch(() => null);
    if (wide) {
      const placement = assignAreas(walk.id, points, pauses, placesFromTiles([...(features?.places ?? []), ...wide]), appBoundaries(), walk.started_at, stills);
      placed = { areas: [...placement.areas.values()], rows: placement.rows };
      // No neighborhood or town: the nearest named place (pickArea above) stays the title.
      area = placement.title ?? area;
    }
  }
  // Cached pieces from earlier walks of this build, plus the ones just derived.
  const byId = new Map<string, StreetSegment>();
  if (bounds) for (const s of await db.getSegmentsIn(bounds)) if (s.build === build) byId.set(s.id, s);
  for (const s of derived) byId.set(s.id, s);
  const segments = [...byId.values()];

  const visited = snap(walk.id, points, segments, walk.started_at, pauses, stills);
  const earlier = await db.streetKeysBefore(walk.started_at);
  // Streets are counted by name (the owner's call); unnamed paths clear fog but are not streets.
  const keys = new Set(visited.map((v) => v.street_key).filter(isNamedStreet));
  const captures = await db.getCaptures(walk.id);
  // A capture on a ride lands on the ride line (R9).
  await placeCaptures(captures, smoothKept(tr), pauses, segments);

  const end = walk.ended_at ?? kept.at(-1)?.t ?? walk.started_at;
  const { walkedM, rideM } = traceDistances(tr);
  const summary: WalkSummary = {
    walk_id: walk.id,
    build,
    // Jitter while standing still is not distance walked, and a ride is its own distance (R6).
    distance_m: walkedM,
    ride_m: rideM,
    // Paused time is not walking time.
    duration_ms: Math.max(0, end - walk.started_at - pausedMs(pauses, walk.started_at, end)),
    new_streets: [...keys].filter((k) => !earlier.has(k)).length,
    streets_walked: keys.size,
    photos: captures.filter((c) => c.kind === 'photo').length,
    videos: captures.filter((c) => c.kind === 'video').length,
    voices: captures.filter((c) => c.kind === 'voice').length,
    notes: captures.filter((c) => c.kind === 'text').length,
    streets_read: segments.length > 0,
  };
  // Without its places (the wide read failed or timed out), the walk is snapped
  // again at its next replay rather than marked done.
  // A walk with no trace has nothing to read, and is done.
  await db.saveSnap(walk.id, derived, visited, summary, placed, snapDone({ streetsRead: !bounds || streetsRead, placesRead: !keptBounds || placed != null }));
  if (area !== walk.area) await db.updateWalk(walk.id, { area });
  return summary;
}

/**
 * Places each capture on the trace by its time, unless it was stamped with
 * a fresh fix when taken, and notes the street it was taken on. The trace is
 * the smoothed one, so a capture during a standstill sits on the still dot;
 * one taken while paused sits where the pause began, not on a line across it.
 */
async function placeCaptures(
  captures: { id: string; t: number; lat: number | null; lon: number | null }[],
  fixes: TracePoint[],
  pauses: PauseSpan[],
  segments: StreetSegment[],
) {
  for (const c of captures) {
    const inPause = pauses.find((p) => c.t >= p.started_at && c.t <= (p.ended_at ?? Infinity));
    const pos = c.lat != null && c.lon != null ? ([c.lon, c.lat] as LngLat) : positionAt(fixes, inPause ? inPause.started_at : c.t);
    if (!pos) continue;
    let best: { id: string; d: number } | null = null;
    for (const s of segments)
      for (const line of s.geometry)
        for (const v of line) {
          const d = distanceM(pos, v);
          if (d < 40 && (!best || d < best.d)) best = { id: s.id, d };
        }
    await db.updateCapture(c.id, { lat: pos[1], lon: pos[0], segment_id: best?.id ?? null });
    c.lat = pos[1];
    c.lon = pos[0];
  }
}
