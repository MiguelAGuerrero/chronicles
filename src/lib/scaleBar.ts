// @layer core
import { getUnits, type Units } from './units';

export interface ScaleBarSize {
  /** The round length the bar stands for, always in metres (so `data-m` is metres in miles too). */
  meters: number;
  /** The bar's width on screen, never over the maximum given. */
  px: number;
  /** "100 m", "1 km", "2 km"; in miles "500 ft", "1 mi", "2 mi". */
  label: string;
}

const FT_M = 0.3048;
const MI_M = 1609.344;
/** The last rung in feet; the next is a mile (QL15). */
const MAX_FT = 2000;

/**
 * The longest round length that fits in `maxPx` at `metersPerPixel` (QL5,
 * QL6): 1, 2 or 5 × a power of ten metres, or in miles (QL15) feet in 1, 2 or
 * 5 × 10^n up to 2,000 ft, then miles in 1, 2 or 5 × 10^n. Pure: the map
 * passes the scale of its current view (`metersPerPixel(zoom, lat)` from
 * `pins.ts`). Reads the units setting unless given.
 */
export function scaleBar(metersPerPixel: number, maxPx: number, units: Units = getUnits()): ScaleBarSize {
  const maxM = metersPerPixel * maxPx;
  if (!(maxM > 0) || !Number.isFinite(maxM)) return { meters: 0, px: 0, label: '' };
  const { meters, label } = units === 'mi' ? imperial(maxM) : metric(maxM);
  return { meters, px: Math.min(maxPx, meters / metersPerPixel), label };
}

/** The longest 1, 2 or 5 × 10^n no more than `max` (in whatever unit `max` is). */
function longestRound(max: number): number {
  // The decade the maximum falls in, nudged so a length that fits exactly isn't lost to rounding.
  const e = Math.floor(Math.log10(max) + 1e-9);
  for (const lead of [5, 2, 1]) {
    const v = round(lead * 10 ** e);
    if (v <= max * (1 + 1e-9)) return v;
  }
  return round(10 ** e);
}

function metric(maxM: number) {
  const meters = longestRound(maxM);
  return { meters, label: meters >= 1000 ? `${round(meters / 1000)} km` : `${meters} m` };
}

function imperial(maxM: number) {
  const maxMi = maxM / MI_M;
  if (maxMi >= 1) {
    const mi = longestRound(maxMi);
    return { meters: mi * MI_M, label: `${mi} mi` };
  }
  const ft = Math.min(MAX_FT, longestRound(maxM / FT_M));
  return { meters: ft * FT_M, label: `${ft} ft` };
}

/** Kills the float noise of 5 * 10 ** -1 and friends. */
const round = (m: number) => +m.toPrecision(12);
