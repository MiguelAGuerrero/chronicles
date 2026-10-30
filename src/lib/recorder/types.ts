import type { TracePoint } from '../types';

export interface RecorderCapabilities {
  /** Keeps recording with the screen off or the app in the background. */
  background: boolean;
}

export interface Recorder {
  capabilities: RecorderCapabilities;
  /** Starts writing fixes for the walk; resolves once permission is settled. */
  start(walkId: string): Promise<void>;
  stop(): Promise<void>;
  /** Re-attaches to a walk left open when the app died. */
  resume(walkId: string): Promise<void>;
  isRecording(): boolean;
  subscribe(cb: (p: TracePoint) => void): () => void;
}
