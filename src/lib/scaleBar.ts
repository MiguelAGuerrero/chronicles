export interface ScaleBarSize {
  /** The round length the bar stands for. */
  meters: number;
  /** The bar's width on screen, never over the maximum given. */
  px: number;
  /** "100 m", "1 km", "2 km". */
  label: string;
}

/**
 * The longest round length (1, 2 or 5 × a power of ten metres) that fits in
 * `maxPx` at `metersPerPixel` (QL5, QL6). Pure: the map passes the scale of
 * its current view (`metersPerPixel(zoom, lat)` from `pins.ts`).
 */
export function scaleBar(metersPerPixel: number, maxPx: number): ScaleBarSize {
  const maxM = metersPerPixel * maxPx;
  if (!(maxM > 0) || !Number.isFinite(maxM)) return { meters: 0, px: 0, label: '' };
  // The decade the maximum falls in, nudged so a length that fits exactly isn't lost to rounding.
  const e = Math.floor(Math.log10(maxM) + 1e-9);
  let meters = 10 ** e;
  for (const lead of [5, 2, 1]) {
    const m = round(lead * 10 ** e);
    if (m <= maxM * (1 + 1e-9)) {
      meters = m;
      break;
    }
  }
  return { meters, px: Math.min(maxPx, meters / metersPerPixel), label: labelFor(meters) };
}

/** Kills the float noise of 5 * 10 ** -1 and friends. */
const round = (m: number) => +m.toPrecision(12);

function labelFor(meters: number): string {
  return meters >= 1000 ? `${round(meters / 1000)} km` : `${meters} m`;
}
