// @layer core
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
  /**
   * Recording has stopped against the user's intent. `tone: 'info'` when location is refused, a choice the person
   * made, so the walk's notice is quiet rather than a fault (T26).
   */
  | { kind: 'error'; message: string; openSettings?: boolean; tone?: 'info' | 'error' };

/**
 * A start that cannot go ahead; `openSettings` means only the system settings can fix it; `tone: 'info'` that the
 * person refused location, said as a quiet notice (T26), not a fault.
 */
export class RecorderError extends Error {
  constructor(message: string, readonly openSettings = false, readonly tone: 'info' | 'error' = 'error') {
    super(message);
  }
}

/** What a screen shows for a start that failed: `tone: 'info'` a refusal of location, said quietly (T26); else a fault. */
export type StartError = { message: string; openSettings?: boolean; tone?: 'info' | 'error' };

/** A failed start as the screen shows it (tend recording audit 5): a recorder's refusal keeps its tone and Open Settings. */
export function startErrorFrom(e: unknown): StartError {
  if (e instanceof RecorderError) return { message: e.message, openSettings: e.openSettings, tone: e.tone };
  return { message: e instanceof Error ? e.message : String(e), openSettings: false, tone: 'error' };
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
