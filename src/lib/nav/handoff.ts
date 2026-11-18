// @layer core
import { GET_THERE_M } from '../startPlan';
import type { LngLat } from '../types';

/**
 * Open in Maps (NH1, NH2): the destination handed to the phone's own maps app
 * for walking directions, for when Chronicles' route is wrong (a bridge, a
 * closed path), or for driving directions to a town a drive away (RE19). Pure: which app, and the links to open, in order. Only the
 * destination leaves the app, and only on a tap.
 */
export type MapsTarget = 'apple' | 'appleApp' | 'google' | 'geo';

/** The system's maps app: Apple Maps on iPhone and iPad, the Android chooser in the Android app, else Google. */
export function mapsTarget(env: { os: string; ua?: string; touchPoints?: number; standalone?: boolean }): MapsTarget {
  if (env.os === 'ios') return 'apple';
  if (env.os === 'android') return 'geo';
  const ua = env.ua ?? '';
  // A Home Screen app: window.open of an https link loads a blank in-app window you must back out of,
  // so the maps: scheme goes straight to the Maps app.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (env.touchPoints ?? 0) > 1);
  if (ios && env.standalone) return 'appleApp';
  if (ios) return 'apple';
  // Android hands Google's link to its Maps app; desktops open the website.
  return 'google';
}

/** The name a row gives the app that gets the destination (GH2): said before the tap, so what leaves the device is plain. */
export function mapsName(target: MapsTarget): string {
  if (target === 'apple' || target === 'appleApp') return 'Apple Maps';
  if (target === 'google') return 'Google Maps';
  return 'Maps';
}

/** How the maps app is asked to take you there: on foot, as ever, or by road for a town a drive away (RE19). */
export type TravelMode = 'walk' | 'drive';

/** Further than a walk to the start (`GET_THERE_M`) is a drive; with no position it is a walk, as before. */
export const travelMode = (awayM: number | null): TravelMode => (awayM != null && awayM > GET_THERE_M ? 'drive' : 'walk');

const fix6 = (n: number) => n.toFixed(6);

/** The links to try, in order: the first that opens wins. */
export function mapsUrls(at: LngLat, label: string, target: MapsTarget, mode: TravelMode = 'walk'): string[] {
  const ll = `${fix6(at[1])},${fix6(at[0])}`;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=${mode === 'drive' ? 'driving' : 'walking'}`;
  const flag = mode === 'drive' ? 'd' : 'w';
  if (target === 'appleApp') return [`maps://?daddr=${ll}&dirflg=${flag}`];
  if (target === 'apple') return [`https://maps.apple.com/?daddr=${ll}&dirflg=${flag}`];
  if (target === 'google') return [google];
  // geo: shows the pin in whichever maps app the walker picks; the label in
  // brackets ends at the first ")", so its own brackets are squared.
  const name = encodeURIComponent(label.replace(/\(/g, '[').replace(/\)/g, ']'));
  return [`geo:${ll}?q=${ll}(${name})`, google];
}
