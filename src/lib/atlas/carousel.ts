// @layer core
import { distanceM } from '../geo';
import type { LandingView } from '../landing/view';
import type { LngLat } from '../types';
import { ATLAS_RULES, needsNear, type Listed, type NearRead } from './atlas';

/** Explore's row of area cards (EC1-EC15): what is in it, which card a swipe or a scroll means, and which Busy names the map keeps. */

/**
 * The row's areas in order (EC3): a town's own card first on its page, then its neighborhoods; near you, the towns alone,
 * the one you are in leading, then the others in the order given, or the neighborhoods where no town is named (fix
 * explore-town-scope: one level per row).
 */
export function rowOf(p: { ownTown: Listed | null; neighborhoods: Listed[]; towns: Listed[]; townsListed: boolean }): Listed[] {
  if (p.ownTown) return [p.ownTown, ...p.neighborhoods];
  // Where the map names no town around you, the neighborhoods near you, so the row is never empty for want of a town; never
  // while the towns are still being listed, or the row would show neighborhoods, then swap (fix explore-town-scope audit 1).
  if (!p.towns.length) return p.townsListed ? p.neighborhoods : [];
  return [...p.towns.filter((l) => l.here), ...p.towns.filter((l) => !l.here)];
}

/** The words near you name the row's level (decision 0126): the towns, or the areas where no town is named (fix explore-town-scope audit 1). */
export function nearWords(row: Listed[]): { subtitle: string; label: string } {
  return row.length && row.every((l) => l.area.level === 'town')
    ? { subtitle: 'Towns around you', label: 'Towns near you' }
    : { subtitle: 'Areas around you', label: 'Areas near you' };
}

/**
 * Where the map's layers read (ML3-ML9): around the selected area, but around you while your own town is selected, as it is on
 * arrival near you; its label point can be kilometres off (fix explore-town-scope audit 8).
 */
export function layerCentre(sel: Listed | null, from: LngLat | null, nearYou = true): LngLat | null {
  // Only on the page near you: on a town's own page, yours too, they read around the town (audit 11).
  if (nearYou && sel && sel.here && sel.area.level === 'town' && from) return from;
  return sel?.area.at ?? from;
}

/**
 * Whether the towns around you count as listed (fix explore-town-scope audits 9, 10): once a town near read of this build and
 * these rules covers you, and from then on until the build changes (the caller starts again at false), so a failed or pending
 * town read never puts the neighborhoods in the towns' place, and listing again after a walk never empties a row of them.
 */
export function townsListedAfter(prev: boolean, p: { reads: NearRead[]; at: LngLat; build: string | null }): boolean {
  if (prev || !p.build) return prev;
  return !needsNear(p.reads, p.at, p.build, ATLAS_RULES.nearTownM);
}

/** The key to select now (EC1): the selected one while it is in the row, else the first, else null. */
export function firstSelection(order: string[], selected: string | null): string | null {
  if (selected != null && order.includes(selected)) return selected;
  return order[0] ?? null;
}

/** A swipe on the map in row steps (EC8): -1 previous, +1 next, 0 nothing; by screen direction, a drag more vertical than horizontal or under `minPx` is 0. */
export function rowStep(dx: number, dy: number, minPx: number): -1 | 0 | 1 {
  if (Math.abs(dx) < minPx || Math.abs(dy) > Math.abs(dx)) return 0;
  // The finger travelling left brings the next card in, as a swipe on the row does.
  return dx < 0 ? 1 : -1;
}

/** The neighbouring key in a step, or null at an end or with nothing selected in the row (EC8, EC9). */
export function stepKey(order: string[], selected: string | null, dir: -1 | 0 | 1): string | null {
  if (dir === 0 || selected == null) return null;
  const i = order.indexOf(selected);
  return i < 0 ? null : order[i + dir] ?? null;
}

/** The card a scroll settled on (EC4): offset over the card step, clamped to the row. */
export function settledIndex(offsetX: number, step: number, count: number): number {
  if (count <= 0 || step <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offsetX / step)));
}

/** Where to scroll to centre a card (EC4). */
export const offsetOf = (index: number, step: number): number => index * step;

/** The Busy view with its names kept only inside the selected area's ring and from `minZoom` (EC7); its drawn streets are never touched. */
export function busyNamesNear(view: LandingView | null, at: LngLat | null, zoom: number, ringM: number, minZoom: number): LandingView | null {
  if (!view) return null;
  const named = at != null && zoom >= minZoom;
  const near = (p: LngLat) => named && distanceM(at, p) <= ringM;
  const strips = view.strips.filter((s) => near(s.at));
  const labels = view.labels.filter((l) => near(l.at));
  // Nothing dropped: the same view, so the map is not sent it again (explore-carousel audit 3).
  return strips.length === view.strips.length && labels.length === view.labels.length ? view : { ...view, strips, labels };
}

/**
 * What a settled scroll means (explore-carousel audit 2). While the row is scrolling itself to a card (`intended`), a settle
 * that stopped short of it (a stalled page) is never the reader's: it aims on. Otherwise the card it stopped on is reported
 * when it is not already the selected one.
 */
export function settleStep(p: { index: number; intended: number | null; selected: number }): { report: number | null; scrollTo: number | null } {
  if (p.intended != null) return { report: null, scrollTo: p.index === p.intended ? null : p.intended };
  return { report: p.index === p.selected ? null : p.index, scrollTo: null };
}

/**
 * The card to select while the reader's own scroll is still moving (fix carousel-live-select): the one nearest the middle, as
 * soon as it is not the selected one nor the one last reported, so each card previews as it passes, not after the scroll
 * settles. Never while the row is scrolling itself to a card (`intended`).
 */
export function liveReport(p: { index: number; intended: number | null; selected: number; last: number | null }): number | null {
  if (p.intended != null) return null;
  // Once the scroll has reported a card, that one is the selection (the screen's may not have committed it yet).
  return p.index === (p.last ?? p.selected) ? null : p.index;
}

/** The footer a card shows (explore-carousel audit 4, EC15): only the selected card, so a tap on it does what it says. */
export function cardFooter(p: { drill: boolean; wide: boolean; selected: boolean }): string | null {
  if (!p.selected) return null;
  return p.drill ? 'See its neighborhoods' : p.wide ? 'What’s here' : null;
}

/** The words over the map for a town page with no neighborhoods: what the map lacks, nothing of the town (explore-carousel audit 12). */
export function townNote(name: string, listing: boolean): string {
  return listing ? `Reading ${name}…` : `The map names no neighborhoods in ${name}.`;
}

/** How far from the selected area's point the Busy names reach: a neighborhood's ring, a town's own reach, never less than the ring (explore-carousel audit 16). */
export function busyRadiusM(level: 'neighborhood' | 'town', ringM: number, townReachM: number): number {
  return level === 'town' ? Math.max(ringM, townReachM) : ringM;
}

/** Whether the Busy names are shown at this zoom: one boolean, so a camera move does not send the map a new view (explore-carousel audit 3). */
export function busyNamesOn(zoom: number, minZoom: number): boolean {
  return zoom >= minZoom;
}
