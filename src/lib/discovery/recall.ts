import { distanceM } from '../geo';
import type { Capture, LngLat } from '../types';
import type { Recall, RecallFrequency } from './types';

/** Remind me here's numbers (R2, R4, R5). */
export const RECALL_RULES = {
  /** A flagged capture comes back within this of an accepted fix. */
  reachM: 75,
  weekMs: 7 * 86_400_000,
  monthMs: 30 * 86_400_000,
  /** A note's reminder shows this much of its text. */
  noteChars: 120,
  /** A moment made outside a walk rests this long before it can come back, as a walk's own captures never do in it (audit). */
  looseRestMs: 2 * 3_600_000,
} as const;

/** Past its until-date the flag ends silently; the capture stays an ordinary memory (R6). */
export const isExpired = (r: Recall, now: number) => r.until != null && r.until < now;

/** Whether the frequency lets it fire again yet (R5); "once" is cleared on its first fire. */
function rested(r: Recall, now: number): boolean {
  if (r.last_fired_at == null) return true;
  if (r.frequency === 'weekly') return now - r.last_fired_at >= RECALL_RULES.weekMs;
  if (r.frequency === 'monthly') return now - r.last_fired_at >= RECALL_RULES.monthMs;
  return true;
}

/**
 * The flagged captures due at `here` (R2, R5, R6, R8): within 75 m, not in
 * the walk that recorded them, not yet in this walk, rested, and before their
 * until-date. A quiet walk has none.
 */
export function dueRecalls(o: {
  /** The accepted fix, or every accepted fix of a batch. */
  here: LngLat | LngLat[];
  walkId: string;
  now: number;
  quiet: boolean;
  recalls: Recall[];
  captures: Capture[];
}): { recall: Recall; capture: Capture }[] {
  if (o.quiet) return [];
  const byId = new Map(o.captures.map((c) => [c.id, c]));
  const path: LngLat[] = typeof o.here[0] === 'number' ? [o.here as LngLat] : (o.here as LngLat[]);
  const out: { recall: Recall; capture: Capture }[] = [];
  for (const r of o.recalls) {
    const c = byId.get(r.capture_id);
    if (!c || c.lat == null || c.lon == null || c.walk_id === o.walkId || r.last_walk_id === o.walkId) continue;
    if (isExpired(r, o.now) || !rested(r, o.now)) continue;
    if (c.walk_id == null && o.now - c.t < RECALL_RULES.looseRestMs) continue;
    const at: LngLat = [c.lon, c.lat];
    if (path.some((p) => distanceM(p, at) <= RECALL_RULES.reachM)) out.push({ recall: r, capture: c });
  }
  return out;
}

/** What a fire writes (R6, R9): "once" clears the flag; the rest count and remember this walk. */
export function afterFire(r: Recall, walkId: string, now: number):
  | { kind: 'clear' }
  | { kind: 'update'; patch: Pick<Recall, 'last_fired_at' | 'fired_count' | 'last_walk_id'> } {
  if (r.frequency === 'once') return { kind: 'clear' };
  return { kind: 'update', patch: { last_fired_at: now, fired_count: r.fired_count + 1, last_walk_id: walkId } };
}

/**
 * A new flag. Set during a walk, it counts as fired in that walk, so the
 * capture being looked at doesn't come back two seconds later (audit).
 */
export function newRecall(captureId: string, frequency: RecallFrequency, until: number | null, openWalkId: string | null): Recall {
  return { capture_id: captureId, frequency, until, last_fired_at: null, fired_count: 0, last_walk_id: openWalkId };
}

/** An edit changes how often and until when, never what firing wrote (R9). */
export const editedRecall = (fresh: Recall, frequency: RecallFrequency, until: number | null): Recall => ({ ...fresh, frequency, until });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KIND_WORD: Record<Capture['kind'], string> = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' };

/** The reminder's words, carrying the content (R4); two or more in reach are one (R7). */
export function reminderText(captures: Capture[]): { title: string; body: string } {
  if (captures.length > 1) return { title: `${captures.length} memories here`, body: kindsOf(captures) };
  const c = captures[0];
  if (c.kind === 'text' && c.body) {
    const text = c.body.trim();
    return { title: 'A note from here', body: text.length > RECALL_RULES.noteChars ? `${text.slice(0, RECALL_RULES.noteChars)}…` : text };
  }
  if (c.caption) return { title: 'A memory from here', body: c.caption };
  const d = new Date(c.t);
  return { title: 'A memory from here', body: `${KIND_WORD[c.kind]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

const ONE: Record<Capture['kind'], string> = { photo: 'a photo', video: 'a video', voice: 'a voice memo', text: 'a note' };
const MANY: Record<Capture['kind'], string> = { photo: 'photos', video: 'videos', voice: 'voice memos', text: 'notes' };

/** "A photo and a note", "2 voice memos and a note". */
function kindsOf(captures: Capture[]): string {
  const order: Capture['kind'][] = ['photo', 'video', 'voice', 'text'];
  const parts = order
    .map((k) => [k, captures.filter((c) => c.kind === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => (n === 1 ? ONE[k] : `${n} ${MANY[k]}`));
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}
