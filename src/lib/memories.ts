import { distanceM } from './geo';
import type { Capture, CaptureKind, LngLat } from './types';

/**
 * Memories on revisit (the concept doc's tab): captures from earlier walks
 * near you show as faint pins, on every walk (the owner's call, Nov 1), and
 * never buzz or notify. Pure; the walk screen reads the area and draws them.
 */
export const MEMORY_RULES = {
  /** A memory shows within this of the latest accepted fix (MR1). */
  reachM: 100,
  /** At most this many, nearest first. */
  cap: 6,
  /** The area is read again after this much walking (MR8). */
  rereadM: 50,
  /** The box read around you: the reach plus the walking between reads, so nothing in reach is missed. */
  readBoxM: 150,
  /** The preview closes once you walk this far from where it opened (MR4). */
  closeM: 30,
} as const;

/** Memories within reach (MR1): other walks only, with a place, nearest first, capped; minus any shown as a reminder (MR7). */
export function memoriesNear(o: { pool: Capture[]; here: LngLat | null; walkId: string | null; hidden: Set<string> }): Capture[] {
  const here = o.here;
  if (!here) return [];
  return o.pool
    .filter((c) => c.walk_id !== o.walkId && c.lat != null && c.lon != null && !o.hidden.has(c.id))
    .map((c) => ({ c, d: distanceM(here, [c.lon!, c.lat!]) }))
    .filter((x) => x.d <= MEMORY_RULES.reachM)
    .sort((a, b) => a.d - b.d || a.c.t - b.c.t)
    .slice(0, MEMORY_RULES.cap)
    .map((x) => x.c);
}

/** Whether to read the area again (MR8): first, or after 50 m walked since the last read. */
export const needsRead = (readAt: LngLat | null, here: LngLat): boolean => !readAt || distanceM(readAt, here) >= MEMORY_RULES.rereadM;

const LABEL: Record<CaptureKind, string> = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' };
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** The preview's line (MR4): a note's first line, a photo's caption, a memo's or video's length, else the kind. */
export function previewLine(c: Capture): string {
  if (c.kind === 'text') return (c.body ?? '').split('\n')[0].trim() || LABEL.text;
  if (c.kind === 'photo') return c.caption?.trim() || LABEL.photo;
  const ms = Number(c.body);
  return Number.isFinite(ms) && ms > 0 ? `${LABEL[c.kind]} · ${clock(ms)}` : LABEL[c.kind];
}

/**
 * Reads the area around you at most once per 50 m (MR8), one read at a time.
 * A slow read is never thrown away because a fix came in meanwhile, and a
 * failed one marks nothing as read, so the next fix tries again (audit 1).
 * It sends only when the set of captures changed (audit 10).
 */
export function memoryReader(read: (at: LngLat) => Promise<Capture[]>, onPool: (pool: Capture[]) => void) {
  let readAt: LngLat | null = null;
  let busy = false;
  let lastIds: string | null = null;
  let stopped = false;
  return {
    poll(here: LngLat) {
      if (busy || stopped || !needsRead(readAt, here)) return;
      busy = true;
      readAt = here;
      read(here).then(
        (pool) => {
          busy = false;
          if (stopped) return;
          const ids = pool.map((c) => c.id).sort().join(',');
          if (ids === lastIds) return;
          lastIds = ids;
          onPool(pool);
        },
        () => {
          busy = false;
          readAt = null;
        },
      );
    },
    stop() {
      stopped = true;
    },
  };
}

/** How far around a tapped group to look (audit 3): its farthest member and a margin, at least What happened here's 50 m. */
export function groupRadiusM(at: LngLat, group: Capture[]): number {
  let far = 0;
  for (const c of group) if (c.lat != null && c.lon != null) far = Math.max(far, distanceM(at, [c.lon, c.lat]));
  return Math.max(50, Math.ceil(far + 10));
}

/** What a tapped group opens (audit 3): its own captures first, then the rest nearby, oldest first; never this walk's. */
export function groupFirst(group: Capture[], nearby: Capture[], walkId: string | null): Capture[] {
  const ids = new Set(group.map((c) => c.id));
  const rest = nearby.filter((c) => !ids.has(c.id)).sort((a, b) => a.t - b.t);
  return [...group, ...rest].filter((c) => c.walk_id !== walkId);
}
