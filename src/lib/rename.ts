// @layer core
import type { Walk } from './types';
import { suggestTitle } from './walkTitle';

/** As the first replay's Name it: 60 characters for the title, 200 for its one line. */
export const TITLE_MAX = 60;
export const EPILOGUE_MAX = 200;

const cut = (s: string, max: number) => s.trim().slice(0, max).trim();

/**
 * What a rename or the first replay's Keep it writes (QL23, tend chronicle T1): only the title and the
 * one line, trimmed and cut to their lengths. A title is stored only when its words differ from the
 * suggested one at save: an empty title, or the suggestion kept as it was, is no title, shown as the
 * suggestion, so it follows the walk when its area is read later. `offered` is the suggestion the field
 * was filled with, when it was a suggestion: the walk's area can change while the field is open (a gap
 * kept on the card), and the words offered then are not the person's either (tend chronicle audit 1).
 * Both are compared as cut to the field's length, so a long suggestion kept is not stored cut (audit 2).
 * An empty line becomes none.
 */
export function renamePatch(
  walk: Walk,
  title: string | null,
  epilogue: string | null,
  offered: string | null = null,
): { title: string | null; epilogue: string | null } {
  const t = cut(title ?? '', TITLE_MAX);
  const e = cut(epilogue ?? '', EPILOGUE_MAX);
  const suggested = [suggestTitle(walk), offered].filter((s): s is string => !!s).map((s) => cut(s, TITLE_MAX));
  return { title: t && !suggested.includes(t) ? t : null, epilogue: e || null };
}

/** The words Rename opens with (QL22): the stored title, else the suggestion, and the stored line. */
export function renameFields(walk: Walk): { title: string; epilogue: string } {
  return { title: walk.title ?? suggestTitle(walk), epilogue: walk.epilogue ?? '' };
}

/**
 * Whether stepping out of Rename by a tap outside, Escape or Back asks first (decision 0172, O17, as the media
 * editor's Close does): when Save would store other words than the editor opened with. Both are read through
 * `renamePatch`, so spaces at either end, or a suggestion kept or cleared, close at once. `offered` is the suggestion
 * the field was filled with, as `renamePatch` takes it (the first replay's Name it, tend replay 15).
 */
export function renameChanged(walk: Walk, title: string, epilogue: string, offered: string | null = null): boolean {
  const opened = renameFields(walk);
  const was = renamePatch(walk, opened.title, opened.epilogue, offered);
  const now = renamePatch(walk, title, epilogue, offered);
  return was.title !== now.title || was.epilogue !== now.epilogue;
}
