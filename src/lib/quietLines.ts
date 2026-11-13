// @layer core
/**
 * Counts said as words (tabs audit U13, the owner's call): nothing is a score,
 * so new streets are a clause in the card's line, never a big number, and the
 * walks list keeps distance and time but counts no new streets. Pure.
 */
import { formatCaptures, formatDistance, formatDuration } from './format';
import type { Star } from './places';
import { numberWord } from './resurface/lines';

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

/**
 * A walks list row as a screen reader says it (tend chronicle 2): the title, what the row shows under it,
 * and the walk's one line. The web drops a hint, so all of it is the name.
 */
export function walkRowSpoken(title: string, meta: string, epilogue: string | null): string {
  const line = epilogue?.trim();
  return [`Replay ${title}`, meta.split(' · ').join(', '), line ? `“${line}”` : null].filter(Boolean).join('. ');
}

/** A day's timeline entry for a walk as a screen reader says it (tend chronicle 3): its time, the title it shows, its line. */
export function timelineWalkSpoken(clock: string, title: string, line: string): string {
  return `${[clock, title, ...line.split(' · ')].join(', ')}. Replay it`;
}

/**
 * Chronicle's peek with nothing walked (decision 0148, from /tend inbox T10; amends 0050's U7): one way to act,
 * and a line that is true while you walk. With nothing open, how walks get here and Navigate (the section bar
 * holds Days); with a walk open, that this walk is starred when it ends, and no button: the recording bar's › is
 * the way back.
 */
export function emptyPeek(walkOpen: boolean): { line: string; navigate: boolean } {
  return walkOpen
    ? { line: 'This walk is starred here when it ends', navigate: false }
    : { line: 'Walk somewhere and it is starred here', navigate: true };
}

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const walksWord = (n: number) => `${numberWord(n)} ${n === 1 ? 'walk' : 'walks'}`;

/**
 * A walked place's star as a screen reader says it (tend places T15, decision 0154: the star draws no numeral): one
 * place by its name and its walks in words, then what a tap does, "Fox Point, two walks. Open" (tend places audit 5);
 * places merged at this zoom by how many, in words, "Three places, two walks. Zoom in", as a pin says its kinds
 * before its "Open".
 */
export function starSpoken(star: Pick<Star, 'label' | 'walkIds' | 'count'>): string {
  const walks = walksWord(star.walkIds.length);
  return star.count > 1 ? `${capFirst(numberWord(star.count))} places, ${walks}. Zoom in` : `${star.label}, ${walks}. Open`;
}
