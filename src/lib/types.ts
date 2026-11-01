// The three truth tables (Walk, TracePoint, Capture) are append-only, apart
// from the walk's own fields and a capture's placement at stop. Everything
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

export type CaptureKind = 'photo' | 'video' | 'voice' | 'text';

export interface Capture {
  id: string;
  /** The walk it was made on; null for a moment made outside any walk. */
  walk_id: string | null;
  t: number;
  lat: number | null;
  lon: number | null;
  kind: CaptureKind;
  /**
   * Media reference, resolved to a playable URI by lib/media. Native: a path
   * relative to the app's Documents folder. Web: a key in the media store.
   */
  file_path: string | null;
  /** Text body for notes; duration in ms for voice memos and videos. */
  body: string | null;
  segment_id: string | null;
  /** A photo's caption, drawn as a bar over it; the photo file itself is untouched. */
  caption?: string | null;
  /** Where the caption bar sits, as a fraction of the photo's height from the top. */
  caption_y?: number | null;
}

/** A stretch of a walk the walker paused: nothing is recorded, and it does not count as walking. */
export interface Pause {
  walk_id: string;
  started_at: number;
  /** Null while the walk is paused. */
  ended_at: number | null;
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
  distance_m: number;
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
