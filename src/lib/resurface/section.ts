// @layer core
export type Section = 'memories' | 'walks' | 'days' | 'map';

/**
 * Which Chronicle section to be on after the app moved to `path` (RM1).
 * Chronicle opens on Memories: leaving it for another tab or the walk puts it
 * back. A replay or a day opened from a section keeps it, so Back returns to
 * the list it came from. (The first replay after a walk sets Memories itself
 * as it leaves, RM3: the router's pathname carries no query to tell it by.)
 */
export function sectionOnRoute(current: Section, path: string): Section {
  const p = path.split('?')[0];
  if (p.startsWith('/replay/') || p.startsWith('/day/') || p === '/chronicle') return current;
  return 'memories';
}
