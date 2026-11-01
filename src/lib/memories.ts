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
