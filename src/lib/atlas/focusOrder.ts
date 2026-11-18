// @layer core

/**
 * Where keyboard focus goes as a surface over the page opens and closes (tend explore 27; WCAG 2.2, 2.4.3 Focus
 * Order and 2.4.11 Focus Not Obscured). The platform's way, as react-native-web's Modal, the HTML dialog element and
 * Material's dialogs do it: focus moves into the surface as it opens, Tab stays inside it while it covers the page, and
 * on close "focus returns to the interactive element that initiated the action" (docs/research/ui-references.md, X5).
 * `lib/focus` reads the page and moves focus; these decide.
 */

/** Whether what had focus as a surface opened is still on the page: 'none' when nothing (the page itself) had it. */
export type Opener = 'there' | 'gone' | 'none';

/** Where focus goes as a surface closes: back to its opener while that is still there, else to the fallback given. */
export function returnTarget(opener: Opener, hasFallback: boolean): 'opener' | 'fallback' | null {
  if (opener === 'there') return 'opener';
  return hasFallback ? 'fallback' : null;
}

/**
 * Where focus is as Tab is pressed in a trap: on its stop `on`, on something inside that Tab does not stop at with
 * `before` stops ahead of it in the page's order, or outside the trap.
 */
export type TrapFrom = { on: number } | { before: number } | 'outside';

/**
 * The stop Tab (or Shift+Tab, `back`) goes to in a trap of `count` stops. It wraps at either end, so focus never leaves;
 * null with no stop, where Tab is left to the browser.
 */
export function trapStep(from: TrapFrom, count: number, back: boolean): number | null {
  if (count <= 0) return null;
  if (from === 'outside') return back ? count - 1 : 0;
  const next = 'on' in from ? from.on + (back ? -1 : 1) : back ? from.before - 1 : from.before;
  return ((next % count) + count) % count;
}
