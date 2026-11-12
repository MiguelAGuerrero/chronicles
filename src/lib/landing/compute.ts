// @layer core
import type { ActivityPoint } from '../activity/points';
import type { PlaceCandidate } from '../areas/types';
import type { Place } from '../discovery/types';
import type { LngLat, StreetSegment } from '../types';
import type { AreaAnalysis } from './analyze';

/** What a read hands the compute (DC13): the tiles' bytes as fetched, and what Overture and the archive gave. */
export interface ComputeInput {
  bodies: ArrayBuffer[];
  tiles: [number, number][];
  zoom: number;
  build: string;
  overturePoints: ActivityPoint[];
  archivePlaces: Place[] | null;
  /** When set, the area is measured around it (What's good here, the Busy layer); otherwise not (a quiet walk's read). */
  analyzeAt: LngLat | null;
}

export interface ComputeOutput {
  segments: StreetSegment[];
  /** The map's own places, as stored (L2). */
  tilePlaces: Place[];
  /** The map's and the archive's places, refined (PW8, PW13, PC21). */
  places: Place[];
  points: ActivityPoint[];
  towns: PlaceCandidate[];
  transit: LngLat[];
  analysis: AreaAnalysis | null;
}

/** Everything a read derives from its tiles, on whichever thread runs it (DC13). Not built yet. */
export function computeRead(_input: ComputeInput): ComputeOutput {
  throw new Error('computeRead: not built (explore-dense-city DC13)');
}

/** The same, awaiting `pause` between tiles and between stages so a JS thread can draw (DC11). Not built yet. */
export async function computeReadPaced(_input: ComputeInput, _pause: () => Promise<void>): Promise<ComputeOutput> {
  throw new Error('computeReadPaced: not built (explore-dense-city DC11)');
}

/** The worker's side of the exchange: a message in, a message out (DC7). Not built yet. */
export function handleComputeMessage(_data: unknown): { ok: true; out: ComputeOutput } | { ok: false; error: string } {
  throw new Error('handleComputeMessage: not built (explore-dense-city DC7)');
}
