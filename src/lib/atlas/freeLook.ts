// @layer core
/*
 * Free look (FL1-FL21, decision 0150): the pure part. Explore's map can be freed to pan (Move map); Show areas here lists the
 * areas around the map's middle. A looked page says what it is around, never where the reader is; a card's distance is measured
 * from the reader's fresh fix, or left out.
 */
import { distanceM } from '../geo';
import { FRESH_FIX_MS } from '../startPlan';
import type { LngLat } from '../types';
import type { Listed, NearRead } from './atlas';

export interface LookWords {
  /** The page's title while looking: what it is around, never where the reader is (FL7). */
  title: string;
  subtitle: string;
  /** Said once for each look (FL13). */
  announcement: string;
  /** The row's place when nothing is mapped around the middle (FL20). */
  empty: string;
}

export interface MoveMapLabel {
  label: string;
  hint: string;
  pressed: boolean;
}

const WORDS: LookWords = {
  title: 'Around the middle of the map',
  subtitle: 'Where you moved the map',
  announcement: 'Showing areas around the middle of the map',
  empty: 'No towns or neighborhoods are mapped around the middle of the map.',
};

/** The title, subtitle, announcement and empty line of a looked page (FL7, FL13, FL20). */
export function lookWords(): LookWords {
  return WORDS;
}

/** The Move map toggle's name, hint and pressed state (FL2). */
export function moveMapLabel(on: boolean): MoveMapLabel {
  return on
    ? { label: 'Move map', hint: 'Turn off to step between areas by swiping again', pressed: true }
    : { label: 'Move map', hint: 'Turn on to drag the map to another place', pressed: false };
}

/** The row's accessible name while looking (FL7): what it is around, never near you. */
export function lookRowLabel(towns: boolean): string {
  return towns ? 'Towns around the middle of the map' : 'Areas around the middle of the map';
}

/** The pill's label (FL5, FL11). */
export function showHereLabel(): string {
  return 'Show areas here';
}

/** The map canvas's accessible name, in snapping and in Move map (FL13). */
export function mapLabel(free: boolean): string {
  return free ? 'Map. The arrow keys pan it.' : 'Map. The arrow keys move between areas.';
}

/** The point Show areas here takes: the map's own settled middle, or null before the map has reported one (FL5, FL6). */
export function centreOf(cam: { center: LngLat; zoom: number } | null): LngLat | null {
  return cam ? [cam.center[0], cam.center[1]] : null;
}

/** A fix as `you`, only while it is fresh (0121's window); else null (FL12). */
export function youFresh(fix: { at: LngLat; t: number } | null, now: number): LngLat | null {
  return fix && now - fix.t <= FRESH_FIX_MS ? fix.at : null;
}

/**
 * A list as a looked page lists it (FL6, FL7, FL12): plain distance order from `centre` (no outline-first move), `here` never
 * set, each distance measured from `you`, or `unplaced` (no distance said) when `you` is null.
 */
export function lookedList(list: Listed[], centre: LngLat, you: LngLat | null): Listed[] {
  return list
    .map((l): Listed => {
      const { unplaced: _gone, ...rest } = l;
      return you ? { ...rest, here: false, distanceM: distanceM(l.area.at, you) } : { ...rest, here: false, unplaced: true };
    })
    .sort((a, b) => distanceM(a.area.at, centre) - distanceM(b.area.at, centre));
}

/** The newest read around you at this radius, never a read made for a look (FL15). */
export function listedAround(reads: NearRead[], radiusM: number): NearRead | null {
  return reads.find((r) => !r.look && !r.town && (r.radiusM ?? radiusM) === radiusM) ?? null;
}

/** The frame key of a look: each look is its own page, so a second one frames again (FL6). */
export function lookPage(centre: LngLat): string {
  return `look:${centre[0].toFixed(3)},${centre[1].toFixed(3)}`;
}

/** The empty line when a settled look has no area to show, else null (FL20). */
export function emptyLook(shown: number, status: 'idle' | 'listing' | 'reading' | 'offline'): string | null {
  return shown === 0 && status === 'idle' ? WORDS.empty : null;
}
