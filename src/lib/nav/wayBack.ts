// @layer core
import { distanceM } from '../geo';
import type { ReadTrace } from '../rides';
import type { LngLat } from '../types';

/**
 * Where Walk me back leads (specs/drive-then-walk, DW6-DW10; decision 0113): the spot chosen with
 * Walk back here, else where the last ride ended, else the walk's start. Read from the trace each
 * time, never stored, so a change to RIDE_RULES moves it with the trace.
 */

export type WayBackKind = 'start' | 'ride' | 'chosen';
export interface WayBack {
  at: LngLat;
  kind: WayBackKind;
  /** Its name in the navigation bar (DW8). */
  label: string;
  /** The button's spoken label (DW8). */
  said: string;
}

/** Walk me back shows once you are further than this from where it leads (N11, DW8). */
export const WAY_BACK_SHOW_M = 50;
/** Said once, as the walk's notice, when a spot is chosen (DW7). */
export const CHOSEN_NOTICE = 'Walk me back now leads here.';

const WORDS: Record<WayBackKind, { label: string; said: string }> = {
  start: { label: 'Start', said: 'Walk me back to the start' },
  ride: { label: 'Where the ride ended', said: 'Walk me back to where the ride ended' },
  chosen: { label: 'The spot you chose', said: 'Walk me back to the spot you chose' },
};

/**
 * Where the last ride that has ended ended (DW6): the first walked fix after it. A ride still under
 * way (`ridingNow`, the newest ride) doesn't count until it ends; nor does a ride with nothing walked
 * after it yet. Null with no such ride.
 */
export function landingOf(tr: Pick<ReadTrace, 'walked' | 'rides'>, ridingNow: boolean): LngLat | null {
  const last = ridingNow ? tr.rides.length - 2 : tr.rides.length - 1;
  for (let i = last; i >= 0; i--) {
    const end = tr.rides[i].t1;
    const next = i + 1 < tr.rides.length ? tr.rides[i + 1].t0 : Infinity;
    const f = tr.walked.find((p) => p.t > end && p.t < next);
    if (f) return [f.lon, f.lat];
  }
  return null;
}

/** The target, the chosen spot over where the ride ended over the start (DW6, DW7); null with none. */
export function wayBackTarget(i: { start: LngLat | null; landing: LngLat | null; chosen: LngLat | null }): WayBack | null {
  const [at, kind]: [LngLat | null, WayBackKind] = i.chosen ? [i.chosen, 'chosen'] : i.landing ? [i.landing, 'ride'] : [i.start, 'start'];
  return at ? { at, kind, ...WORDS[kind] } : null;
}

/** Whether Walk me back shows: past WAY_BACK_SHOW_M from its own target (DW8). */
export function showsWayBack(target: WayBack | null, here: LngLat | null): boolean {
  return !!target && !!here && distanceM(target.at, here) > WAY_BACK_SHOW_M;
}
