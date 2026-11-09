// @layer core

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
