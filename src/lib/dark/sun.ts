// @layer core
import type { LngLat } from '../types';

/*
 * After dark (DK5, DK6): when the sun sets and rises at a place, worked out on the device from the position and the date with
 * the sunrise equation (the NOAA approximation: mean anomaly, equation of centre, ecliptic longitude, declination, refraction
 * at -0.833°), good to a minute or two away from the poles. No library and no network. Pure: the time is an argument.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J2000 = 2451545.0;
const HOUR_MS = 3_600_000;

const julian = (t: number) => t / DAY_MS + 2440587.5;
const fromJulian = (j: number) => (j - 2440587.5) * DAY_MS;

export interface SunTimes {
  /** When the sun rises on the solar day nearest `t`; null in polar night or day. */
  rise: number | null;
  set: number | null;
  /** The sun neither rises nor sets that day. */
  polar: 'day' | 'night' | null;
}

/** Sunrise and sunset on the local solar day nearest `t` (the one whose noon is within twelve hours of it). */
export function sunTimes(at: LngLat, t: number): SunTimes {
  const [lon, lat] = at;
  // The day whose solar noon is nearest t: J2000 is noon in Greenwich, and a place east of it has its noon earlier.
  const n = Math.round(julian(t) - J2000 + lon / 360);
  const jStar = n - lon / 360;
  const M = (((357.5291 + 0.98560028 * jStar) % 360) + 360) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const L = (M + C + 180 + 102.9372) % 360;
  const transit = J2000 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
  const sinDec = Math.sin(L * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  if (cosH < -1) return { rise: null, set: null, polar: 'day' };
  if (cosH > 1) return { rise: null, set: null, polar: 'night' };
  const h = Math.acos(cosH) / RAD / 360;
  return { rise: Math.round(fromJulian(transit - h)), set: Math.round(fromJulian(transit + h)), polar: null };
}

/** Between sunset and sunrise at the place (DK5); every hour of a polar night, none of a polar day. */
export function isDark(at: LngLat, t: number): boolean {
  const s = sunTimes(at, t);
  if (s.polar) return s.polar === 'night';
  return t < (s.rise as number) || t > (s.set as number);
}

/** The words the panel says for the reading (DK5); every one of them, for the words check (DK11). */
export const READING_WORDS = ['Open now', 'Open after sunset', 'No dark tonight'] as const;
export type ReadingWords = (typeof READING_WORDS)[number];

export interface Reading {
  /** When the hours are judged; null when there is no dark tonight. */
  at: number | null;
  words: ReadingWords;
}

/** DK5: after dark, now; in daylight, an hour after tonight's sunset; in a polar day, nothing to judge. */
export function readingAt(at: LngLat, t: number): Reading {
  if (isDark(at, t)) return { at: t, words: 'Open now' };
  const s = sunTimes(at, t);
  if (s.set === null) return { at: null, words: 'No dark tonight' };
  return { at: s.set + HOUR_MS, words: 'Open after sunset' };
}
