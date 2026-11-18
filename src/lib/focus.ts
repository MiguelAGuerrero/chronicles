// @layer adapter
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';
import { returnTarget, trapStep, type TrapFrom } from './atlas/focusOrder';

type Ref = { current: unknown };

/**
 * Moves screen-reader (native) or keyboard (web) focus to a component.
 * findNodeHandle does not exist on web, where the ref is the DOM element.
 */
export function focusOn(ref: Ref) {
  const target = ref.current;
  if (!target) return;
  if (Platform.OS === 'web') {
    (target as { focus?: () => void }).focus?.();
    return;
  }
  const node = findNodeHandle(target as Parameters<typeof findNodeHandle>[0]);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
}

const web = () => Platform.OS === 'web' && typeof document !== 'undefined';

/** The element with keyboard focus on the web; null on a phone, and when the page itself has it. */
function focusedNow(): Element | null {
  if (!web()) return null;
  const a = document.activeElement;
  return a && a !== document.body && a !== document.documentElement ? a : null;
}

/** Focus back to `opener` while it is on the page, else to `fallback` (`returnTarget`). */
function giveBack(opener: Element | null, fallback?: Ref) {
  const to = returnTarget(opener ? (opener.isConnected ? 'there' : 'gone') : 'none', !!fallback?.current);
  if (to === 'opener') focusOn({ current: opener });
  else if (to === 'fallback' && fallback) focusOn(fallback);
}

/**
 * A surface over the page (the area card, the walk planner) gives focus back to what opened it as it closes, as
 * react-native-web's Modal and the HTML dialog element do (tend explore 27). What had focus as it mounted is the opener:
 * call this before the surface moves focus into itself. On the web only; a phone has no focused element to read.
 */
export function useFocusReturn() {
  useEffect(() => {
    const opener = focusedNow();
    return () => giveBack(opener);
  }, []);
}

/**
 * A part of a surface that takes the place of what was pressed (the card's question, in place of Walk to): as `open`
 * turns on, focus goes `into` it; as it turns off, back to what had focus, or to `fallback` when that went with the
 * swap (tend explore 27). Open as the surface mounts, it leaves the first focus to the surface.
 */
export function useFocusSwap(open: boolean, into: Ref, fallback: Ref) {
  const was = useRef(open);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    if (open === was.current) return;
    was.current = open;
    if (open) {
      opener.current = focusedNow();
      focusOn(into);
      return;
    }
    giveBack(opener.current, fallback);
    opener.current = null;
  }, [open, into, fallback]);
}

/** What Tab stops at inside `box`, in the page's order. */
function tabStops(box: HTMLElement): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
    .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0);
}

/**
 * While `active`, Tab and Shift+Tab stay inside `ref`'s element on the web, wrapping at either end (`trapStep`; tend
 * explore 27): a full-screen surface that is not a Modal. On a phone `accessibilityViewIsModal` does it.
 */
export function useFocusTrap(ref: Ref, active: boolean) {
  useEffect(() => {
    if (!active || !web()) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
      const box = ref.current as HTMLElement | null;
      if (!box || typeof box.querySelectorAll !== 'function') return;
      const stops = tabStops(box);
      const a = document.activeElement;
      const at = stops.indexOf(a as HTMLElement);
      const from: TrapFrom = !a || !box.contains(a) ? 'outside'
        : at >= 0 ? { on: at }
        : { before: stops.filter((s) => a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING).length };
      const next = trapStep(from, stops.length, e.shiftKey);
      if (next == null) return;
      e.preventDefault();
      stops[next].focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref, active]);
}
