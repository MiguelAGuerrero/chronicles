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

/**
 * FL21: the bottom-left stack, from the bottom: the long press's choices (spanning the width), the Towns pill, the Show areas
 * pill (only while Move map is on), the scale bar, then the one-at-a-time overlay. `showBottom` and `townBottom` are the pills'
 * places, when they have one.
 */
export function exploreSlots(o: { spot: boolean; town: boolean; free?: boolean }): { scaleBottom: number; overlayBottom: number; showBottom?: number; townBottom?: number } {
  const base = o.spot ? SPOT_TOP : PILL_BOTTOM;
  const step = PILL_H + GAP;
  const townBottom = o.town ? base : undefined;
  const showBottom = o.free ? base + (o.town ? step : 0) : undefined;
  const clearOfBelow = base + (o.town ? step : 0) + (o.free ? step : 0);
  // The long press's choices span the map's width, so the bar rises above them as well as above the pills.
  const scaleBottom = o.town || o.free ? clearOfBelow : o.spot ? SPOT_TOP : SCALE_BOTTOM;
  return { scaleBottom, overlayBottom: Math.max(clearOfBelow, scaleBottom + SCALE_H + GAP), ...(showBottom != null ? { showBottom } : {}), ...(townBottom != null ? { townBottom } : {}) };
}

/**
 * Whether the long press's hint is up (atlas round 3): unseen, no long press open and the map placed. It steps aside while
 * the recording bar's Edit pill stands above the bar, whose room lifts the map so the walker sat under its words (tend tabs
 * T36), and for the bar's reminder card, which lifts it as far (`reminder`, tend tabs audit 51); it shows again as they
 * go. Its time on screen counts toward its being seen only while it is up (EC14), so it is up only while drawn in front:
 * Explore focused, no Modal over it (`covered`), no full-screen card folding the tabs (`folded`), and nothing else in the
 * overlay's place (`slotTaken`: an error, a notice, "Looking around…", the map's credits) (tend tabs audit 29).
 */
export const pressHintUp = (o: {
  seen: boolean;
  spot: boolean;
  located: boolean;
  barOffer: boolean;
  reminder: boolean;
  focused: boolean;
  covered: boolean;
  folded: boolean;
  slotTaken: boolean;
}): boolean => !o.seen && !o.spot && o.located && !o.barOffer && !o.reminder && o.focused && !o.covered && !o.folded && !o.slotTaken;
