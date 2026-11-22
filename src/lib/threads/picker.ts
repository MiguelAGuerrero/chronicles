// @layer core
import type { Member } from './types';

/** A moment as the picker lists it: its own words, and the place-and-date line a row carries (OT5, OT9). */
export interface PickItem {
  id: string;
  t: number;
  words: string | null;
  context: string;
}

/**
 * What Add to a thread offers (OT5): every moment but the one being connected and any waiting in the Undo window
 * (owner-threads audit 4), newest first, found by its own words or by its place and date (audit 3), a page at a time.
 */
export function filterPicker(items: PickItem[], o: { hidden: ReadonlySet<string>; self: string; query: string; limit: number }): { shown: PickItem[]; more: boolean } {
  const q = o.query.trim().toLowerCase();
  const all = items
    .filter((i) => i.id !== o.self && !o.hidden.has(i.id) && (!q || (i.words ?? '').toLowerCase().includes(q) || i.context.toLowerCase().includes(q)))
    .sort((a, b) => b.t - a.t);
  return { shown: all.slice(0, o.limit), more: all.length > o.limit };
}

/**
 * The thread last added to (thread at capture CT4, decision 0253): the shown thread whose newest membership is the
 * latest. Read from the members alone, so nothing new is stored to know it; null with no thread shown.
 */
export function lastAddedTo(members: readonly Member[], threadIds: ReadonlySet<string>): string | null {
  let best: Member | null = null;
  for (const m of members) if (threadIds.has(m.thread_id) && (!best || m.added_at > best.added_at)) best = m;
  return best ? best.thread_id : null;
}

/** A thread as Add to a thread lists it: its heading, its first words, its newest moment, and whether it holds this one. */
export interface ThreadRow {
  id: string;
  title: string;
  words: string | null;
  latest: number;
  has: boolean;
}

/** A thread found by its name or its heading's words, or its first words (CT5); a blank search finds every one. */
export function threadMatches(row: { title: string; words: string | null }, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || row.title.toLowerCase().includes(q) || (row.words ?? '').toLowerCase().includes(q);
}

/**
 * What the card lists (CT4, CT5): with no search, the thread last added to apart, then the rest by their newest moment;
 * while searching, the matches by their newest moment and no "Last added to".
 */
export function threadChoices<R extends ThreadRow>(rows: readonly R[], o: { query: string; last: string | null }): { last: R | null; rest: R[] } {
  const byLatest = (a: R, b: R) => b.latest - a.latest;
  if (o.query.trim()) return { last: null, rest: rows.filter((r) => threadMatches(r, o.query)).sort(byLatest) };
  const last = rows.find((r) => r.id === o.last) ?? null;
  return { last, rest: rows.filter((r) => r !== last).sort(byLatest) };
}

/**
 * What Back and Escape do on each step of Add to a thread (tend threads T56, NN/g H3): on "Join it with another moment"
 * they return to the threads, so a change of mind keeps the card; on the threads and the name step they close it (a
 * name typed is kept as it goes, thread-at-capture audit 3). While a tap is being stored they do nothing (tend threads
 * audit 1): the join goes on to its name step, and a step back meanwhile would flip the card twice.
 */
export function backFrom(step: 'threads' | 'moment' | 'name', storing = false): 'threads' | 'close' | 'stay' {
  // Only the moment step waits on a write that moves it on; the name step's `storing` stays set and must still close.
  if (storing && step === 'moment') return 'stay';
  return step === 'moment' ? 'threads' : 'close';
}
