import type { LngLat, TracePoint } from '../types';

export interface RecorderCapabilities {
  /** Keeps recording with the screen off or the app in the background. */
  background: boolean;
  /** Can drive a fake walker toward points tapped on the map. */
  simulate: boolean;
}

export type RecorderSource = 'gps' | 'simulated';

export interface Recorder {
  capabilities: RecorderCapabilities;
  /** Starts writing fixes for the walk; resolves once permission is settled. */
  start(walkId: string, source?: RecorderSource): Promise<void>;
  stop(): Promise<void>;
  /** Re-attaches to a walk left open when the app died. */
  resume(walkId: string): Promise<void>;
  isRecording(): boolean;
  subscribe(cb: (p: TracePoint) => void): () => void;
  /** Clock for stamping captures; runs ahead of wall time while simulating. */
  now(): number;
  /** Simulation only: walk toward this point. */
  walkTo?(target: LngLat): void;
}
