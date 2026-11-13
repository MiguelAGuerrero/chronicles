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

/**
 * Room under the bar's controls for the keyboard's own floating row (fix keyboard-accessory, the owner's iPhone,
 * Nov 13): previous, next and a tick, which the phone draws as a pill over the page just above the keys. The page
 * is not told about it, it cannot be turned off from a web page, and the keyboard's measured height does not
 * include it, so it sat on the bar's camera, mic and Done. An estimate from the owner's screenshot.
 */
export const ACCESSORY_ROOM = 56;

/**
 * Whether this browser floats that row over the page: an iPhone or iPad (an iPad asking for the desktop site says
 * Macintosh, with touch) on the engine that began to. The Home Screen app's agent names no version and the system's
 * is frozen, so the engine is asked for something it gained in the same release.
 */
export function floatsAccessory(o: { ua: string; touchPoints: number; supports: (query: string) => boolean }): boolean {
  const apple = /iPhone|iPad|iPod/.test(o.ua) || (/Macintosh/.test(o.ua) && o.touchPoints > 1);
  return apple && o.supports('anchor-name: --a');
}

/** The room the bar keeps beneath its controls: only while the keyboard is up, and only where the row floats. */
export function accessoryRoom(o: { keyboard: number; floating: boolean }): number {
  return o.floating && o.keyboard > 0 ? ACCESSORY_ROOM : 0;
}
