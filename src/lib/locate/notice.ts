// @layer core
import type { LocateResult } from './types';

/** What a Locate tap says when no fix came, for the screen's banner. */
export interface LocateError {
  message: string;
  /** A phone's Settings hold the permission: the banner offers Open Settings. */
  openSettings?: boolean;
  /** `info`: a quiet notice (the cream banner, its words in dark amber), for no fault of the person's; `error`: a fault. */
  tone: 'info' | 'error';
  /** Location refused: a choice the person made, which only turning it back on undoes (Explore holds Find me back). */
  refused?: boolean;
}

/**
 * Location refused, said as a quiet notice, not a fault (T17, decision 0154): the person turned it off, and
 * the notice says where to turn it back on. A browser keeps the permission per site; a phone keeps it in Settings,
 * which the banner opens, and can keep location off for the browser itself, so the web's line names both (decision
 * 0172, O19). The phone's line is the recorder's start's, with Locate's own end.
 */
export const LOCATION_OFF = {
  web: 'Location is off for this site. Turn it on in your browser’s or your phone’s settings to see where you are.',
  native: 'Location is turned off for Chronicles. Turn it on in Settings to find your position.',
} as const;

/**
 * Start refused (T26, decision 0162): Locate's line with the recorder's own end, said as quietly, in the notice on the
 * ready screen and in the walk's "Not recording" notice. A phone's Settings hold the permission, which the notice opens.
 */
export const START_OFF = {
  web: 'Location is off for this site. Turn it on in your browser’s or your phone’s settings to record a walk.',
  native: 'Location is turned off for Chronicles. Turn it on in Settings to record a walk.',
} as const;

/** What the recorder's start says when location is refused: a quiet notice, with Open Settings on a phone. */
export function startOffNotice(platform: 'web' | 'native'): LocateError {
  return platform === 'web' ? { message: START_OFF.web, tone: 'info' } : { message: START_OFF.native, openSettings: true, tone: 'info' };
}

/** Locate found nothing in time, or nothing at all (decision 0172, O21): no fault, and waiting is the way. */
export const LOCATE_TIMEOUT = 'Couldn’t find your position. Try again in a moment.';

/**
 * The banner for a Locate tap that found nothing (QL11): refused is the quiet notice above, with Open Settings where
 * the platform has it; a timeout or no location at all is one line, as quiet (O21), and no refusal.
 */
export function locateNotice(reason: LocateResult['reason'], platform: 'web' | 'native'): LocateError {
  if (reason === 'denied') {
    return platform === 'web'
      ? { message: LOCATION_OFF.web, tone: 'info', refused: true }
      : { message: LOCATION_OFF.native, openSettings: true, tone: 'info', refused: true };
  }
  return { message: LOCATE_TIMEOUT, tone: 'info' };
}
