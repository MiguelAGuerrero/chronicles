// @layer core
import type { Walk } from './types';
import { suggestTitle } from './walkTitle';

/** As the first replay's Name it: 60 characters for the title, 200 for its one line. */
export const TITLE_MAX = 60;
export const EPILOGUE_MAX = 200;

/**
 * What a rename or the first replay's Keep it writes (QL23, tend chronicle T1): only the title and the
 * one line, trimmed and cut to their lengths. A title is stored only when its words differ from the
 * suggested one at save: an empty title, or the suggestion kept as it was, is no title, shown as the
 * suggestion, so it follows the walk when its area is read later. An empty line becomes none.
 */
export function renamePatch(walk: Walk, title: string | null, epilogue: string | null): { title: string | null; epilogue: string | null } {
  const t = (title ?? '').trim().slice(0, TITLE_MAX).trim();
  const e = (epilogue ?? '').trim().slice(0, EPILOGUE_MAX).trim();
  return { title: t && t !== suggestTitle(walk) ? t : null, epilogue: e || null };
}
