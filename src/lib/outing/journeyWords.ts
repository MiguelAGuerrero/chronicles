// @layer core
import { formatDistance, formatDistanceNear } from '../format';
import type { Units } from '../units';

/*
 * What the journey page says (OJ1, OJ2, OJ7, OJ9, OJ21, OJ22, OJ25, OJ27): in words; a distance is the only figure, never a time, a
 * count of places or a comparison.
 */
export const WHERE_LABEL = 'Where to?';
export const CHIPS_LINE = "What you'd like on the way";
export const NOWHERE_LABEL = 'Nowhere in particular';
export const HERE_LABEL = 'Around here';
export const SEE_LABEL = 'See this journey';
export const BACK_LABEL = 'Back to the journeys';
export const CHANGE_LABEL = 'Change where to';
export const LATER_LABEL = 'When I get there';
export const UNFOUND_LINE = 'Named when you reach it.';
export const READS_LINE = 'Looking ahead reads the map around that place.';
export const INTRO_LINE = 'Name a place, or stay around here.';
export const LOOP_LINE = 'A loop, back where it starts.';
export const ONEWAY_LINE = 'One way.';

const MI_M = 1609.344;

/** OJ9: how far a destination is in a straight line, worded "away": whole units from ten of them on. */
export function awayLine(m: number, units: Units): string {
  const big = units === 'mi' ? m / MI_M : m / 1000;
  return `${big >= 10 ? `${Math.round(big)} ${units}` : formatDistanceNear(m, units)} away`;
}

const list = (xs: readonly string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** OJ21: a card's summary: where, what it includes as the chips' own words, and the distance on foot. */
export function cardSummary(j: { place: string | null; labels: readonly string[]; footM: number; loop: boolean }, units: Units): string {
  return `${j.place ?? HERE_LABEL}. ${list(j.labels)}. ${formatDistance(j.footM, units)} on foot.`;
}

/** OJ22: chips on and nothing to propose. */
export const nothingLine = (place: string | null): string => (place ? `Little of that in ${place}.` : 'Little of that close by.');

export const READ_FAILED_LINE = "Couldn't read the map there. Try again in a moment.";
export const TOO_FAR_LINE = 'Too far to walk from here: it waits in Navigate until you are there.';
