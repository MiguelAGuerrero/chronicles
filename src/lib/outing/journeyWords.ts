// @layer core
import { formatDistance, formatDistanceNear } from '../format';
import { byRoadLine } from '../roads/words';
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
export const BACK_LABEL = 'Back';
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
  return `${big >= 10 ? `${Math.round(big)}\u00a0${units}` : formatDistanceNear(m, units)} away`;
}

const list = (xs: readonly string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** OJ21, RE17: a card's summary: the places in order, what it includes as the chips' own words, and the distance on foot when there is any. */
export function cardSummary(j: { places: readonly (string | null)[]; labels: readonly string[]; footM: number; roadM?: number | null }, units: Units): string {
  const where = list(j.places.map((p) => p ?? HERE_LABEL));
  // RE17: the distance by road last, beside the distance on foot, where the road is known.
  return `${where}. ${list(j.labels)}.${j.footM > 0 ? ` ${formatDistance(j.footM, units)} on foot.` : ''}${j.roadM ? ` ${byRoadLine(j.roadM, units)}.` : ''}`;
}

/** OJ23: what a town holds of what you asked for, as the chips' own words; never how much or how good. */
export const townLine = (labels: readonly string[]): string => `${list(labels.map((l, i) => (i ? l.toLowerCase() : l)))} here.`;

/** OJ24: a chapter: a walk with its distance, or one stop. */
export function chapterLine(c: { stops: number; lengthM: number; loop: boolean }, units: Units): string {
  if (c.stops <= 1) return 'One stop.';
  return `A walk of ${formatDistance(c.lengthM, units)}, ${c.loop ? 'back where it starts' : 'one way: the way back is yours'}.`;
}

/** OJ41: a step of the reach: the nearest is "Close by" (what a walk reaches), the others a distance. */
export const reachLabel = (m: number, units: Units): string => (m <= 0 ? 'Close by' : formatDistance(m, units).replace(/\.0(?=[ \u00a0])/, ''));

/** OJ41: the steps of the reach beyond close by, in the units setting. */
export const reachSteps = (units: Units): number[] => (units === 'mi' ? [3, 10, 25].map((x) => Math.round(x * MI_M)) : [5000, 15000, 40000]);

/** OJ22: chips on and nothing to propose. */
export const nothingLine = (place: string | null): string => (place ? `Little of that toward ${place}.` : 'Little of that close by.');

export const READ_FAILED_LINE = "Couldn't read the map there.";
export const TOO_FAR_LINE = 'With no position yet, it waits in Navigate until you are there.';
export const REACH_LINE = 'How far to look';
export const ANOTHER_LABEL = 'Another like this';
export const NO_OTHER_LINE = 'No other like it within reach.';
export const FURTHER_LABEL = 'Look further';
/** OJ22 (audit 17): the next move names only a control that is on the page. */
export const nextMoveLine = (canLookFurther: boolean): string => (canLookFurther ? 'Switch on another chip, or look further.' : 'Switch on another chip.');
export const TOWNS_LINE = 'Reading the towns…';
/** OJ27 (audit 22): said once with a destination. */
export const STRAIGHT_LINE = 'Distances to towns are straight lines; Maps knows the road.';
export const RETRY_LABEL = 'Try again';
export const TOWNS_FAILED_LINE = "Couldn't read the list of towns.";
export const MAPS_FAILED_LINE = "Couldn't open Maps.";
export const DISMISS_LABEL = 'Dismiss';
export const PEEK_LABEL = 'Show the map';
export const UNPEEK_LABEL = 'Show the journeys';
export const UNDO_LABEL = 'Undo';
export const ANOTHER_LINE = 'Planned again from other places.';

/** OJ41 (ui 1): what a wider reach looked at, said under it once the towns are read: their names, or that there was none. */
export const lookedLine = (names: readonly string[]): string => (names.length ? `Looked in ${list(names)}.` : 'No town within that reach: this is around here.');

/** OJ29: the session between towns: the town it is headed toward and how far, in a straight line; with no position yet, the town alone. No ordinal word. */
export const towardLine = (town: string, m: number | null, units: Units): string => (m == null ? `Toward ${town}.` : `Toward ${town}. ${awayLine(m, units)}.`);
/** OJ30: within reach of a town: said, and the way through its stops offered, never begun for you. */
export const hereLine = (town: string): string => `${town} is here.`;
export const WAY_LABEL = 'Show the way';
export const PASS_LABEL = 'Pass by';
export const PASS_HINT = 'Lets this town go';
export const NO_TOWN_LINE = 'No town ahead.';
/** Beside Start for a journey that names a town: where recording begins, which is here (audit 47). */
export const startLine = (town: string): string => `Start records from here, toward ${town}.`;
/** Beside "When I get there" for a journey of several towns: what it keeps (audit 48). */
export const laterLine = (town: string): string => `"When I get there" keeps ${town} only.`;
export const leftOutLine = (town: string): string => `Left ${town} out.`;
export const FOLLOW_LABEL = 'Follow this';
export const LEAVE_OUT_LABEL = 'Leave this town out';
/** OJ50: said of a town you have not been in on a recorded outing; never of a place, and nothing is said of the others. */
export const NEW_TOWN_LINE = 'New to you.';
