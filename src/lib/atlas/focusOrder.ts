// @layer core

/**
 * Where keyboard focus goes as a surface over the page opens and closes (tend explore 27; WCAG 2.2, 2.4.3 Focus
 * Order and 2.4.11 Focus Not Obscured). The platform's way, as react-native-web's Modal, the HTML dialog element and
 * Material's dialogs do it: focus moves into the surface as it opens, Tab stays inside it while it covers the page, and
 * on close "focus returns to the interactive element that initiated the action" (docs/research/ui-references.md, X5).
 * `lib/focus` reads the page and moves focus; these decide.
 */

/**
 * Where focus goes as a surface closes: to the first of `there` (whether each candidate, in order of preference, is still
 * shown) that is, and only when focus fell to the page with the surface ('page'). Focus a person has moved elsewhere
 * (another tile chosen while a side card closes) stays where it is (tend explore audit 37), as the HTML dialog element
 * gives focus back only from inside itself.
 */
export function returnTarget(focusNow: 'page' | 'elsewhere', there: boolean[]): number | null {
  if (focusNow === 'elsewhere') return null;
  const i = there.indexOf(true);
  return i < 0 ? null : i;
}

/**
 * Where focus is as Tab is pressed in a trap: on its stop `on`, on something inside that Tab does not stop at with
 * `before` stops ahead of it in the page's order, outside the trap, on the page itself ('page': nothing focused, after a
 * click on text), or inside a modal above the trap ('above': the note page over the planner).
 */
export type TrapFrom = { on: number } | { before: number } | 'outside' | 'page' | 'above';

/**
 * The stop Tab (or Shift+Tab, `back`) goes to in a trap of `count` stops, or null where the browser's own move stands.
 * It wraps only at the two ends, so between them the browser's order holds, every stop it has (tend explore audit 38);
 * from the page the browser goes on from where a click left it, and a move that strays out is caught after (audit 39); a
 * modal above has the keyboard (audit 36).
 */
export function trapStep(from: TrapFrom, count: number, back: boolean): number | null {
  if (count <= 0 || from === 'page' || from === 'above') return null;
  if (from === 'outside') return back ? count - 1 : 0;
  if ('on' in from) {
    if (!back && from.on === count - 1) return 0;
    if (back && from.on === 0) return count - 1;
    return null;
  }
  if (!back && from.before >= count) return 0;
  if (back && from.before <= 0) return count - 1;
  return null;
}
