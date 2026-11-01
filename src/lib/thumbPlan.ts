/**
 * Thumbnails (TH1-TH5, the owner's call, Nov 1): a small copy beside each
 * photo, so a 56 px preview never decodes the full photo. Pure; the copy is
 * made in `media/thumb.ts`.
 */
export const THUMB = { edge: 240, compress: 0.7 } as const;

/** The resize that brings the long edge to 240 px; null when the photo is already that small. */
export function thumbResize(width: number, height: number): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= THUMB.edge) return null;
  return width >= height ? { width: THUMB.edge } : { height: THUMB.edge };
}

/** The copy's file name, beside the photo: `abc.jpg` → `abc.thumb.jpg` (always a JPEG). */
export function thumbName(ref: string): string {
  const base = ref.split('/').pop() ?? ref;
  return `${base.replace(/\.[^.]+$/, '')}.thumb.jpg`;
}

/** The folder a stored ref lives in (`walks/<id>/name` → `<id>`), for keeping its copy beside it. */
export const thumbFolder = (ref: string): string => ref.split('/').slice(-2, -1)[0] ?? 'moments';

/** A photo with a file and no copy yet (TH3). */
export const wantsThumb = (c: { kind: string; file_path: string | null; thumb_path?: string | null }): boolean =>
  c.kind === 'photo' && !!c.file_path && !c.thumb_path;
