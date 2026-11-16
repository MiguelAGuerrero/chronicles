// @layer core
import { walkViaLine, type Listed } from './atlas';

/**
 * Explore's Go here (GH1-GH15, decision to follow): every tile has a quick way to its place, a sheet of two choices.
 * Pure: who gets it, what the sheet says, and what a choice does. The choices are two ways of being taken, never two
 * routes: no minutes, no "fastest", no ranking (Never: several ways ranked by minutes).
 */

/** GH8: every tile whose area has a point, with or without a fix of yours; not the area you are in, which has no Walk to either. */
export function canGoHere(l: Listed): boolean {
  return !l.here && Array.isArray(l.area.at) && l.area.at.length === 2;
}

export interface GoHereChoice {
  id: 'app' | 'maps';
  label: string;
  hint: string;
}

/**
 * GH2: Chronicles first, the phone's maps app second, neither marked better. The maps row names the app that gets the
 * destination, so what leaves the device (only the destination, on a tap, 0058) is plain before the tap.
 */
export function goHereChoices(mapsApp: string, mapsHint = 'Opens walking directions in your maps app', walkOpen = false): GoHereChoice[] {
  return [
    // GE4: with a walk open the choice routes that walk (NV10), and the hint says so.
    { id: 'app', label: 'Chronicles', hint: walkOpen ? 'Routes your walk' : 'Opens Navigate, ready' },
    { id: 'maps', label: mapsApp, hint: mapsHint },
  ];
}

/** GH5, GH6, GH15: what a choice does. It reads no distance: both work at any distance. A walk open routes that walk, as Walk to does (NV10). */
export function goHereDo(choice: GoHereChoice['id'], walkOpen: boolean): 'maps' | 'later' | 'start' {
  if (choice === 'maps') return 'maps';
  return walkOpen ? 'start' : 'later';
}

/**
 * The sheet's own words: its heading; where it starts you, when that is one of its streets, as Walk to says (`walkViaLine`)
 * (audit 9); and, when a destination is already saved, that this replaces it (said once).
 */
export function goHereWords(name: string, replaces: boolean, via?: string | null): string[] {
  return [`Go to ${name}`, ...(via ? [walkViaLine(via)] : []), ...(replaces ? ['Replaces where you were heading'] : [])];
}

/**
 * The maps row's hint (audit 3): one line at 320 px, and "Recording pauses" only where it is true: a browser takes no fixes
 * while Chronicles is hidden, and only a walk open records. On a phone Chronicles keeps recording (0058).
 */
export function goHereMapsHint(o: { walkOpen: boolean; web: boolean }): string {
  return o.walkOpen && o.web ? 'Opens your maps app. Recording pauses.' : 'Opens your maps app';
}

/** Where the sheet sits (audit 5): at the top it starts at the top inset; at the foot it clears the bottom inset, over the card that hides the tabs. */
export function sheetEdge(anchor: 'top' | 'bottom', insets: { top: number; bottom: number }): { top: number } | { bottom: number } {
  return anchor === 'top' ? { top: insets.top } : { bottom: insets.bottom };
}

/** GE5: a busy-area or complex row has Go here whether or not Walk to is offered: Go here works at any distance. */
export function rowActions(o: { walkable: boolean }): { walk: boolean; go: true } {
  return { walk: o.walkable, go: true };
}

/** GE7: the area's card has Go here unless it is the area you are in (no Walk to there) or its far question is open. */
export function cardCanGoHere(o: { here: boolean; asking: boolean }): boolean {
  return !o.here && !o.asking;
}

/** GE7: Explore's long-press card has Go here where it has Walk here (zoom 12 and over), and not while its question is open. */
export function spotCanGoHere(o: { zoom: number; asking: boolean }): boolean {
  return o.zoom >= 12 && !o.asking;
}

/**
 * GE13: the label that rides in the maps link (Android's `geo:` link carries one). An area, a complex or a street goes by its
 * name; a star's title or a pressed spot is the owner's own, and only "Destination" leaves the device (0058).
 */
export function shareLabel(kind: 'area' | 'star' | 'spot', label: string): string {
  return kind === 'area' ? label : 'Destination';
}
