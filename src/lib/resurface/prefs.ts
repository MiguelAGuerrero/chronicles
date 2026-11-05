// @layer core
import type { Prefs } from './types';

/** What the user chose (RM20, RM21, RM16). Pure: each change returns a new Prefs. */
export const EMPTY_PREFS: Prefs = { hidden: [], dim: [], less: [], renames: {}, removed: [], lastShown: null, off: false };

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

/** Bring back a moment hidden by Not this one, or set to fewer like this (MC8). */
export const unhideMoment = (p: Prefs, id: string): Prefs => ({ ...p, hidden: p.hidden.filter((x) => x !== id), dim: p.dim.filter((x) => x !== id) });

/** Bring back a removed thread (MC8). */
export const unremoveThread = (p: Prefs, term: string): Prefs => ({ ...p, removed: p.removed.filter((x) => x !== term) });

/** Bring back a softened word (MC8). */
export const restoreWord = (p: Prefs, term: string): Prefs => ({ ...p, less: p.less.filter((x) => x !== term) });

/** The switch (MC9): off means no top card and no Another. */
export const setOff = (p: Prefs, off: boolean): Prefs => (p.off === off ? p : { ...p, off });

/** Forget my choices (MC10): the lists and the renames go; the switch and what was last shown stay. */
export const forgetChoices = (p: Prefs): Prefs => ({ ...EMPTY_PREFS, off: p.off, lastShown: p.lastShown });

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
    // Anything but a real true reads as on: a damaged value never turns Memories off (MC12).
    off: o.off === true,
  };
}

/** One choice, as it was made: the choices before and after it, so Undo can take back that choice alone (audit 2). */
export interface PrefsChange {
  before: Prefs;
  after: Prefs;
  /** False when keeping it failed: it shows for this open and is gone after a reload (audit 10). */
  saved: boolean;
}

const without = (xs: string[], before: string[], after: string[]) => xs.filter((x) => !(after.includes(x) && !before.includes(x)));

/** `current` with only what `change` added taken out again; later choices stay. Pure. */
export function revertChange(current: Prefs, change: { before: Prefs; after: Prefs }): Prefs {
  const { before, after } = change;
  const renames = { ...current.renames };
  for (const k of new Set([...Object.keys(before.renames), ...Object.keys(after.renames)])) {
    if (before.renames[k] === after.renames[k] || current.renames[k] !== after.renames[k]) continue;
    if (before.renames[k] === undefined) delete renames[k];
    else renames[k] = before.renames[k];
  }
  return {
    ...current,
    hidden: without(current.hidden, before.hidden, after.hidden),
    dim: without(current.dim, before.dim, after.dim),
    less: without(current.less, before.less, after.less),
    removed: without(current.removed, before.removed, after.removed),
    renames,
  };
}
