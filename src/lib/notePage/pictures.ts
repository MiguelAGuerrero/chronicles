// @layer core
import type { MediaEdit } from '../mediaEdit';
import type { CaptureKind } from '../types';

/**
 * A mention drawn as its picture (note pictures NI1-NI18, specs/note-pictures): which mentions are pictures, what
 * they say aloud, when one says where it is from, and what a page is to draw for each. Stubs until the tests pass.
 */
export type PictureKind = 'photo' | 'video';

/** One mention's way of being drawn: its picture, its card, "a moment no longer kept", or nothing while moments load. */
export type Want = { id: string; how: 'picture' | 'card' | 'gone' | 'wait'; kind?: PictureKind };

export const pictureKind = (_kind: CaptureKind): PictureKind | null => null;

export const pictureSpoken = (_kind: PictureKind, _label: string | null, _line: string): string => '';

export const showsContext = (_moment: { t: number; walkId: string | null }, _page: { t: number; walkId: string | null }): boolean => false;

export const pictureKey = (_c: { piece_id: string; edit?: MediaEdit | null }): string => '';

export function picturesWanted(
  _ids: string[],
  _views: Map<string, { kind: CaptureKind; hasMedia: boolean }>,
  _hidden: Set<string>,
  _ready: boolean,
): Want[] {
  return [];
}
