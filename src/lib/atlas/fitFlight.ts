// @layer core
/** A fit the map is flying, and the size of the box it was asked in (tend explore 17). */
export interface FitFlight {
  width: number;
  height: number;
}

/**
 * Whether the map's box, resized, makes the fit under way again (tend explore 17; AT9). An area's card folds the tabs
 * away as it opens, so Explore's map grows while the card's fit is flying, and maplibre (6.16) lands that flight at the
 * bounds' own middle and the wrong zoom, the padding's offset lost. A fit still flying when its box changes size is asked
 * again at the new size; a landed one (a move of the reader's lands it too), a box the same size or a map at rest is left be.
 */
export function refitOnResize(flight: FitFlight | null, box: { width: number; height: number }, moving: boolean): boolean {
  return !!flight && moving && (flight.width !== box.width || flight.height !== box.height);
}
