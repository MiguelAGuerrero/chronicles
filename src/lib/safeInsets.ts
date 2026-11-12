// @layer core
/**
 * The safe area on the web (fix memories-weird-state). The insets are the `env(safe-area-inset-*)`
 * paddings alone. react-native-safe-area-context's web provider also clamps them against
 * `window.innerWidth/innerHeight`, which iOS Safari reports as the visual viewport: under a 2x pinch
 * (a photo in the viewer) they halve, and a resize measured then read as bottom and right insets of
 * half the screen. The tab bar grew by that much and squeezed its three tabs into one point until a
 * reload. The app's provider fills the window, so the clamp has nothing to do; this rule takes no viewport.
 */

export type Insets = { top: number; right: number; bottom: number; left: number };
export type Paddings = { paddingTop: string; paddingRight: string; paddingBottom: string; paddingLeft: string };

const px = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** A probe's computed paddings (`env(safe-area-inset-*)`) as insets; an empty or unparsed one is 0. */
export function insetsFromPaddings(p: Paddings): Insets {
  return { top: px(p.paddingTop), right: px(p.paddingRight), bottom: px(p.paddingBottom), left: px(p.paddingLeft) };
}

export const sameInsets = (a: Insets, b: Insets) => a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;

/**
 * The page's viewport with `viewport-fit=cover` (fix home-indicator, the owner's Home Screen app, Nov 12). Without it
 * iOS reports every `env(safe-area-inset-*)` as 0, so the bottom bars sat in the home-indicator strip. The page's own
 * width and scale are kept; an existing fit is replaced.
 */
export function coverViewport(content: string | null): string {
  const parts = (content ?? 'width=device-width, initial-scale=1')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !/^viewport-fit\s*=/i.test(p));
  return [...parts, 'viewport-fit=cover'].join(', ');
}
