// @layer core
import type { Listed } from './atlas';

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
export function goHereChoices(mapsApp: string, mapsHint = 'Opens walking directions in your maps app'): GoHereChoice[] {
  return [
    { id: 'app', label: 'Chronicles', hint: 'Opens Navigate, ready' },
    { id: 'maps', label: mapsApp, hint: mapsHint },
  ];
}

/** GH5, GH6, GH15: what a choice does. It reads no distance: both work at any distance. A walk open routes that walk, as Walk to does (NV10). */
export function goHereDo(choice: GoHereChoice['id'], walkOpen: boolean): 'maps' | 'later' | 'start' {
  if (choice === 'maps') return 'maps';
  return walkOpen ? 'start' : 'later';
}

/** The sheet's own words: its heading, and, when a destination is already saved, that this replaces it (said once). */
export function goHereWords(name: string, replaces: boolean): string[] {
  return replaces ? [`Go to ${name}`, 'Replaces where you were heading'] : [`Go to ${name}`];
}
