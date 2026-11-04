// @layer core
import type { RecorderStatus } from './recorder/types';

/**
 * Whether the walk screen should start the recorder again now that the app is back in
 * front (QL20): only when recording stopped against the walker's intent (location denied,
 * then perhaps allowed in Settings), on an open walk that isn't paused. A paused walk
 * records nothing on purpose; Resume is its way back, and asks for location itself.
 * Pure; the screen makes one attempt per return.
 */
export function retryRecorder(status: RecorderStatus, paused: boolean, open: boolean): boolean {
  return open && !paused && status.kind === 'error';
}
