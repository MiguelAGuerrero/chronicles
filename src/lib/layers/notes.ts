// @layer core
import type { WalkStatus } from '../walk/layer';

/** The quiet line under a layer while it works or can't (layers audit 7): in words, and never for a layer that is off. */
export function layerNotes(s: { walkability: WalkStatus; busyReading: boolean; busyFailed: boolean; dark?: WalkStatus; darkWords?: string | null }): Record<string, string | null> {
  const status = (st: WalkStatus | undefined) => (st === 'reading' ? 'Reading…' : st === 'unavailable' ? 'Not available now' : st === 'waiting' ? 'Waiting for your position' : null);
  return {
    walkability: status(s.walkability),
    busy: s.busyReading ? 'Reading…' : s.busyFailed ? 'Not available now' : null,
    // After dark (DK1, DK5, DK14): while it reads or can't, the status; drawn, the reading's words, and always what it is from.
    dark: status(s.dark) ?? (s.dark === 'ready' && s.darkWords ? `${s.darkWords}. Only what is mapped.` : null),
  };
}
