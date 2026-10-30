import type { TracePoint } from '../types';

export interface RecorderCapabilities {
  /** Keeps recording with the screen off or the app in the background. */
  background: boolean;
}

export type RecorderStatus =
  | { kind: 'idle' }
  /** Recording; positions are arriving. */
  | { kind: 'recording' }
  /** Recording, but no position has arrived yet (indoors, cold start). */
  | { kind: 'waiting' }
  /** Recording has stopped against the user's intent. */
  | { kind: 'error'; message: string; openSettings?: boolean };

/** A start that cannot go ahead; `openSettings` means only the system settings can fix it. */
export class RecorderError extends Error {
  constructor(message: string, readonly openSettings = false) {
    super(message);
  }
}

export interface StartResult {
  /** Recording works, but with a limitation the user should know about. */
  warning?: string;
}

export interface Recorder {
  capabilities: RecorderCapabilities;
  /** Starts writing fixes for the walk; resolves once permission is settled. Throws RecorderError. */
  start(walkId: string): Promise<StartResult>;
  stop(): Promise<void>;
  /** Re-attaches to a walk left open when the app died or the page reloaded. */
  resume(walkId: string): Promise<void>;
  isRecording(): boolean;
  subscribe(cb: (p: TracePoint) => void): () => void;
  subscribeStatus(cb: (s: RecorderStatus) => void): () => void;
}
