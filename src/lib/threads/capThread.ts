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
