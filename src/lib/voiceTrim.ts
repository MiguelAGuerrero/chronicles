// @layer core
/**
 * A voice memo's kept part (VT6-VT12, decision 0090): the trim is data on the untouched recording, so every
 * surface that plays a memo or says its length asks here. No player, no clock.
 */
import { formatElapsed } from './format';
import { isFullTrim, type MediaEdit, type Trim } from './mediaEdit';

export interface VoiceSpan { startMs: number; endMs: number; lengthMs: number }
export type VoiceState = 'before' | 'inside' | 'end';
/** What a memo is read from: its length in ms as text (`body`) and its edits. */
export type Memo = { body?: string | null; edit?: MediaEdit | null };

/** A player this close to the end (ms) has finished: the platforms report positions in steps. */
const END_SLACK_MS = 50;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The part of a memo that plays: the whole of it with no trim, else the trim inside the memo's length. */
export function voiceSpan(trim: Trim | null | undefined, durationMs: number): VoiceSpan {
  const dur = Math.max(0, durationMs || 0);
  if (!trim) return { startMs: 0, endMs: dur, lengthMs: dur };
  const startMs = clamp(trim.start_ms, 0, dur);
  const endMs = clamp(trim.end_ms, startMs, dur);
  return { startMs, endMs, lengthMs: endMs - startMs };
}

/** The player's position (s) as a time inside the kept part, never outside it. */
export function voiceClock(posS: number, span: VoiceSpan): { atMs: number; ofMs: number } {
  return { atMs: clamp(Math.round(posS * 1000) - span.startMs, 0, span.lengthMs), ofMs: span.lengthMs };
}

/** Where a position stands against the kept part: before it (seek to the start), inside it, or at its end (finished). */
export function voiceState(posS: number, span: VoiceSpan): VoiceState {
  const ms = posS * 1000;
  if (ms < span.startMs - 1) return 'before';
  return ms >= span.endMs - END_SLACK_MS ? 'end' : 'inside';
}

const wholeMs = (m: Memo) => Math.max(0, Number(m.body) || 0);

/** The length a memo is said to have: the kept part's (VT10). 0 when it has none on record. */
export const memoLengthMs = (m: Memo): number => voiceSpan(m.edit?.trim, wholeMs(m)).lengthMs;

/** "Voice memo, 0:39": the words wherever a memo is listed (VT10). */
export function memoWords(m: Memo): string {
  const len = memoLengthMs(m);
  return len > 0 ? `Voice memo, ${formatElapsed(len)}` : 'Voice memo';
}

/** "Trimmed · 0:39 of 0:58" for a memo with a trim, else none (VT11): times, never a badge. */
export function trimmedLine(m: Memo): string | null {
  const whole = wholeMs(m);
  const trim = m.edit?.trim ?? null;
  if (!trim || whole <= 0 || isFullTrim(trim, whole)) return null;
  // vision-ok: two times of one memo (kept, whole), never a tally of places, streets or finds
  return `Trimmed · ${formatElapsed(memoLengthMs(m))} of ${formatElapsed(whole)}`;
}

// Stubs for the audit's tests first; the fixes follow.
export const voiceReachedEnd = (_posS: number, _span: VoiceSpan, _restarting: boolean): boolean => todo();
export const wholeMs = (_bodyMs: string | null | undefined, _fileMs: number): number => todo();
export const memoLengthText = (_m: Memo): string | null => todo();
