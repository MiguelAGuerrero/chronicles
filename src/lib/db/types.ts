import type { Capture, StreetSegment, TracePoint, VisitedSegment, Walk } from '../types';

/**
 * Local-only storage, mirroring the concept doc's tables. Native uses
 * expo-sqlite; web uses IndexedDB. Nothing leaves the device.
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

  putSegments(segments: StreetSegment[]): Promise<void>;
  /** Cached segments whose geometry touches the bounds. */
  getSegmentsIn(bounds: [number, number, number, number]): Promise<StreetSegment[]>;
  /** Replaces the visited rows for a walk; derived data is recomputed, never patched. */
  setVisited(walkId: string, rows: VisitedSegment[]): Promise<void>;
  getVisited(walkId?: string): Promise<VisitedSegment[]>;
}
