import type { CategoryId, Mark } from './discovery/types';
import { db } from './db';
import { exploredKey, passedCount, type Kind } from './explore/explore';
import { loadSettings } from './explore/settings';
import { splitAtGaps, type Bounds, smoothDwells, type PauseSpan } from './geo';
import { readTrace, rideRuns, smoothKept, timedRideRuns, traceDistances } from './rides';
import type { TimedRun } from './replay';
import { walkBounds } from './finish';
import type { Capture, LngLat, Pause, StreetSegment, TracePoint, Walk, WalkSummary } from './types';

export interface ReplayData {
  walk: Walk;
  /** Walked and ridden fixes, in time order: the dot follows these. */
  fixes: TracePoint[];
  /** Walked fixes only, and where they break (pauses and rides): the solid trace. */
  walkedFixes: TracePoint[];
  breaks: PauseSpan[];
  pauses: Pause[];
  /** The solid, walked trace. */
  runs: LngLat[][];
  /** Each ride, drawn dashed (R5), with times for drawing it as the dot goes. */
  rideRuns: LngLat[][];
  rideTimed: TimedRun[];
  /** Each ride's first and last fix, for the replay's clock (R10). */
  rides: { t0: number; t1: number }[];
  /** Ridden distance, from the trace: a summary written before rides has none (R6). */
  rideM: number;
  captures: Capture[];
  bounds: Bounds | null;
  /** Walked segments, ordered by when the trace first reached them. */
  walked: (StreetSegment & { first_t: number })[];
  fog: StreetSegment[];
  summary: WalkSummary | null;
  /** Places this walk found, each with its capture (E11): explore's finds, and marks found before explore. */
  found: { capture_id: string; name: string; category: CategoryId; generic: boolean; kind?: Kind }[];
  /** Places named on this walk (within 60 m) but not captured, for the card's low (E11); 0 on a quiet walk. */
  passed: number;
}

/** Everything the replay draws. `summary` is null until the walk has been snapped. */
export async function loadReplay(walkId: string): Promise<ReplayData | null> {
  const walk = await db.getWalk(walkId);
  if (!walk) return null;
  // Standstills are drawn and replayed as a still dot, not GPS jitter.
  const pauses = await db.getPauses(walkId);
  const tr = readTrace(await db.getPoints(walkId), walk.started_at, pauses);
  const fixes = smoothKept(tr);
  const walkedFixes = smoothDwells(tr.walked);
  const captures = await db.getCaptures(walkId);
  // The view takes in the rides; streets and fog are only where you walked (R7).
  const bounds = walkBounds(fixes);
  const streetBounds = walkBounds(walkedFixes);
  const segments = streetBounds ? await db.getSegmentsIn(streetBounds) : [];
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
  // Marks found before explore stay in their walks' replays (E14).
  const marks = await db.listMarks(walkId).catch(() => [] as Mark[]);
  const finds = await db.listFinds(walkId).catch(() => []);
  const found = [
    ...marks.filter((x) => x.state === 'found' && x.capture_id).map((x) => ({ capture_id: x.capture_id!, name: x.name, category: x.category, generic: x.generic })),
    ...finds.map((f) => ({ capture_id: f.capture_id, name: f.name, category: f.category, generic: f.generic, kind: f.kind })),
  ];
  // What it passed without stopping (E11, audit 9): only once it was exploring, only kinds shown, minus its own finds.
  let passed = 0;
  const explored = await db.getMeta(exploredKey(walkId)).catch(() => null);
  if (streetBounds && explored) {
    // '1' from before the audit: count from the start.
    const since = Number(explored) > 1 ? Number(explored) : 0;
    const hidden = (await loadSettings().catch(() => null))?.hidden ?? new Set<Kind>();
    const items = await db.checklistItemsIn(streetBounds).catch(() => []);
    passed = passedCount({
      items, since, hidden,
      // Riding past names nothing (R12).
      fixes: walkedFixes.map((p) => ({ at: [p.lon, p.lat] as LngLat, t: p.t })),
      foundHere: new Set(finds.map((f) => f.key)),
    });
  }
  return {
    found,
    passed,
    walk,
    fixes,
    walkedFixes,
    breaks: tr.breaks,
    pauses,
    runs: splitAtGaps(walkedFixes, 60_000, tr.breaks),
    rideRuns: rideRuns(tr),
    rideTimed: timedRideRuns(tr),
    rides: tr.rides.map((r) => ({ t0: r.t0, t1: r.t1 })),
    rideM: traceDistances(tr).rideM,
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

export { formatDistance, formatDuration, formatElapsed } from './format';

/** "2 photos · 1 video · 1 note", leaving out kinds with none. */
export function formatCaptures(c: { photos: number; videos?: number; voices: number; notes: number }): string {
  const parts: string[] = [];
  if (c.photos) parts.push(`${c.photos} ${c.photos === 1 ? 'photo' : 'photos'}`);
  if (c.videos) parts.push(`${c.videos} ${c.videos === 1 ? 'video' : 'videos'}`);
  if (c.voices) parts.push(`${c.voices} ${c.voices === 1 ? 'voice memo' : 'voice memos'}`);
  if (c.notes) parts.push(`${c.notes} ${c.notes === 1 ? 'note' : 'notes'}`);
  return parts.join(' · ');
}
