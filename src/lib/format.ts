// @layer core
/** Distances and times as the screens show them. Pure, so tests and the recording bar can use them. */
import { getUnits, type Units } from './units';

const FT_M = 0.3048;
const MI_M = 1609.344;
/** Whole feet up to here; a tenth of a mile. */
const MI_FROM_FT = 528;

/**
 * "450 m" and "1.2 km", or in miles (QL14) whole feet under 0.1 mi ("450 ft")
 * and miles with one decimal from there ("0.1 mi", "1.2 mi"). Reads the
 * units setting unless given.
 */
export function formatDistance(m: number, units: Units = getUnits()): string {
  if (units === 'mi') {
    const ft = Math.round(m / FT_M);
    return ft < MI_FROM_FT ? `${ft} ft` : `${(m / MI_M).toFixed(1)} mi`;
  }
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** m:ss under ten minutes, so a just-started walk visibly counts; minutes after. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return formatDuration(ms);
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return `${Math.max(0, Math.round(ms / 1000))} s`;
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

/** "2 photos · 1 video · 1 note", leaving out kinds with none. */
export function formatCaptures(c: { photos: number; videos?: number; voices: number; notes: number }): string {
  const parts: string[] = [];
  if (c.photos) parts.push(`${c.photos} ${c.photos === 1 ? 'photo' : 'photos'}`);
  if (c.videos) parts.push(`${c.videos} ${c.videos === 1 ? 'video' : 'videos'}`);
  if (c.voices) parts.push(`${c.voices} ${c.voices === 1 ? 'voice memo' : 'voice memos'}`);
  if (c.notes) parts.push(`${c.notes} ${c.notes === 1 ? 'note' : 'notes'}`);
  return parts.join(' · ');
}
