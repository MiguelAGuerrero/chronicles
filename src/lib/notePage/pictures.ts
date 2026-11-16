// @layer core
import { serializeEdit, type MediaEdit } from '../mediaEdit';
import type { CaptureKind } from '../types';

/**
 * A mention drawn as its picture (note pictures NI1-NI18, specs/note-pictures): which mentions are pictures, what
 * they say aloud, when one says where it is from, and what a page is to draw for each. Presentation only: the note
 * keeps the mention token and the photo stays its own moment (NP14).
 */
export type PictureKind = 'photo' | 'video';

/** One mention's way of being drawn: its picture, its card, "a moment no longer kept", or nothing while moments load. */
export type Want = { id: string; how: 'picture' | 'card' | 'gone' | 'wait'; kind?: PictureKind };

/** A photo or a video is drawn as its picture; a note, a memo and a text moment keep their chip and card (NI9). */
export const pictureKind = (kind: CaptureKind): PictureKind | null => (kind === 'photo' || kind === 'video' ? kind : null);

const NAME: Record<PictureKind, string> = { photo: 'Photo', video: 'Video' };
/** What the page's camera writes as a mention's words (NP14). */
const CAMERA_WORDS: Record<PictureKind, string> = { photo: 'A photo', video: 'A video' };

/** The spoken name (NI10): the kind, its own words unless they are the camera's, then the card's line. */
export function pictureSpoken(kind: PictureKind, label: string | null, line: string): string {
  const words = label?.trim();
  return !words || words === CAMERA_WORDS[kind] ? `${NAME[kind]}. ${line}` : `${NAME[kind]}: ${words}. ${line}`;
}

const dayOf = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * A picture says where it is from only when it is from another day or another walk than the page's (NI16). A page
 * whose walk is not known (`walkId` undefined: a page begun on a capture surface) is compared by its day alone.
 */
export const showsContext = (moment: { t: number; walkId: string | null }, page: { t: number; walkId?: string | null }): boolean =>
  dayOf(moment.t) !== dayOf(page.t) || (page.walkId !== undefined && moment.walkId !== page.walkId);

/** What a picture is made from: the piece and its edit, so it is made again when either changes and not before (NI11, NI15). */
export const pictureKey = (c: { piece_id: string; edit?: MediaEdit | null }): string => `${c.piece_id}:${serializeEdit(c.edit) ?? 'none'}`;

/**
 * What each mention of a page is drawn as, in the order written (NI17): none is skipped, collapsed or chosen. Nothing
 * is called gone while the moments are being read (NI8); a moment gone or waiting in Undo is gone; a photo with no
 * file, and every other kind, keeps its card (NI9).
 */
export function picturesWanted(
  ids: string[],
  views: Map<string, { kind: CaptureKind; hasMedia: boolean }>,
  hidden: ReadonlySet<string>,
  ready: boolean,
): Want[] {
  return ids.map((id): Want => {
    if (!ready) return { id, how: 'wait' };
    const v = views.get(id);
    if (!v || hidden.has(id)) return { id, how: 'gone' };
    const kind = pictureKind(v.kind);
    return kind && v.hasMedia ? { id, how: 'picture', kind } : { id, how: 'card' };
  });
}
