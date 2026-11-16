// @layer core
import type { WalkStatus } from '../walk/layer';

/** The quiet line under a layer while it works or can't (layers audit 7): in words, and never for a layer that is off. */
export function layerNotes(s: { walkability: WalkStatus; busyReading: boolean; busyFailed: boolean }): Record<string, string | null> {
  const walk = s.walkability;
  return {
    walkability: walk === 'reading' ? 'Reading…' : walk === 'unavailable' ? 'Not available now' : walk === 'waiting' ? 'Waiting for your position' : null,
    busy: s.busyReading ? 'Reading…' : s.busyFailed ? 'Not available now' : null,
  };
}
