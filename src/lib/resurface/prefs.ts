// @layer core
import type { Prefs } from './types';

/** What the user chose (RM20, RM21, RM16). Pure: each change returns a new Prefs. */
export const EMPTY_PREFS: Prefs = { hidden: [], dim: [], less: [], renames: {}, removed: [], lastShown: null };

const add = (xs: string[], ...more: string[]) => [...new Set([...xs, ...more])];

/** Not this one: never resurfaced. The moment stays in Lately and in its walk. */
export const hideMoment = (p: Prefs, id: string): Prefs => ({ ...p, hidden: add(p.hidden, id) });

/** Show less like this: the moment's terms, and the moment itself, come up less. */
export const lessLike = (p: Prefs, id: string, terms: string[]): Prefs => ({ ...p, dim: add(p.dim, id), less: add(p.less, ...terms) });

/** A thread's own name. An empty name goes back to the user's word. */
export function renameThread(p: Prefs, term: string, name: string): Prefs {
  const renames = { ...p.renames };
  const n = name.trim();
  if (n) renames[term] = n;
  else delete renames[term];
  return { ...p, renames };
}

/** Not a thread: the term is never offered again. */
export const removeThread = (p: Prefs, term: string): Prefs => ({ ...p, removed: add(p.removed, term) });

export const shown = (p: Prefs, id: string): Prefs => (p.lastShown === id ? p : { ...p, lastShown: id });

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Reads a stored value; a missing or damaged field is empty, never a crash. */
export function parsePrefs(v: unknown): Prefs | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const renames: Record<string, string> = {};
  if (typeof o.renames === 'object' && o.renames !== null && !Array.isArray(o.renames)) {
    for (const [k, val] of Object.entries(o.renames)) if (typeof val === 'string') renames[k] = val;
  }
  return {
    hidden: isStrings(o.hidden) ? o.hidden : [],
    dim: isStrings(o.dim) ? o.dim : [],
    less: isStrings(o.less) ? o.less : [],
    renames,
    removed: isStrings(o.removed) ? o.removed : [],
    lastShown: typeof o.lastShown === 'string' ? o.lastShown : null,
  };
}
