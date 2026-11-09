// @layer core
import { ATLAS_LABEL } from '../atlas/atlas';
import type { CategoryId } from '../discovery/types';
import { lengthLine } from '../kindWalk/words';
import type { Units } from '../units';
import type { PlannedRoute, Reason } from './planner';
import { exposureWords, type Also } from './exposure';
import type { PresetId } from './presets';
import type { Density, Mode } from './settings';

/*
 * Every sentence the planner says (WP7, WP10, WP14, WP15), in one place. A distance is the only number, and it is a distance: no
 * time, pace, rank, comparison or superlative; the words test holds this file to it.
 */

export const PRESET_NAMES: Record<PresetId, string> = { middle: 'Through the middle', across: 'Across the area', edge: 'Around the edge' };

export const title = (kind: CategoryId): string => `A walk through ${ATLAS_LABEL[kind].toLowerCase()}`;
export const startLabel = 'Start';
export const differentLabel = 'Suggest different routes';
export const closeLabel = 'Close';
export const settingsHeading = 'Shape the walk';
export const readingLine = 'Reading the streets…';
export const MODE_LABEL: Record<Mode, string> = { loop: 'Loop, back where you start', oneway: 'One way' };
export const DENSITY_LABEL: Record<Density, string> = { anywhere: 'Anywhere', some: 'Where there is some', plenty: 'Where there is plenty' };
export const DENSITY_HEADING = 'Pass the kind';
export const MODE_HEADING = 'The walk';
export const CEILING_HEADING = 'About how far you would like to go';
export const CEILING_NOTE = 'No route goes beyond it.';

export function reasonLine(r: Reason): string {
  switch (r) {
    case 'noPosition': return 'Needs your position to plan a walk.';
    case 'far': return 'Too far from here to start on foot.';
    case 'few': return 'Too little of this in one place to make a way.';
    case 'noRoute': return 'No way through it was found on the streets nearby.';
    case 'outOfReach': return 'Out of reach at this distance.';
    case 'little': return 'Ways that pass less of it than you asked for are left out.';
    case 'same': return 'The other ways here go much the same way.';
    case 'nothingDifferent': return 'Nothing different to suggest from here.';
    case 'noLoop': return 'No loop here that does not go back the way you came. One way may work.';
    case 'cars': return 'Ways with a stretch built around cars are left out, as you asked.';
  }
}

/** Said when a route is well within the distance because the kind fills less ground than that (WP10). */
export const lessGroundLine = 'There is less of it here than that distance.';

/** A route's row: its distance and what it passes, in words (WP14). No digit but the distance. */
export interface RowWords {
  title: string;
  distance: string;
  passes: string;
  getting: string | null;
  /** The other kinds along the route, in words (WP28); null when there are none. */
  also: string | null;
}

/** "Also passes some history and plenty of art": kinds, never places (WP28). */
export function alsoLine(also: readonly Also[]): string | null {
  if (!also.length) return null;
  const parts = also.map((a) => `${a.level === 'plenty' ? 'plenty of' : 'some'} ${ATLAS_LABEL[a.kind].toLowerCase()}`);
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `Also passes ${text}`;
}

export function rowWords(r: PlannedRoute & { also?: readonly Also[] }, units: Units): RowWords {
  const e = exposureWords(r.runs, r.startM, r.lengthM);
  return {
    title: PRESET_NAMES[r.preset],
    distance: r.loop ? `${lengthLine(r.lengthM, units)}, back where you start` : lengthLine(r.lengthM, units),
    passes: e.line,
    getting: e.getting,
    also: alsoLine(r.also ?? []),
  };
}

/** Whether a route is short of the ceiling by enough to say why (WP10). */
export const fillsLess = (r: PlannedRoute, ceilingM: number): boolean => r.lengthM < ceilingM * 0.7;
