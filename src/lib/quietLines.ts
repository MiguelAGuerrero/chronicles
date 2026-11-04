// @layer core
/**
 * Counts said as words (tabs audit U13, the owner's call): nothing is a score,
 * so new streets are a clause in the card's line, never a big number, and the
 * walks list keeps distance and time but counts no new streets. Pure.
 */
import { formatCaptures, formatDistance, formatDuration } from './format';

/** "your first time down Elm Street", or "3 streets new to you"; null when none were new. */
export function newStreetsLine(names: string[]): string | null {
  if (!names.length) return null;
  if (names.length <= 2) return `your first time down ${names.join(' and ')}`;
  return `${names.length} streets new to you`;
}

/** A walks list row's line: the date, distance and time, then what was kept. */
export function walkRowMeta(date: string, s: { distance_m: number; duration_ms: number; photos: number; videos?: number; voices: number; notes: number }): string {
  return [date, formatDistance(s.distance_m), formatDuration(s.duration_ms), formatCaptures(s)].filter(Boolean).join(' · ');
}
