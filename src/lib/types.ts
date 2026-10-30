// The three truth tables (Walk, TracePoint, Capture) are append-only.
// StreetSegment and VisitedSegment are a cache derived from map tiles and
// the trace, and can be dropped and rebuilt at any time.

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

export type CaptureKind = 'photo' | 'voice' | 'text';

export interface Capture {
  id: string;
  walk_id: string;
  t: number;
  lat: number | null;
  lon: number | null;
  kind: CaptureKind;
  /** Native: file:// URI in Documents. Web: a data: URL. */
  file_path: string | null;
  /** Text body for notes; duration in ms for voice memos. */
  body: string | null;
  segment_id: string | null;
}

export interface StreetSegment {
  id: string;
  name: string | null;
  kind_detail: string;
  length_m: number;
  /** One or more lines, as tiles may split a way. */
  geometry: LngLat[][];
}

export interface VisitedSegment {
  segment_id: string;
  walk_id: string;
  covered_fraction: number;
  first_t: number;
}
