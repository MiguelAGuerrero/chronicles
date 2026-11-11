// @layer core
/**
 * How far a note being written must rise to clear the on-screen keyboard on the web (fix note-keyboard-zoom).
 * Unzoomed it is what the visual viewport leaves at the foot of the layout viewport (fix respond-bottom audit 3).
 * Under a pinch, iOS Safari reports `innerHeight` as the visual viewport, so that read 0 and the note sat under the
 * keyboard; zoomed, the layout viewport's own height (`documentElement.clientHeight`, which a pinch never changes)
 * stands in, and only a visual viewport clearly shorter than the screen is a keyboard: the page below a zoomed
 * view is not.
 */

export type Viewports = {
  /** `window.innerHeight`: the layout viewport, except on iOS under a pinch. */
  innerHeight: number;
  /** `document.documentElement.clientHeight`: the layout viewport, whatever the zoom. */
  layoutHeight: number;
  vvHeight: number;
  vvOffsetTop: number;
  scale: number;
};

/** Above this, the page is pinch-zoomed. */
export const ZOOMED_SCALE = 1.01;
/** Less of the screen than this, hidden under the visual viewport, is Safari's toolbars, never a keyboard. */
export const KEYBOARD_MIN_PX = 150;

export function keyboardInset(v: Viewports): number {
  if (v.scale <= ZOOMED_SCALE) return Math.max(0, Math.round(v.innerHeight - v.vvHeight - v.vvOffsetTop));
  // The screen's height left above the keyboard, in the layout's own pixels.
  const hidden = v.layoutHeight - v.vvHeight * v.scale;
  if (hidden < KEYBOARD_MIN_PX) return 0;
  return Math.max(0, Math.round(v.layoutHeight - v.vvHeight - v.vvOffsetTop));
}
