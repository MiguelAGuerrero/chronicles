// @layer core
import type { Member } from './types';

/**
 * Thread a moment as it is kept (specs/threading-at-capture, TK1-TK11, decision 0253): the card's decisions and every
 * word it and the pill say. No digit but a date leaves here (TK9).
 */
export const CAP_THREAD = {
  /** The pill's Thread, spoken (TK1, TK2). */
  thread: 'Add this moment to a thread',
  last: 'Last added to',
  search: 'Search threads and moments',
  threads: 'Threads',
  moments: 'Moments',
  none: 'Nothing matches.',
  connected: 'Connected',
  made: 'The two moments are a thread now.',
  nameLabel: 'Name this thread (optional)',
  unnamed: 'Leave it unnamed',
  done: 'Done',
  inIt: 'This moment is in it',
  failed: 'Could not connect',
  nameFailed: 'Could not name it',
} as const;

/**
 * The thread last added to (TK4): the one holding the newest `added_at` among the threads shown, read from truth;
 * nothing is stored for it. A tie goes to the lower id, so the first row never flickers between two.
 */
export function lastAddedTo(members: readonly Member[], shown: ReadonlySet<string>): string | null {
  let best: Member | null = null;
  for (const m of members) {
    if (!shown.has(m.thread_id)) continue;
    if (!best || m.added_at > best.added_at || (m.added_at === best.added_at && m.thread_id < best.thread_id)) best = m;
  }
  return best?.thread_id ?? null;
}

/** Threads found by their heading (the owner's name, or a place and date) or its first words (TK5). */
export function threadSearch<T extends { title: string; sub: string | null }>(rows: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => r.title.toLowerCase().includes(q) || (r.sub ?? '').toLowerCase().includes(q));
}

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;

/** What a picker row shows (TK7): a photo or video's picture beside its words, or the kind's word; never the picture alone. */
export function rowShows(kind: keyof typeof KIND_WORD, words: string | null): { picture: boolean; words: string } {
  const w = words?.trim();
  return { picture: kind === 'photo' || kind === 'video', words: w ? w.slice(0, 90) : KIND_WORD[kind] };
}

/** The name the step saves (TK8): what was typed, trimmed; nothing typed names nothing. */
export function nameToSave(typed: string): string | null {
  const t = typed.trim();
  return t ? t : null;
}

/** A moment waiting in the Undo window is not threaded (threading-at-capture audit 1): it would make a thread nobody sees. */
export function threadable(momentId: string, hidden: ReadonlySet<string>): boolean {
  return !hidden.has(momentId);
}

/**
 * The first step's rows, top to bottom as drawn (TK4, steward S4): the thread last added to, A new thread, the other
 * threads. None until the moments are read (threading-at-capture audit 3): a row inserted above A new thread once they
 * arrive would move under the thumb.
 */
export function firstStep(o: { loaded: boolean; last: string | null; others: readonly string[] }): string[] {
  if (!o.loaded) return [];
  return [...(o.last ? [`last:${o.last}`] : []), 'new', ...o.others.map((id) => `thread:${id}`)];
}

/** The card from the pill gives way to the editor of a capture kept meanwhile (audit 4): never a Modal over a Modal. */
export function cardFor(threading: string | null, editorOpen: boolean): string | null {
  return editorOpen ? null : threading;
}

/**
 * What Back and Escape do on each step (threading-at-capture audit 5, ui 2): the moment step returns to the threads
 * (NN/g H3); the name step finishes as Leave it unnamed does, the thread being made; the threads step closes.
 */
export function backFrom(step: 'threads' | 'moment' | 'name'): 'close' | 'threads' | 'finish' {
  return step === 'moment' ? 'threads' : step === 'name' ? 'finish' : 'close';
}
