// @layer core
import { isEmptyEdit, isFull, serializeEdit, type MediaEdit } from './mediaEdit';
/**
 * Thumbnails (TH1-TH5, the owner's call, Nov 1): a small copy beside each
 * photo, so a 56 px preview never decodes the full photo. The job is pure with
 * its platform parts passed in (`media/thumb.ts` wires expo-image-manipulator).
 */
export const THUMB = {
  edge: 240,
  /** A video's still (video thumbnails VT1, the owner's call, Nov 13): sharp enough for a month's cover. */
  videoEdge: 720,
  compress: 0.7,
  /** Stored when a photo won't decode, so it is never tried again (audit 3); previews show the photo. */
  none: 'none',
} as const;

export type ThumbCapture = { id: string; walk_id: string | null; kind: string; file_path: string | null; thumb_path?: string | null };

/** The copy's name: by the capture, never cut from an old ref (a `data:` URL, a dead `file://`; audit 5). */
export const thumbName = (c: { id: string }): string => `${c.id}.thumb.jpg`;

/** A short, stable tag for a text (djb2, base 36). */
function tagOf(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * The copy made from an edited photo (ME20): named by its edit too, so the
 * stored ref changes and a preview keyed by it loads the new picture
 * (media-editing audit 3). A revert to none is a new name as well.
 */
export const editedThumbName = (c: { id: string }, edit: MediaEdit | null): string => `${c.id}.thumb.${tagOf(serializeEdit(edit) ?? 'none')}.jpg`;

/**
 * Whether the copy made at capture may still be stored (media-editing audit
 * 8): not once the photo has a copy or an edit, which an Edit offer's Done
 * may have stored while it was being made.
 */
export const captureThumbStillWanted = (row: { thumb_path?: string | null; edit?: MediaEdit | null } | null): boolean =>
  !!row && !row.thumb_path && isEmptyEdit(row.edit);

/** A photo or a video with a file and no copy yet (TH3, VT1, VT2); one marked undecodable is done. */
export const wantsThumb = (c: ThumbCapture): boolean => (c.kind === 'photo' || c.kind === 'video') && !!c.file_path && !c.thumb_path;

/** The long edge of a kind's copy: a photo's 240, a video's still 720 (VT1). */
export const thumbEdge = (kind: string): number => (kind === 'video' ? THUMB.videoEdge : THUMB.edge);

/** Where a video's still is taken, in seconds (VT1, VT6): the start of its kept part, the trim's start, else 0. */
export const frameAt = (edit: MediaEdit | null | undefined): number => (edit?.trim ? Math.max(0, edit.trim.start_ms) / 1000 : 0);

/**
 * The stored ref a preview shows (TH4): the copy; the photo when the copy's file is
 * gone (audit 6) or it won't decode; null (the icon) while its copy is being made,
 * so a first showing doesn't decode the full photo too (audit 7).
 */
export function thumbShown(c: ThumbCapture, copyBroken: boolean): string | null {
  // A video's preview is its still or nothing: its file is never a picture (VT5).
  if (c.kind === 'video') return c.thumb_path && c.thumb_path !== THUMB.none && !copyBroken ? c.thumb_path : null;
  if (c.kind !== 'photo' || !c.file_path) return null;
  if (c.thumb_path === THUMB.none || (c.thumb_path && copyBroken)) return c.file_path;
  return c.thumb_path ?? null;
}


/** What a video's still is taken from: where the kept part starts, its turn and its crop (VT1). Lines are not in it. */
function stillOf(e: MediaEdit | null | undefined): string {
  return JSON.stringify({ at: e?.trim ? e.trim.start_ms : 0, rotate: e?.rotate ?? 0, crop: e && !isFull(e.crop) ? e.crop : null });
}

/** Whether an edit makes a video's still again (VT6, video-thumbnails audit 8): a trim, crop or rotation changed. */
export const stillChanged = (before: MediaEdit | null | undefined, after: MediaEdit | null | undefined): boolean => stillOf(before) !== stillOf(after);

/** A still made or replaced this session (`lib/thumbs`): its ref (null when one was dropped), and the ref it replaced. */
export interface MadeStill {
  ref: string | null;
  replaced: string | null;
}

/**
 * The still a preview shows (video-thumbnails audit 2, 3, ui 1): what the shell made, while the row still holds the
 * ref it replaced (or none); a row read later, holding anything else, is fresher and wins.
 */
export function shownStill(rowRef: string | null | undefined, made: MadeStill | undefined): string | null {
  const row = rowRef ?? null;
  if (!made) return row;
  return row === null || row === made.replaced ? made.ref : row;
}
