import { db } from './db';
import { filterFixes, splitAtGaps, type Bounds, withoutPauses, smoothDwells } from './geo';
import { walkBounds } from './finish';
import type { Capture, LngLat, Pause, StreetSegment, TracePoint, Walk, WalkSummary } from './types';

export interface ReplayData {
  walk: Walk;
  fixes: TracePoint[];
  pauses: Pause[];
  runs: LngLat[][];
  captures: Capture[];
  bounds: Bounds | null;
  /** Walked segments, ordered by when the trace first reached them. */
  walked: (StreetSegment & { first_t: number })[];
  fog: StreetSegment[];
  summary: WalkSummary | null;
}

/** Everything the replay draws. `summary` is null until the walk has been snapped. */
export async function loadReplay(walkId: string): Promise<ReplayData | null> {
  const walk = await db.getWalk(walkId);
  if (!walk) return null;
  // Standstills are drawn and replayed as a still dot, not GPS jitter.
  const pauses = await db.getPauses(walkId);
  const fixes = smoothDwells(filterFixes(withoutPauses(await db.getPoints(walkId), pauses), walk.started_at));
  const captures = await db.getCaptures(walkId);
  const bounds = walkBounds(fixes);
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
  const summary = (await db.listSummaries()).find((s) => s.walk_id === walkId) ?? null;
  return {
    walk,
    fixes,
    pauses,
    runs: splitAtGaps(fixes, 60_000, pauses),
    captures,
    bounds,
    walked,
    fog: segments.filter((s) => !visitedIds.has(s.id)),
    summary,
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

/** m:ss under ten minutes, so a just-started walk visibly counts; minutes after. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return formatDuration(ms);
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return `${Math.max(0, Math.round(ms / 1000))} s`;
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

/** "2 photos · 1 video · 1 note", leaving out kinds with none. */
export function formatCaptures(c: { photos: number; videos?: number; voices: number; notes: number }): string {
  const parts: string[] = [];
  if (c.photos) parts.push(`${c.photos} ${c.photos === 1 ? 'photo' : 'photos'}`);
  if (c.videos) parts.push(`${c.videos} ${c.videos === 1 ? 'video' : 'videos'}`);
  if (c.voices) parts.push(`${c.voices} ${c.voices === 1 ? 'voice memo' : 'voice memos'}`);
  if (c.notes) parts.push(`${c.notes} ${c.notes === 1 ? 'note' : 'notes'}`);
  return parts.join(' · ');
}
