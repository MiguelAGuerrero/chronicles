// @layer core
import { formatDistance } from '../format';
import type { Units } from '../units';
import type { TurnSay } from './types';

/*
 * What the road engine says (RE13, RE32): a distance, by road. No time, no speed, no comparison.
 */
const MI_M = 1609.344;

/** RE2, RE13: a way's length, worded "by road": whole units from ten of them on. */
export function byRoadLine(m: number, units: Units): string {
  const big = units === 'mi' ? m / MI_M : m / 1000;
  return `${big >= 10 ? `${Math.round(big)}\u00a0${units}` : formatDistance(m, units)} by road`;
}

/**
 * RE11a, RE15, RE18: the page's one line about the road. Found: how the way is chosen, in words and with no figure. Being read:
 * said once. Not found or too far: said plainly, with what the distances then are and where the road is known.
 */
const STRAIGHT = 'Distances to towns are straight lines; Maps knows the road.';
export function roadLine(state: 'reading' | 'found' | 'failed' | 'none' | 'long'): string {
  if (state === 'reading') return 'Finding the road…';
  if (state === 'found') return 'The way keeps to the roads through the towns.';
  return `${state === 'long' ? 'Too far to find the road here.' : "Couldn't find the road."} ${STRAIGHT}`;
}

/** A distance beside a turn: whole units from ten of them on, tens of metres under a kilometre, so it does not flicker with each fix. */
function turnDistance(m: number, units: Units): string {
  const big = units === 'mi' ? m / MI_M : m / 1000;
  if (big >= 10) return `${Math.round(big)}\u00a0${units}`;
  return formatDistance(units === 'km' && m < 995 ? Math.max(10, Math.round(m / 10) * 10) : m, units);
}

const SAY: Record<TurnSay | 'on', string> = {
  left: 'Left',
  right: 'Right',
  'keep-left': 'Keep left',
  'keep-right': 'Keep right',
  join: 'Onto the motorway',
  leave: 'Off the motorway',
  on: 'On this road',
};

/** RE20: the turn coming and how far to it; after the last, the road and what is left of it. Nothing else: no time, no count. */
export const turnLine = (t: { say: TurnSay | 'on'; toM: number }, units: Units): string => `${SAY[t.say]}. ${turnDistance(t.toM, units)}.`;

export const DRIVE_LABEL = 'Drive there';
/** Audit 10: it says what ends: the screen has its own Pause and Hold beside it. */
export const END_LABEL = 'End directions';
/** RE25: where a turn cannot be spoken. */
export const SHOWN_LINE = 'Turns are shown, not said.';
/** RE26: what the engine cannot know, as a statement, at rest. */
export const LIMITS_LINE = 'The map holds no turn restrictions and no closures.';
/** RE19 (S10): beside the road drawn on the page. */
export const MAPS_ROAD_LINE = 'Your maps app chooses its own road, which may not be this one.';
/** RE15: said once when guiding could not begin. */
export const NO_ROAD_LINE = "Couldn't find the road.";

const SPOKEN: Record<TurnSay, string> = {
  left: 'Left ahead.',
  right: 'Right ahead.',
  'keep-left': 'Keep left ahead.',
  'keep-right': 'Keep right ahead.',
  join: 'The motorway ahead.',
  leave: 'Off the motorway ahead.',
};
/** RE25: what is spoken as a turn nears: the turn alone. */
export const spokenTurn = (say: TurnSay): string => SPOKEN[say];
export const MUTE_LABEL = 'Mute turns';
export const UNMUTE_LABEL = 'Say turns';
