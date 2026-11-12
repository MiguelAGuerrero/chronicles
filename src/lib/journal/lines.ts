// @layer core
import type { CaptureKind } from '../types';

/**
 * Every line the journal writes in the app's voice (chronicle journal JN2, JN4, JN5, JN23): the day's heading,
 * an entry's dateline, what an entry says to a screen reader. Its only digits are dates and times.
 */

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
}

/** "Thursday, November 12"; a day of another year carries its year (JN2). */
export function dayHeading(_t: number, _now: number): string {
  return '';
}

/** "8:15 am", by the phone's clock. */
export function clockTime(_t: number): string {
  return '';
}

/** The dateline (JN5): the time, then the place once read, and how far into the walk; never a place that was not read. */
export function dateline(_o: DatelineInput): string {
  return '';
}

/** What an entry says about itself to a screen reader (JN23): its kind, its words, its dateline. */
export function entrySpoken(_kind: CaptureKind, _words: string | null, _line: string, _more: boolean): string {
  return '';
}

/** The open line's names for a screen reader (JN10). */
export const LINE_LABELS = { write: '', photo: '', voice: '' };
/** Said above the keyboard while an entry is being written (JN13). */
export const KEPT_AS_YOU_WRITE = '';
/** Said in its place when a save failed (JN13). */
export const NOT_KEPT = '';
