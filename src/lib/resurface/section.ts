// @layer core
export type Section = 'memories' | 'walks' | 'days' | 'map' | 'media';

/**
 * Which Chronicle section to be on after the app moved to `path` (RM1).
 * Chronicle opens on Memories: leaving it for another tab or the walk puts it
 * back. A replay or a day opened from a section keeps it, so Back returns to
 * the list it came from. (The first replay after a walk sets Memories itself
 * as it leaves, RM3: the router's pathname carries no query to tell it by.)
 */
export function sectionOnRoute(current: Section, path: string): Section {
  return keepsSection(path) ? current : 'memories';
}

/** A replay, a day or Chronicle itself (`/`, HC1): the app has not been elsewhere, so this is not a new open of Chronicle. */
export function keepsSection(path: string): boolean {
  const p = path.split('?')[0];
  return p.startsWith('/replay/') || p.startsWith('/day/') || p === '/';
}

/** The sheet's lists as the map shows them (`SheetMode['kind']` in `HomeSheet`). */
export type SheetKind = 'summary' | 'walks' | 'days' | 'place' | 'day';

/**
 * The section the sheet names (SB1, SB4): the walks list Walks, the days list Days, the sheet at rest Map. A place's
 * walks and a day's timeline keep the section they were opened from.
 */
export function sectionOfSheet(kind: SheetKind, current: Section): Section {
  if (kind === 'walks' || kind === 'days') return kind;
  if (kind === 'summary') return 'map';
  return current;
}

/** The sheet a section opens (SB2): Walks and Days that list, Map the sheet at rest. */
export function sheetForSection(section: 'walks' | 'days' | 'map'): 'summary' | 'walks' | 'days' {
  return section === 'map' ? 'summary' : section;
}
