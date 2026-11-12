// @layer core
/**
 * How far the page's foot must lift for a browser's keyboard (chronicle journal JN19): the part of the layout
 * viewport the visual viewport no longer shows at its bottom. Never negative; nothing while the page is zoomed.
 */
export function keyboardLift(layoutHeight: number, visualHeight: number, visualTop: number, scale = 1): number {
  if (scale > 1.01) return 0;
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualTop));
}
