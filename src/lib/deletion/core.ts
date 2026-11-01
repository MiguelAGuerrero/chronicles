import { THUMB } from '../thumbPlan';
import type { Capture, CaptureKind, WalkSummary } from '../types';

/**
 * Clearing walks and moments (D1-D11, the concept doc's "Clearing walks and
 * moments" tab): the pure rules. Storage is in `db.deleteWalk` and
 * `db.deleteCaptures`; the Undo window is `pending.ts`.
 */

export type DeleteKind = 'walk' | 'media' | 'moment';

/** Photos, videos and memos: what "Remove photos, videos and memos" takes (D2). Notes stay. */
export const isMedia = (c: { kind: CaptureKind }): boolean => c.kind !== 'text';

/**
 * The stored files a set of captures holds (D3): the media and a photo's
 * thumbnail. `THUMB.none` marks a photo that won't decode, and a `data:` ref
 * lives in the row itself, so neither is a file.
 */
export function filesOf(captures: Pick<Capture, 'file_path' | 'thumb_path'>[]): string[] {
  const out: string[] = [];
  for (const c of captures) {
    for (const ref of [c.file_path, c.thumb_path]) {
      if (ref && ref !== THUMB.none && !ref.startsWith('data:')) out.push(ref);
    }
  }
  return out;
}

/** Streets are counted by name (the owner's call): an unnamed path's key is its segment id, never a street. */
export const isNamedStreet = (key: string): boolean => key.startsWith('name:');

/**
 * Each walk's new streets counted again from the visited rows left (D7): a
 * street is new on the first walk, by start time, that walked it. Only walks
 * with a stored count are returned, and only where the count changed.
 */
export function recountNewStreets(
  walks: { id: string; started_at: number }[],
  visited: { walk_id: string; street_key: string }[],
  stored: Map<string, number>,
): { walk_id: string; new_streets: number }[] {
  const keysOf = new Map<string, Set<string>>();
  for (const v of visited) {
    if (!isNamedStreet(v.street_key)) continue;
    let s = keysOf.get(v.walk_id);
    if (!s) keysOf.set(v.walk_id, (s = new Set()));
    s.add(v.street_key);
  }
  const seen = new Set<string>();
  const out: { walk_id: string; new_streets: number }[] = [];
  for (const w of [...walks].sort((a, b) => a.started_at - b.started_at)) {
    let fresh = 0;
    for (const k of keysOf.get(w.id) ?? []) {
      if (!seen.has(k)) fresh++;
    }
    for (const k of keysOf.get(w.id) ?? []) seen.add(k);
    const was = stored.get(w.id);
    if (was != null && was !== fresh) out.push({ walk_id: w.id, new_streets: fresh });
  }
  return out;
}

/** A walk's moment counts, from its capture rows (D9, audit 3): never by subtraction. */
export function countsOf(captures: Pick<Capture, 'kind'>[]): Pick<WalkSummary, 'photos' | 'videos' | 'voices' | 'notes'> {
  const n = (k: CaptureKind) => captures.filter((c) => c.kind === k).length;
  return { photos: n('photo'), videos: n('video'), voices: n('voice'), notes: n('text') };
}

/** The walk's counts without the removed moments (D9); the walk's own numbers stay. */
export function summaryLess(s: WalkSummary, removed: Pick<Capture, 'kind'>[]): WalkSummary {
  const n = (k: CaptureKind) => removed.filter((c) => c.kind === k).length;
  const less = (have: number | undefined, k: CaptureKind) => Math.max(0, (have ?? 0) - n(k));
  return { ...s, photos: less(s.photos, 'photo'), videos: less(s.videos, 'video'), voices: less(s.voices, 'voice'), notes: less(s.notes, 'text') };
}

/** "Frees about N MB." from 0.1 MB (D11): one decimal under 10, whole numbers above. */
export function sizeText(bytes: number): string {
  if (!(bytes >= 100_000)) return '';
  const [v, unit] = bytes >= 1_000_000_000 ? [bytes / 1_000_000_000, 'GB'] : [bytes / 1_000_000, 'MB'];
  const shown = v < 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v));
  return `Frees about ${shown} ${unit}.`;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const withSize = (body: string, bytes: number) => [body, sizeText(bytes)].filter(Boolean).join(' ');

export interface ConfirmText {
  title: string;
  body: string;
  confirm: string;
}

/** D4: what deleting a walk takes. */
export function walkDeleteText(o: { moments: number; streets: number; bytes: number }): ConfirmText {
  const parts = ['Its trace'];
  if (o.moments) parts.push(count(o.moments, 'moment', 'moments'));
  if (o.streets) parts.push(count(o.streets, 'street walked', 'streets walked'));
  const body = `${joinAnd(parts)} ${parts.length > 1 ? 'go' : 'goes'}.`;
  return { title: 'Delete this walk?', body: withSize(body, o.bytes), confirm: 'Delete walk' };
}

/** D4: what removing a walk's media takes, and what stays. */
export function mediaRemoveText(o: { photos: number; videos: number; voices: number; bytes: number }): ConfirmText {
  const parts: string[] = [];
  if (o.photos) parts.push(count(o.photos, 'photo', 'photos'));
  if (o.videos) parts.push(count(o.videos, 'video', 'videos'));
  if (o.voices) parts.push(count(o.voices, 'voice memo', 'voice memos'));
  const n = o.photos + o.videos + o.voices;
  const body = `${joinAnd(parts)} ${n === 1 ? 'goes' : 'go'}. The walk, its notes and its streets stay.`;
  return { title: 'Remove photos, videos and memos?', body: withSize(body, o.bytes), confirm: 'Remove' };
}

const KIND_NOUN: Record<CaptureKind, string> = { photo: 'photo', video: 'video', voice: 'voice memo', text: 'note' };

/** D4: deleting one moment. */
export function momentDeleteText(kind: CaptureKind, bytes: number): ConfirmText {
  return { title: `Delete this ${KIND_NOUN[kind]}?`, body: withSize('You can undo it for 5 seconds.', bytes), confirm: 'Delete' };
}

/** D5: the pill's words, naming the moment's kind when it is known. */
export function toastText(kind: DeleteKind, what?: CaptureKind): string {
  if (kind === 'walk') return 'Walk deleted';
  if (kind === 'media') return 'Photos, videos and memos removed';
  if (!what) return 'Moment deleted';
  const noun = KIND_NOUN[what];
  return `${noun[0].toUpperCase()}${noun.slice(1)} deleted`;
}
