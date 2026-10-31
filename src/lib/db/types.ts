import type { Area, WalkArea } from '../areas/types';
import type { Mark, Offered, Place, Recall } from '../discovery/types';
import type { Capture, Pause, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../types';

/**
 * Local-only storage, mirroring the concept doc's tables. Native uses
 * expo-sqlite; web uses IndexedDB. Nothing leaves the device. Writes are
 * serialized so the background recorder and the UI never interleave.
 */
export interface Db {
  createWalk(walk: Walk): Promise<void>;
  updateWalk(id: string, patch: Partial<Omit<Walk, 'id'>>): Promise<void>;
  getWalk(id: string): Promise<Walk | null>;
  listWalks(): Promise<Walk[]>;
  getOpenWalk(): Promise<Walk | null>;

  appendPoints(points: TracePoint[]): Promise<void>;
  getPoints(walkId: string): Promise<TracePoint[]>;

  addCapture(capture: Capture): Promise<void>;
  updateCapture(id: string, patch: Partial<Omit<Capture, 'id'>>): Promise<void>;
  getCaptures(walkId: string): Promise<Capture[]>;
  /** Captures of every walk whose position lies inside the bounds. */
  capturesIn(bounds: [number, number, number, number]): Promise<Capture[]>;

  /** Starts a pause; at most one pause is open per walk. */
  startPause(walkId: string, at: number): Promise<void>;
  /** Ends the walk's open pause, if any. */
  endPause(walkId: string, at: number): Promise<void>;
  getPauses(walkId: string): Promise<Pause[]>;

  /** Caches street segments derived outside a snap (streets around the walker). */
  putSegments(segments: StreetSegment[]): Promise<void>;

  /**
   * Stores freshly derived segments, the walk's visited rows and summary in one
   * transaction. With `placed`, the walk's area rows are replaced too, and
   * areas no walk refers to any more are dropped; without it (the place points
   * could not be read) the walk keeps the areas it had.
   */
  saveSnap(
    walkId: string,
    segments: StreetSegment[],
    visited: VisitedSegment[],
    summary: WalkSummary,
    placed?: { areas: Area[]; rows: WalkArea[] } | null,
    /** False leaves the walk unmarked (snapped_build null), so its next replay snaps it again. */
    complete?: boolean,
  ): Promise<void>;
  /** Every area any walk was placed in. */
  listAreas(): Promise<Area[]>;
  /** Every walk's area rows: what the places view is built from. */
  listWalkAreas(): Promise<WalkArea[]>;
  /** Cached segments whose geometry touches the bounds. */
  getSegmentsIn(bounds: [number, number, number, number]): Promise<StreetSegment[]>;
  getVisited(walkId: string): Promise<VisitedSegment[]>;
  /** Every segment id any walk has credited. */
  visitedSegmentIds(): Promise<Set<string>>;
  /** Street keys visited by walks that started before `startedAt`. */
  streetKeysBefore(startedAt: number): Promise<Set<string>>;
  listSummaries(): Promise<WalkSummary[]>;

  /** Caches places read from the tiles (v1 discovery); same key, newer row. */
  putPlaces(places: Place[]): Promise<void>;
  /** Cached places inside the bounds. */
  placesIn(bounds: [number, number, number, number]): Promise<Place[]>;
  /** Records places as offered. Offered is truth and is never cleared. */
  addOffered(rows: Offered[]): Promise<void>;
  /** Every place ever offered, by scan or ambient. */
  listOffered(): Promise<Offered[]>;
  /**
   * A scan's result in one transaction: the replaced marks are marked so, the
   * new ones stored, and their places recorded as offered (S6, S10).
   */
  saveScan(scan: { replace: string[]; marks: Mark[]; offered: Offered[] }): Promise<void>;
  /** A walk's marks; `null` gives the home's (no walk yet). */
  listMarks(walkId: string | null): Promise<Mark[]>;
  updateMark(id: string, patch: Partial<Omit<Mark, 'id'>>): Promise<void>;
  /** Remind me here on a capture (R1): sets or replaces its flag. */
  setRecall(r: Recall): Promise<void>;
  /** Stop reminding me, or a "once" that fired (R6, R8). */
  clearRecall(captureId: string): Promise<void>;
  listRecalls(): Promise<Recall[]>;

  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
  /**
   * Drops the derived stores (`DERIVED_STORES`: street segments, places) and marks every walk for re-snapping. Run
   * when the tile build changes: history is recomputed from the trace, never
   * patched. Each walk's visited rows and summary stay until its re-snap
   * replaces them, so the log and new-street counts keep working meanwhile.
   */
  purgeDerived(): Promise<void>;
}
