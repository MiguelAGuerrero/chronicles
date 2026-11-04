// @layer core
/**
 * Thumbnails (TH1-TH5, the owner's call, Nov 1): a small copy beside each
 * photo, so a 56 px preview never decodes the full photo. The job is pure with
 * its platform parts passed in (`media/thumb.ts` wires expo-image-manipulator).
 */
export const THUMB = {
  edge: 240,
  compress: 0.7,
  /** Stored when a photo won't decode, so it is never tried again (audit 3); previews show the photo. */
  none: 'none',
} as const;

export type ThumbCapture = { id: string; walk_id: string | null; kind: string; file_path: string | null; thumb_path?: string | null };

/** The copy's name: by the capture, never cut from an old ref (a `data:` URL, a dead `file://`; audit 5). */
export const thumbName = (c: { id: string }): string => `${c.id}.thumb.jpg`;

/** A photo with a file and no copy yet (TH3); one marked undecodable is done. */
export const wantsThumb = (c: ThumbCapture): boolean => c.kind === 'photo' && !!c.file_path && !c.thumb_path;

/**
 * The stored ref a preview shows (TH4): the copy; the photo when the copy's file is
 * gone (audit 6) or it won't decode; null (the icon) while its copy is being made,
 * so a first showing doesn't decode the full photo too (audit 7).
 */
export function thumbShown(c: ThumbCapture, copyBroken: boolean): string | null {
  if (c.kind !== 'photo' || !c.file_path) return null;
  if (c.thumb_path === THUMB.none || (c.thumb_path && copyBroken)) return c.file_path;
  return c.thumb_path ?? null;
}

