// @layer core
import type { MomentView, Prefs } from './types';

/** What Hidden lists (MC8): moments hidden or set to fewer, removed threads, softened words. */
export interface HiddenItems {
  moments: { id: string; mode: 'hidden' | 'fewer' }[];
  threads: string[];
  words: string[];
}

/**
 * The owner's choices as a list they can read and undo (MC8). A moment that has since been deleted is not listed;
 * a moment both hidden and set to fewer is listed once, as hidden. Pure.
 */
export function hiddenItems(prefs: Prefs, moments: MomentView[]): HiddenItems {
  const kept = new Set(moments.map((m) => m.id));
  const hidden = prefs.hidden.filter((id) => kept.has(id));
  const fewer = prefs.dim.filter((id) => kept.has(id) && !prefs.hidden.includes(id));
  return {
    moments: [...hidden.map((id) => ({ id, mode: 'hidden' as const })), ...fewer.map((id) => ({ id, mode: 'fewer' as const }))],
    threads: [...prefs.removed],
    words: [...prefs.less],
  };
}
