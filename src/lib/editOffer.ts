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
export const editAfter = (kept: KeptShot): EditTarget => ({ momentId: kept.momentId, pieceId: kept.id });

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

/** What the camera kept: the piece, and the moment it is in. */
export type KeptShot = { kind: 'photo' | 'video'; id: string; momentId: string };

/** What the camera returned, before it is kept: the picked asset (tend captures T62). */
export interface Shot {
  kind: 'photo' | 'video';
  uri: string;
}

/**
 * The shot a screen holds full screen from the camera's return until its editor is up (tend captures T62, the proxy's
 * shape under 0157, "Photo first, editor over it"): its turn, what it was kept as, and whether it was closed while held.
 */
export interface HeldShot extends Shot {
  turn: number;
  kept: EditTarget | null;
  closed: boolean;
}

/**
 * How the camera tells the screen's editor what it returned (`shot`, which answers its turn and whether the screen holds
 * it) and how the keep went. Held, the shot reads the picked file until it leaves the view, so the keep leaves the file in
 * place; `release` says it is then the editor's to let go (kept, or copied before its row failed), never the holder's for
 * Retry (tend captures audit 8).
 */
export interface CameraWatch {
  shot(s: Shot): { turn: number; holds: boolean };
  kept(turn: number, k: KeptShot | null, release: boolean): void;
}

/**
 * The camera returned: the shot is held only where the screen would open its editor (not mid-memo, T60; not while its
 * walk stops or has ended, or its bar has gone), so no cover is drawn that no editor follows.
 */
export const shotTaken = (s: Shot, turn: number, opens: boolean): HeldShot | null => (opens ? { kind: s.kind, uri: s.uri, turn, kept: null, closed: false } : null);

/** Its keep settled: kept, the shot waits for the editor; failed (held for Retry, its error said), the cover goes. */
export const shotKept = (h: HeldShot | null, turn: number, k: KeptShot | null): HeldShot | null => {
  if (!h || h.turn !== turn) return h;
  return k ? { ...h, kept: editAfter(k) } : null;
};

/** Closed (Escape, Back, the walk's Stop, Done): the cover goes, and no editor opens for the shot afterwards. */
export const shotClosed = (h: HeldShot | null): HeldShot | null => (h ? { ...h, closed: true } : null);

/**
 * What the screen draws after a capture: nothing, the held shot (the editor minus its controls), or the editor. The
 * held shot and its editor share a key, so they are one element: the controls come over the same shot, with no remount
 * and no fade from transparent. An editor never held (mid-memo, T60) is keyed by its piece and opens as before. Kept,
 * but the screen opened no editor for it in the same turn (its Stop, its walk's end): nothing.
 */
export type AfterCapture =
  | { show: 'none' }
  | { show: 'held'; key: string; shot: Shot }
  | { show: 'editor'; key: string; capture: Faced; shot: Shot | null };

const NOTHING: AfterCapture = { show: 'none' };

export function afterCapture(a: { shot: HeldShot | null; target: EditTarget | null; captures: readonly Faced[]; waits: boolean }): AfterCapture {
  if (a.waits) return NOTHING;
  const h = a.shot;
  const ours = !!h && !!h.kept && !!a.target && h.kept.pieceId === a.target.pieceId;
  if (h && h.closed && (!h.kept || ours)) return NOTHING;
  const editing = editingOf(a.target, a.captures);
  if (editing) {
    return ours && h ? { show: 'editor', key: `shot-${h.turn}`, capture: editing, shot: { kind: h.kind, uri: h.uri } } : { show: 'editor', key: `piece-${editing.piece_id}`, capture: editing, shot: null };
  }
  if (h && (!h.kept || ours)) return { show: 'held', key: `shot-${h.turn}`, shot: { kind: h.kind, uri: h.uri } };
  return NOTHING;
}
