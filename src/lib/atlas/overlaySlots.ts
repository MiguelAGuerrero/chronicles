// @layer core
/**
 * Where Explore's map overlays sit, measured up from the map's bottom (tend explore 1). The scale bar lives in the bottom
 * left; the Towns back pill and the one-at-a-time overlay (a notice, "Looking around…", a town's note, the hint) sit in
 * the same corner, so each clears the one below: the scale bar clears the pill, the overlay clears the scale bar.
 */

/** The scale bar's height: its label, gap, line and padding (`components/map/ScaleBar.tsx`). */
export const SCALE_H = 32;
export const SCALE_LEFT = 8;
const SCALE_BOTTOM = 6;
const GAP = 8;
const PILL_H = 44;
const PILL_BOTTOM = 12;
/** The long press's choices over the map's bottom (EC19): 10 + their height (68) + a gap. */
const SPOT_TOP = 10 + 68 + GAP;

export function exploreSlots(o: { spot: boolean; town: boolean }): { scaleBottom: number; overlayBottom: number } {
  const pillBottom = o.spot ? SPOT_TOP : PILL_BOTTOM;
  // The long press's choices span the map's width, so the bar rises above them as well as above the pill.
  const scaleBottom = o.town ? pillBottom + PILL_H + GAP : o.spot ? SPOT_TOP : SCALE_BOTTOM;
  const clearOfBelow = (o.spot ? SPOT_TOP : PILL_BOTTOM) + (o.town ? PILL_H + GAP : 0);
  return { scaleBottom, overlayBottom: Math.max(clearOfBelow, scaleBottom + SCALE_H + GAP) };
}
