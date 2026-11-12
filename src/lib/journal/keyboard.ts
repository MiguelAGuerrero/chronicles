// @layer core
/**
 * How far the page's foot must lift for a browser's keyboard (chronicle journal JN19): the part of the layout
 * viewport the visual viewport no longer shows at its bottom. Never negative; nothing while the page is zoomed.
 */
export function keyboardLift(_layoutHeight: number, _visualHeight: number, _visualTop: number, _scale = 1): number {
  return -1;
}
