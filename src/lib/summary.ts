import { db } from './db';
import { filterFixes, splitAtGaps, traceDistanceM, type Bounds } from './geo';
import { walkBounds } from './finish';
import { streetKey } from './streets';
import type { Capture, LngLat, StreetSegment, TracePoint, VisitedSegment, Walk } from './types';

export interface WalkSummary {
  walk: Walk;
  fixes: TracePoint[];
  runs: LngLat[][];
  captures: Capture[];
  bounds: Bounds | null;
  /** Walked segments, ordered by when the trace first reached them. */
  walked: (StreetSegment & { first_t: number })[];
  fog: StreetSegment[];
  newStreets: number;
  streetsWalked: number;
  distanceM: number;
  durationMs: number;
}

export async function loadSummary(walkId: string): Promise<WalkSummary | null> {
  const walk = await db.getWalk(walkId);
  if (!walk) return null;
  const points = await db.getPoints(walkId);
  const fixes = filterFixes(points);
  const captures = await db.getCaptures(walkId);
  const bounds = walkBounds(points);
  const segments = bounds ? await db.getSegmentsIn(bounds) : [];
  const visited = await db.getVisited(walkId);
  const byId = new Map(segments.map((s) => [s.id, s]));
  const visitedIds = new Set(visited.map((v) => v.segment_id));

  const walked = visited
    .map((v) => {
      const s = byId.get(v.segment_id);
      return s ? { ...s, first_t: v.first_t } : null;
    })
    .filter((s): s is StreetSegment & { first_t: number } => s != null)
    .sort((a, b) => a.first_t - b.first_t);

  // A street is new if no earlier walk touched any piece of it.
  const earlier = new Set((await db.listWalks()).filter((w) => w.started_at < walk.started_at).map((w) => w.id));
  const all: VisitedSegment[] = await db.getVisited();
  const earlierIds = new Set(all.filter((v) => earlier.has(v.walk_id)).map((v) => v.segment_id));
  const keyOf = (id: string) => {
    const s = byId.get(id);
    return s ? streetKey(s) : id;
  };
  const earlierKeys = new Set([...earlierIds].map(keyOf));
  const keys = new Set(walked.map(streetKey));
  const newStreets = [...keys].filter((k) => !earlierKeys.has(k)).length;

  const end = walk.ended_at ?? fixes.at(-1)?.t ?? walk.started_at;
  return {
    walk,
    fixes,
    runs: splitAtGaps(fixes),
    captures,
    bounds,
    walked,
    fog: segments.filter((s) => !visitedIds.has(s.id)),
    newStreets,
    streetsWalked: keys.size,
    distanceM: traceDistanceM(fixes),
    durationMs: Math.max(0, end - walk.started_at),
  };
}

const PARTS: [number, string][] = [[5, 'night'], [12, 'morning'], [17, 'afternoon'], [21, 'evening'], [24, 'night']];

/** "Tuesday evening in Fox Point", from the start time and the area found at stop. */
export function suggestTitle(walk: Walk): string {
  const d = new Date(walk.started_at);
  const day = d.toLocaleDateString(undefined, { weekday: 'long' });
  const part = PARTS.find(([h]) => d.getHours() < h)?.[1] ?? 'walk';
  return walk.area ? `${day} ${part} in ${walk.area}` : `${day} ${part} walk`;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10_000 ? 2 : 1)} km`;
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
