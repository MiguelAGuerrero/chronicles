// @layer core
import type { Listed } from './atlas';

/**
 * Open in Maps beside Walk (specs/open-in-maps-here, decision 0195): every place shown with a way to walk there also has
 * "Open in Maps ↗", which hands the destination to the phone's maps app and does nothing else. Pure: who gets it, what
 * the words are, what a tile's walk button does at each distance, and what label rides in the link.
 */

export const OPEN_IN_MAPS = 'Open in Maps';

/** OM3: the spoken names. */
export const openInMapsName = (place: string): string => `${OPEN_IN_MAPS}, ${place}`;
export const walkThereName = (place: string): string => `Walk there, ${place}`;

/** OM5: every tile whose area has a point, with or without a fix; not the area you are in, which has no Walk to either. */
export function canOpenInMaps(l: Listed): boolean {
  return !l.here && Array.isArray(l.area.at) && l.area.at.length === 2;
}

/** OM5: the area's card has it unless it is the area you are in or its far question is open. */
export function cardCanOpenInMaps(o: { here: boolean; asking: boolean }): boolean {
  return !o.here && !o.asking;
}

/** OM5: Explore's long-press card has it where it has Walk here (zoom 12 and over), and not while its question is open. */
export function spotCanOpenInMaps(o: { zoom: number; asking: boolean }): boolean {
  return o.zoom >= 12 && !o.asking;
}

/** OM4: a storefront or complex row has Open in Maps whether or not Walk to is offered: it works at any distance. */
export function rowActions(o: { walkable: boolean }): { walk: boolean; maps: true } {
  return { walk: o.walkable, maps: true };
}

export interface TileWalk {
  label: 'Walk there' | 'Set as destination';
  /** Spoken after the name, for a label that doesn't say what happens. */
  hint: string | null;
  /** What the tap does: start the walk, open the card with its far question showing, or save the place for Navigate. */
  does: 'start' | 'ask' | 'later';
  /** The accent fill: only a selected tile's Walk there (OM8). */
  accent: boolean;
}

/**
 * OM7, OM8: a tile's walk button names what its tap does at every distance (0121). `choice` is `walkToChoice`'s answer for that
 * area. A walk open routes it, as the card's Walk to does (NV10); a place too far to walk is a destination, walk open or not.
 */
export function tileWalk(choice: 'start' | 'ask' | 'later', o: { walkOpen: boolean; selected: boolean }): TileWalk {
  if (choice === 'later') return { label: 'Set as destination', hint: 'Saves it in Navigate; starts nothing', does: 'later', accent: false };
  const does = o.walkOpen || choice === 'start' ? 'start' : 'ask';
  return { label: 'Walk there', hint: does === 'ask' ? 'Asks whether to start now or when you get there' : null, does, accent: o.selected };
}

/**
 * OM10: the label that rides in the maps link (Android's `geo:` link carries one). An area, a complex or a street goes by its
 * name; a star's title or a pressed spot is the owner's own, and only "Destination" leaves the device (0058).
 */
export function shareLabel(kind: 'area' | 'star' | 'spot', label: string): string {
  return kind === 'area' ? label : 'Destination';
}
