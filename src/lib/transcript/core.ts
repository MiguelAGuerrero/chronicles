// @layer core
/**
 * A voice memo's words (memo transcripts, decision 0166): what the phone read from the recording, kept as a cache
 * beside the memo, never in it. Which memos still need reading, and what a row says. No clock, no engine.
 */
import type { MediaEdit } from '../mediaEdit';
import { voiceSpan } from '../voiceTrim';

/** The words of one memo (a piece): `''` when the engine heard none, so it is not read again. */
export interface Transcript {
  capture_id: string;
  text: string;
  lang: string;
  /** The kept span the words were read from, in ms; null for the whole memo. */
  from_ms: number | null;
  to_ms: number | null;
  made_at: number;
}

/** What the queue needs of a memo: its id, time, stored length (`body`) and edits. */
export interface MemoRef {
  id: string;
  t: number;
  body?: string | null;
  edit?: MediaEdit | null;
}

/** The words as a caption: whitespace collapsed; null for nothing to show. */
export function transcriptCaption(text: string | null | undefined): string | null {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  return s ? s : null;
}

/** The span a read is made from: the kept part of a trimmed memo, null while the whole memo is kept (TX13). */
export function spanOf(m: MemoRef): { from_ms: number; to_ms: number } | null {
  const trim = m.edit?.trim;
  if (!trim) return null;
  const s = voiceSpan(trim, Math.max(0, Number(m.body) || 0));
  return { from_ms: s.startMs, to_ms: s.endMs };
}

/** Whether a row was read from another span than the memo keeps now, so its words are not the memo's (TX13). */
export function isStale(row: Transcript, m: MemoRef): boolean {
  const s = spanOf(m);
  return (row.from_ms ?? null) !== (s?.from_ms ?? null) || (row.to_ms ?? null) !== (s?.to_ms ?? null);
}

/** The memos to read, newest first: those with no row, or a row read from another span. */
export function needsTranscript<M extends MemoRef>(memos: M[], rows: Transcript[]): M[] {
  const byId = new Map(rows.map((r) => [r.capture_id, r]));
  return memos
    .filter((m) => {
      const r = byId.get(m.id);
      return !r || isStale(r, m);
    })
    .sort((a, b) => b.t - a.t);
}

/** A row's words for Chronicle and the caption: none for a missing or empty row. */
export function wordsOfRow(row: Transcript | undefined | null): string | null {
  return transcriptCaption(row?.text);
}

/** A locale as its language and region: `en_US`, `en-US-u-hc-h12` and `EN-us` all read as `en-us`. */
const normalLocale = (l: string) => l.toLowerCase().replace(/_/g, '-').replace(/-u-.*$/, '');

/** Whether the phone has a pack for this locale: the same language counts (en-GB reads on an en-US pack). */
export function localeMatches(installed: string[], lang: string): boolean {
  const want = normalLocale(lang).split('-')[0];
  return installed.some((l) => normalLocale(l).split('-')[0] === want);
}

/** What the phone reported about its recognizer. */
export interface RecognizerFacts {
  os: 'ios' | 'android' | string;
  version: number;
  available: boolean;
  /** The recognizer says it can run on the device itself. */
  onDevice: boolean;
  /** Android: the locales with a pack installed. iOS reports the supported ones, so it is not read there. */
  installed: string[];
  lang: string;
}

/**
 * Whether a memo may be read at all: only where the recognizer runs on the device itself for the memo's locale.
 * iOS asks the default recognizer, which is the device's own locale, the one the memo is read in; Android needs 13
 * (the on-device service) and an installed pack. Below that the default, possibly cloud, recognizer would answer
 * (decision 0166, TX5, TX16).
 */
export function onDeviceReady(f: RecognizerFacts): boolean {
  if (!f.available || !f.onDevice) return false;
  if (f.os === 'android') return f.version >= 33 && localeMatches(f.installed, f.lang);
  return true;
}
