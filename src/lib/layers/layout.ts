// @layer core

/*
 * Where the Layers panel goes (specs/map-layers ML4; layers audit 1, 3): beside the button, to its left, from the button's top
 * down, so a short phone, where the button sits high, still has room, and nothing but the map is covered. Its width follows
 * the map's own pane (a wide Explore has a narrow map), never the window's.
 */

/** The button, and the gap between it and the panel. */
const BESIDE_PX = 52;
const MARGIN_PX = 8;
const MAX_WIDTH = 312;
const MIN_WIDTH = 220;
const MIN_HEIGHT = 160;

export function panelBox(o: { windowW: number; windowH: number; buttonTop: number; right: number; paneWidth?: number; clearBottom: number }): { width: number; maxHeight: number } {
  const room = (o.paneWidth ?? o.windowW) - o.right - BESIDE_PX - MARGIN_PX;
  return {
    width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, room)),
    maxHeight: Math.max(MIN_HEIGHT, o.windowH - o.buttonTop - o.clearBottom),
  };
}

const CORNER_MIN_WIDTH = 188;

/**
 * The panel of a button in the bottom-left corner (fix layers-corner): to the button's right, its bottom level with the button's,
 * growing upward. It stops short of the capture column on the right and of the top overlay (chevron row, navigation bar).
 */
export function cornerPanelBox(o: { windowW: number; windowH: number; left: number; bottom: number; button: number; rightClear: number; clearTop: number }): { width: number; maxHeight: number } {
  const room = o.windowW - o.left - o.button - 8 - o.rightClear;
  return {
    width: Math.max(CORNER_MIN_WIDTH, Math.min(MAX_WIDTH, room)),
    maxHeight: Math.max(MIN_HEIGHT, o.windowH - o.bottom - o.button - o.clearTop),
  };
}
