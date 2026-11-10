// @layer core
import { distanceM, positionAt, type PauseSpan } from './geo';
import { parseEdit } from './mediaEdit';
import type { Capture, LngLat, Moment, StreetSegment, TracePoint } from './types';

/**
 * A moment holds its media (decision 0106, MT4, MT5, MT10): the pure helpers over it. The store keeps a moment's
 * place and time once; its pieces keep their own capture times.
 */

/** The moment's face: its first photo or video, else its first piece (MS8). */
export function face(m: Pick<Moment, 'pieces'>): Capture {
  return m.pieces.find((p) => p.kind === 'photo' || p.kind === 'video') ?? m.pieces[0];
}

/**
 * What a row, a pin or a card shows of a moment: the moment's own fields (its id, walk, time and place) with its
 * face's media, the face's own id as `piece_id` (a media write names it), and every piece.
 */
export type Faced = Omit<Moment, 'pieces'> & Omit<Capture, 'id' | 'moment_id' | 't'> & { piece_id: string; pieces: Capture[] };

export function faced(m: Moment): Faced {
  const { id: piece_id, moment_id: _m, t: _t, ...media } = face(m);
  return { ...media, id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id, piece_id, pieces: m.pieces };
}

/** A moment as one flat record, as a capture was before the moment table (the migration's input, tests' fixtures). */
export type Flat = Omit<Capture, 'moment_id'> & Pick<Moment, 'walk_id' | 'lat' | 'lon' | 'segment_id'>;

/**
 * A one-piece moment from a flat record, under the same id (MT1). A faced moment may be given back (a test's
 * fixture, a row as shown): its face's media becomes the one piece, under the face's own id.
 */
export function momentOf(c: Flat & { piece_id?: string; pieces?: Capture[] }): Moment {
  const { walk_id, lat, lon, segment_id, piece_id, pieces: _pieces, ...media } = c;
  return { id: c.id, walk_id, t: c.t, lat, lon, segment_id, pieces: [{ ...media, id: piece_id ?? c.id, moment_id: c.id }] };
}

/** `faced(momentOf(c))`: a flat record as a row shows it. */
export const facedOf = (c: Flat): Faced => faced(momentOf(c));

/** The piece columns of a joined row are prefixed `p_` (the SQLite store's one statement per read, MT7). */
export type PieceRow = { p_id: string; p_t: number; p_kind: Capture['kind']; p_file_path: string | null; p_body: string | null; p_caption?: string | null; p_caption_y?: number | null; p_thumb_path?: string | null; p_edit?: unknown };
export type JoinedRow = Omit<Moment, 'pieces'> & PieceRow;

/**
 * Folds rows of moments joined to their pieces into moments, each once in the order first met, its pieces in
 * capture order (MT4). A row's `p_edit` may be stored text; it is parsed, and a broken one reads as none. A
 * column the row holds as null is left off the piece, as a field never written is.
 */
export function foldRows(rows: JoinedRow[]): Moment[] {
  const out = new Map<string, Moment>();
  for (const r of rows) {
    let m = out.get(r.id);
    if (!m) {
      m = { id: r.id, walk_id: r.walk_id, t: r.t, lat: r.lat, lon: r.lon, segment_id: r.segment_id, pieces: [] };
      out.set(r.id, m);
    }
    // As the other stores: a piece read back carries the optional fields it was kept with, and an edit parsed.
    const piece: Capture = { id: r.p_id, moment_id: r.id, t: r.p_t, kind: r.p_kind, file_path: r.p_file_path, body: r.p_body };
    if (r.p_caption != null) piece.caption = r.p_caption;
    if (r.p_caption_y != null) piece.caption_y = r.p_caption_y;
    if (r.p_thumb_path != null) piece.thumb_path = r.p_thumb_path;
    if (r.p_edit != null) piece.edit = parseEdit(r.p_edit);
    m.pieces.push(piece);
  }
  for (const m of out.values()) m.pieces.sort((a, b) => a.t - b.t);
  return [...out.values()];
}

/** How near a street must be to name it as the one a moment was taken on (placement at stop). */
export const STREET_NEAR_M = 40;

/**
 * Where a moment sits on its walk (MT5): its stamped place when it has one, else the smoothed trace at its time,
 * or where a pause began when it was taken inside one, so it never sits on a line across the pause; and the
 * street within 40 m of it. Null when the trace has no fix to place it by.
 */
export function placeAt(
  m: { t: number; lat: number | null; lon: number | null },
  fixes: TracePoint[],
  pauses: PauseSpan[],
  segments: StreetSegment[],
): { lat: number; lon: number; segment_id: string | null } | null {
  const inPause = pauses.find((p) => m.t >= p.started_at && m.t <= (p.ended_at ?? Infinity));
  const stamped = m.lat != null && m.lon != null;
  const pos: LngLat | null = stamped ? [m.lon!, m.lat!] : positionAt(fixes, inPause ? inPause.started_at : m.t);
  if (!pos) return null;
  let best: { id: string; d: number } | null = null;
  for (const s of segments)
    for (const line of s.geometry)
      for (const v of line) {
        const d = distanceM(pos, v);
        if (d < STREET_NEAR_M && (!best || d < best.d)) best = { id: s.id, d };
      }
  return { lat: pos[1], lon: pos[0], segment_id: best?.id ?? null };
}

/** Every piece's media and small copy, for deleting a moment's files (MT6). */
export function piecesOf(moments: Pick<Moment, 'pieces'>[]): Capture[] {
  return moments.flatMap((m) => m.pieces);
}

/** Moments as rows, pins and cards show them: `faced` over a store read. */
export const facedAll = (ms: Moment[]): Faced[] => ms.map(faced);
