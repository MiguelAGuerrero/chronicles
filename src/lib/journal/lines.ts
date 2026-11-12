// @layer core
import type { CaptureKind } from '../types';

/**
 * Every line the journal writes in the app's voice (chronicle journal JN2, JN4, JN5, JN23): the day's heading,
 * an entry's dateline, what an entry says to a screen reader. Its only digits are dates and times.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** A fix is given this long to arrive before an unplaced entry says "No location" (the locate's own limit is 10 s). */
export const FIX_WAIT_MS = 60_000;

/** What is known of where an entry was made (JN5). */
export interface DatelineInput {
  t: number;
  now: number;
  /** Whether the moment has a fix. */
  placed: boolean;
  /** Its place and how far into its walk, once its context is read; null until then. */
  context: { place: string | null; into: string | null } | null;
  /** Why no fix came, when the screen was told. */
  reason?: 'denied' | 'timeout' | 'unavailable' | null;
  /** Its walk is still being recorded: unplaced, it waits for the trace, which places it at Stop (audit 3). */
  onOpenWalk?: boolean;
}

const sameDay = (a: number, b: number) => {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

/** "Thursday, November 12"; a day of another year carries its year (JN2). */
export function dayHeading(t: number, now: number): string {
  const d = new Date(t);
  const base = `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

const hourMinute = (t: number) => {
  const d = new Date(t);
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** "8:15 am", by the phone's clock. */
export function clockTime(t: number): string {
  return `${hourMinute(t)} ${new Date(t).getHours() < 12 ? 'am' : 'pm'}`;
}

/** Today's entries say the part of the day: "8:15 this morning", "9:40 tonight" (JN5). */
function todayTime(t: number): string {
  const h = new Date(t).getHours();
  const part = h < 12 ? 'this morning' : h < 17 ? 'this afternoon' : h < 21 ? 'this evening' : 'tonight';
  return `${hourMinute(t)} ${part}`;
}

/** The dateline (JN5): the time, then the place once read, and how far into the walk; never a place that was not read. */
export function dateline(o: DatelineInput): string {
  const when = sameDay(o.t, o.now) ? todayTime(o.t) : clockTime(o.t);
  if (!o.placed) {
    // Until the fix could have come, no claim either way; told why, or after its time, it says so.
    const waited = !o.onOpenWalk && (o.reason != null || o.now - o.t > FIX_WAIT_MS);
    const none = !waited ? null : o.reason === 'denied' ? 'No location (location is off)' : 'No location';
    return [when, none, o.context?.into ?? null].filter(Boolean).join(' · ');
  }
  return [when, o.context?.place ?? null, o.context?.into ?? null].filter(Boolean).join(' · ');
}

const KIND_WORD: Record<CaptureKind, string> = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' };

/** What an entry says about itself to a screen reader (JN23): its kind, its words, its dateline. */
export function entrySpoken(kind: CaptureKind, words: string | null, line: string, more: boolean): string {
  return [KIND_WORD[kind], more ? 'with more in this moment' : null, words, line].filter(Boolean).join(', ');
}

/** The open line's names for a screen reader (JN10). */
export const LINE_LABELS = { write: 'Write an entry', photo: 'Add a photo or video', voice: 'Record a voice note' };
/** Said above the keyboard while an entry is being written (JN13). */
export const KEPT_AS_YOU_WRITE = 'Kept as you write';
/** Said in its place when a save failed (JN13). */
export const NOT_KEPT = 'Not kept yet';
