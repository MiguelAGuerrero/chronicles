// @layer core
import { ATLAS_LABEL } from '../atlas/atlas';
import type { CategoryId } from '../discovery/types';
import { formatDistance } from '../format';
import type { Units } from '../units';
import type { WalkabilityPref } from './settings';

/*
 * Every sentence the kind walk says, in one place (KW1b, KW7, KW10). A distance is the only number, and it is a distance:
 * no minutes, hours, ETA, pace, rank or superlative (decision 0101; the words test holds this file to it).
 */

/** What the walk is, in a sentence (KW1b). */
export const introLine = (kind: CategoryId): string => `A way through where ${ATLAS_LABEL[kind].toLowerCase()} is concentrated here.`;

/** Its length, rounded, in the displayed unit (KW7): "about 2.0 km". */
export function lengthLine(lengthM: number, units: Units): string {
  const step = units === 'mi' ? 160.9344 : 100;
  return `About ${formatDistance(Math.round(lengthM / step) * step, units)}`;
}

/** How far to the start, said only when it is a walk's worth away (KW9). */
export function startLine(startM: number, units: Units): string | null {
  return startM < 200 ? null : `Starts ${formatDistance(Math.round(startM / 100) * 100, units)} from here`;
}

export interface Reach {
  /** Streets of the stretches built around cars, in order; null for one with no name. */
  cars: (string | null)[];
  /** Nothing about the way's streets could be read. */
  unknown: boolean;
}

/** Whether it can be walked the whole way, before the walker commits (KW10). */
export function walkabilityLine(r: Reach): string {
  if (r.unknown) return 'It is not known yet whether the whole way can be walked.';
  if (!r.cars.length) return 'Easy on foot the whole way, as far as the map shows.';
  const named = [...new Set(r.cars.filter((s): s is string => !!s))];
  const where = named.length ? ` on ${named.slice(0, 3).join(', ')}` : '';
  return `Part of it is built around cars${where}.`;
}

export const noneLine = (kind: CategoryId): string => `No ${ATLAS_LABEL[kind].toLowerCase()} to walk through here.`;
export const fewLine = 'Too little of this in one place to make a way.';
export const farLine = 'Too far from here to start on foot.';
export const noRouteLine = 'No way through it that fits was found on the streets nearby.';
export const skippedLine = 'The way through it is built around cars in part, and you chose not to be shown those.';
export const readingLine = 'Reading the streets…';
export const startLabel = 'Start this walk';
export const shorterLabel = 'Shorter';
export const longerLabel = 'Longer';

/** What happens at a stretch built around cars, for the setting (KW11). */
export const prefLabel = (p: WalkabilityPref): string => (p === 'warn' ? 'Say so' : 'Don’t suggest it');
