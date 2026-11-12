// @layer core
/**
 * How far the page's foot must lift for a browser's keyboard (chronicle journal JN19): the part of the layout
 * viewport the visual viewport no longer shows at its bottom. Never negative; nothing while the page is zoomed.
 */
export function keyboardLift(layoutHeight: number, visualHeight: number, visualTop: number, scale = 1): number {
  if (scale > 1.01) return 0;
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualTop));
}

/**
 * How far the open line rises for a keyboard (audit 1): what the keyboard covers above whatever sits between the
 * line and the screen's foot (the tab bar, the recording bar), which the keyboard covers first.
 */
export function lineLift(keyboard: number, below: number): number {
  return Math.max(0, Math.round(keyboard - below));
}
