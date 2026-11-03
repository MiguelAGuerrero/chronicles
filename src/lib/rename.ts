import type { Walk } from './types';
import { suggestTitle } from './walkTitle';

/** As the first replay's Name it: 60 characters for the title, 200 for its one line. */
export const TITLE_MAX = 60;
export const EPILOGUE_MAX = 200;

/**
 * What a rename writes (QL23): only the title and the one line, trimmed and
 * cut to their lengths. An empty title becomes the suggested one; an empty
 * line becomes none.
 */
export function renamePatch(walk: Walk, title: string | null, epilogue: string | null): { title: string; epilogue: string | null } {
  const t = (title ?? '').trim().slice(0, TITLE_MAX).trim();
  const e = (epilogue ?? '').trim().slice(0, EPILOGUE_MAX).trim();
  return { title: t || suggestTitle(walk), epilogue: e || null };
}
