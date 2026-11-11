// @layer core
import type { MediaEdit } from './mediaEdit';
// The truth tables (Walk, TracePoint, Moment and its Capture pieces) are append-only, apart
// from the walk's own fields and a moment's placement at stop. Everything
// else (StreetSegment, VisitedSegment, WalkSummary) is a cache derived from
// map tiles and the trace, tagged with the tile build it came from, and can
// be dropped and rebuilt at any time.

export type LngLat = [lon: number, lat: number];

export interface Walk {
  id: string;
  started_at: number;
  ended_at: number | null;
  title: string | null;
  epilogue: string | null;
  /** Resume flag: a walk stays open until the user taps stop. */
  open: boolean;
  /** Neighborhood or town name picked from the map at stop, for titles. */
  area: string | null;
  /** Tile build the walk was last snapped against; null until it is. */
  snapped_build: string | null;
}

export interface TracePoint {
  walk_id: string;
  t: number;
  lat: number;
  lon: number;
  accuracy_m: number | null;
  speed: number | null;
  course: number | null;
}

/**
 * A voice memo's words as the phone read them (specs/memo-transcripts, MX4): a cache by piece id, recomputed when the
 * engine's `tag` changes, never edited. `text` is null for a memo whose read failed (`tries` counts them), empty for
 * one with no speech.
 */
export interface TranscriptRow {
  piece_id: string;
  moment_id: string;
  text: string | null;
  engine: string;
  tag: string;
  made_at: number;
  tries: number;
}

export type CaptureKind = 'photo' | 'video' | 'voice' | 'text';

/**
 * A moment (decision 0123): truth, its one place and time (one fix per moment, 0036), holding its media as pieces.
 * Every moment kept before the moment table has one piece, under the moment's own id, so threads, replies,
 * reminders and finds keep pointing at the same ids.
 */
export interface Moment {
  id: string;
  /** The walk it was made on; null for a moment made outside any walk. */
  walk_id: string | null;
  /** The moment's time: its first piece's. */
  t: number;
  lat: number | null;
  lon: number | null;
  /** The street it was taken on, noted at the walk's stop; null outside a walk or away from a street. */
  segment_id: string | null;
  /** Its media, in capture order; never empty. */
  pieces: Capture[];
}

/** One piece of a moment's media (decision 0123): truth, with its own capture time. */
export interface Capture {
  id: string;
  /** The moment it belongs to. */
  moment_id: string;
  t: number;
  kind: CaptureKind;
  /**
   * Media reference, resolved to a playable URI by lib/media. Native: a path
   * relative to the app's Documents folder. Web: a key in the media store.
   */
  file_path: string | null;
  /** Text body for notes; duration in ms for voice memos and videos. */
  body: string | null;
  /** A photo's caption, drawn as a bar over it; the photo file itself is untouched. */
  caption?: string | null;
  /** Where the caption bar sits, as a fraction of the photo's height from the top. */
  caption_y?: number | null;
  /** A small copy of a photo for previews (TH1), beside it; null until made, or when the photo is already small. */
  thumb_path?: string | null;
  /**
   * A photo's or video's edits (ME21, decision 0090): rotate, crop, filter,
   * drawing, trim, as data on the untouched file. Null or absent: none.
   */
  edit?: MediaEdit | null;
}

/**
 * A stretch of a walk the motion sensors said the walker stood still (Motion,
 * MO8): truth, kept with the walk like its pauses. The trace's fixes inside
 * one are read as one spot.
 */
export interface Still {
  walk_id: string;
  started_at: number;
  /** Null while the walker is still standing. */
  ended_at: number | null;
}

/** A stretch of a walk the walker paused: nothing is recorded, and it does not count as walking. */
export interface Pause {
  walk_id: string;
  started_at: number;
  /** Null while the walk is paused. */
  ended_at: number | null;
}

/**
 * A stretch filled across a gap in the trace (Filling gaps, G10), as the
 * walker decided it: kept (walked trace, drawn solid) or dismissed (the gap
 * stays a break). Truth, kept with the walk: never cleared by a map update.
 * `t0` and `t1` are the gap's last fix before and first fix after.
 */
export interface GapDecision {
  walk_id: string;
  t0: number;
  t1: number;
  state: 'kept' | 'dismissed';
  /** The line that was kept (or dismissed), from the fix before to the fix after. */
  path: LngLat[];
  length_m: number;
  /** The street most of it ran along, for the card; null when unnamed. */
  street: string | null;
  decided_at: number;
}

/** A stretch read as walked across a gap (filled by itself or kept, G11): what `readTrace` fills in. */
export interface Fill {
  t0: number;
  t1: number;
  path: LngLat[];
}

export interface StreetSegment {
  id: string;
  name: string | null;
  kind_detail: string;
  length_m: number;
  /** One or more lines; a segment runs from one junction (or dead end) to the next. */
  geometry: LngLat[][];
  build: string;
}

export interface VisitedSegment {
  segment_id: string;
  walk_id: string;
  covered_fraction: number;
  first_t: number;
  /** How the street is counted: by name, or by segment id when unnamed. */
  street_key: string;
}

/** Per-walk numbers for the log, written when a walk is snapped. */
export interface WalkSummary {
  walk_id: string;
  build: string;
  /** Walked distance: rides are not walking (R6). */
  distance_m: number;
  /** Ridden distance; absent on summaries written before rides existed. */
  ride_m?: number;
  duration_ms: number;
  new_streets: number;
  streets_walked: number;
  photos: number;
  /** Absent on summaries written before video existed. */
  videos?: number;
  voices: number;
  notes: number;
  /** False when no street could be read for the walk's area (offline, tiles failed). */
  streets_read: boolean;
}
