// @layer core
/**
 * The walk screen's edge slots and the layers button's corner (fix layers-corner). Pure, so `npm test`
 * covers them; `components/walk/layout.ts` places everything from these.
 */

/** Edge slots in the right column above the captures, from the bottom up. Walkability is not one: it sits in the left corner. */
export type EdgeSlot = 'locate' | 'unwalked' | 'back' | 'compass';
export const EDGE_INDEX: Record<EdgeSlot, number> = { locate: 0, unwalked: 1, back: 2, compass: 3 };

/** The gap between the layers button and what sits above it (the pills). */
const CORNER_GAP = 8;

export type Corner = { left: number; bottom: number; top: number };

/**
 * The layers button's place (WK13): the bottom-left corner, above the scale bar, so the navigation bar at the
 * top never reaches it and its legend opens upward over open map. Distances from the screen's bottom.
 */
export function layersCorner(o: { barTop: number; sideInset: number; scaleBottom: number; scaleH: number; edge: number }): Corner {
  const bottom = o.barTop + o.scaleBottom + o.scaleH + CORNER_GAP;
  return { left: o.sideInset + 12, bottom, top: bottom + o.edge };
}

/** The pills' bottom: above the layers button, which shares their corner. */
export function pillsBottom(corner: Corner): number {
  return corner.top + CORNER_GAP;
}
