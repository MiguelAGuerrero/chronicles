// @layer core
import type { TranscriptRow } from '../types';

/**
 * The decisions of memo transcripts (specs/memo-transcripts): what to read next, whether a run may start, what the
 * row says. No clock, no I/O. Every line is words: no digit, no count, no progress (MX23, 0052).
 */

/** The label wherever a transcript's words appear (MX1, MX8; the owner's call, Nov 11). */
export const LABEL = 'Heard by this phone';

/** The room a model needs beyond its own size, for the file being written beside the one in place. */
const ROOM_MARGIN = 1.25;
/** A memo that cannot be read is tried this often for a given model (MX18). */
export const MAX_TRIES = 2;

export const COPY = {
  title: 'Transcribe memos on this phone',
  sub: 'Reads what you say in a memo so it can join a thread. Nothing leaves your phone.',
  ask: (size: string) => `Get a small model to read memos on this phone? It is ${size}, once.`,
  download: 'Download',
  notNow: 'Not now',
  notInstalled: 'Not installed.',
  noRoom: 'There is not enough room for it right now.',
  unsupported: 'This browser can’t read memos here.',
  failed: 'Couldn’t get it. Try again.',
  remove: 'Remove the model',
  keep: 'Keep it',
  removed: 'The room is back.',
} as const;

export interface MemoRef {
  piece_id: string;
  t: number;
}

/**
 * The next memo to read (MX17): the oldest with no transcript at this tag. A transcript at another tag is stale and
 * read again (MX5); a failed read (no words, `tries`) is tried again until `MAX_TRIES` for this tag (MX18); silence is
 * a transcript of no words and is not read again (MX19).
 */
export function nextToRead(memos: MemoRef[], rows: TranscriptRow[], tag: string, max = MAX_TRIES): MemoRef | null {
  const byPiece = new Map(rows.map((r) => [r.piece_id, r]));
  let best: MemoRef | null = null;
  for (const m of memos) {
    const r = byPiece.get(m.piece_id);
    const due = !r || r.tag !== tag || (r.text === null && r.tries < max);
    if (due && (best === null || m.t < best.t)) best = m;
  }
  return best;
}

/** A transcript's words, trimmed and otherwise as heard (MX1, MX3); null for none or silence. */
export function wordsOf(row: Pick<TranscriptRow, 'text'> | undefined | null): string | null {
  const t = row?.text?.trim();
  return t ? t : null;
}

export interface RunConditions {
  on: boolean;
  installed: boolean;
  available: boolean;
  foreground: boolean;
  recording: boolean;
}

/** A run needs the switch, the model, the engine, the foreground and no walk recording (MX17). */
export function mayRun(c: RunConditions): boolean {
  return c.on && c.installed && c.available && c.foreground && !c.recording;
}

/** Whether the room left holds the model; an unreadable room tries, as storage awareness reads nothing as fine (SA1). */
export function roomEnough(free: number | null, bytes: number): boolean {
  if (free == null || !Number.isFinite(free)) return true;
  return free >= Math.ceil(bytes * ROOM_MARGIN);
}

export interface RowState {
  on: boolean;
  /** The row is open (the owner is looking at it, or has just turned the switch). */
  open: boolean;
  installed: boolean;
  room: boolean;
  supported: boolean;
}

/** The words under the row, only while the switch is on or the row is open (MX13); nothing when all is well. */
export function stateLine(s: RowState): string | null {
  if (!s.on && !s.open) return null;
  if (!s.supported) return COPY.unsupported;
  if (s.installed) return null;
  return s.room ? COPY.notInstalled : COPY.noRoom;
}
