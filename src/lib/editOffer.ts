// @layer core
import { facedAt, type Faced } from './moment';

/**
 * The editor after a capture (ME23 as decision 0240 amends it, fix edit-after-capture): once the camera's photo or
 * video is accepted and kept, the place that took it opens its editor by itself, so it is edited before it is looked
 * at on the map. It was a few seconds' Edit offer, a second tap away (0149's pill on the bar).
 */

/** What was kept: the piece, and the moment it is in (its own, or the open moment it joined). */
export interface EditTarget {
  momentId: string;
  pieceId: string;
}

/** The editor opens for every photo or video kept, a new moment's or a piece added to an open one (audit 2). */
export const editAfter = (kept: { kind: 'photo' | 'video'; id: string; momentId: string }): EditTarget => ({ momentId: kept.momentId, pieceId: kept.id });

/**
 * The capture the editor is drawn for, as its piece (`facedAt`): none before the screen's list holds it, or once it is
 * gone, and never another piece. A piece whose open moment went while the camera was up was kept as a moment of its
 * own (UN11), found by its own id (audit 2).
 */
export const editingOf = (t: EditTarget | null, captures: readonly Faced[]): Faced | null => {
  if (!t) return null;
  const m = captures.find((c) => c.id === t.momentId) ?? captures.find((c) => c.id === t.pieceId);
  if (!m) return null;
  if (m.piece_id !== t.pieceId && !m.pieces.some((p) => p.id === t.pieceId)) return null;
  return facedAt(m, t.pieceId);
};

/**
 * What the editor opened after a capture says (fix edit-after-capture audit 1): that the shot is already kept, where the
 * disabled Revert sits until the first edit, and its ✕'s spoken name, so ✕ never reads as "throw it away".
 */
export const keptWords = (kind: 'photo' | 'video'): { line: string; close: string } =>
  kind === 'photo'
    ? { line: 'Photo kept', close: 'Close, the photo stays as it is' }
    : { line: 'Video kept', close: 'Close, the video stays as it is' };
