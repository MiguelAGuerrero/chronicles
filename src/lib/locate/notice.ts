// @layer core
import type { LocateResult } from './types';

/** What a Locate tap says when no fix came, for the screen's banner. */
export interface LocateError {
  message: string;
  /** A phone's Settings hold the permission: the banner offers Open Settings. */
  openSettings?: boolean;
  /** `info`: a quiet notice in ink, for a choice the person made; `error`: a fault. */
  tone: 'info' | 'error';
}

/**
 * Location refused, said as a quiet notice in ink, not a fault (T17, decision 0154): the person turned it off, and
 * the notice says where to turn it back on. A browser keeps the permission per site; a phone keeps it in Settings,
 * which the banner opens. The phone's line is the recorder's start's, with Locate's own end.
 */
export const LOCATION_OFF = {
  web: 'Location is off for this site. Turn it on in the browser’s settings to see where you are.',
  native: 'Location is turned off for Chronicles. Turn it on in Settings to find your position.',
} as const;

/**
 * The banner for a Locate tap that found nothing (QL11): refused is the quiet notice above, with Open Settings where
 * the platform has it; a timeout or no location at all is one line.
 */
export function locateNotice(reason: LocateResult['reason'], platform: 'web' | 'native'): LocateError {
  if (reason === 'denied') {
    return platform === 'web' ? { message: LOCATION_OFF.web, tone: 'info' } : { message: LOCATION_OFF.native, openSettings: true, tone: 'info' };
  }
  return { message: 'Couldn’t find your position', tone: 'error' };
}
