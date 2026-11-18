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

/** Whether a candidate for focus is still shown: on the page and drawn on the web (tend explore audit 37); set on a phone. */
function shown(target: unknown): boolean {
  if (!target) return false;
  if (!web()) return true;
  const el = target as Element & { checkVisibility?: (o?: object) => boolean };
  if (!el.isConnected) return false;
  return el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : el.getClientRects().length > 0;
}

/**
 * Focus back to the first candidate still shown (`returnTarget`), only when focus fell to the page with what closed: focus
 * a person has moved elsewhere stays there (tend explore audit 37).
 */
function giveBack(candidates: unknown[]) {
  const i = returnTarget(focusedNow() ? 'elsewhere' : 'page', candidates.map(shown));
  if (i != null) focusOn({ current: candidates[i] });
}

/**
 * A surface over the page (the area card, the walk planner) gives focus back to what opened it as it closes, as
 * react-native-web's Modal and the HTML dialog element do (tend explore 27). What had focus as it mounted is the opener:
 * call this before the surface moves focus into itself. `preferId`, an element's `nativeID`, comes before the opener when
 * it is drawn (the tile of the area a card shows, tend explore audit 40). On the web only; a phone has no focused element
 * to read.
 */
export function useFocusReturn(preferId?: string) {
  const prefer = useRef(preferId);
  useEffect(() => {
    prefer.current = preferId;
  }, [preferId]);
  useEffect(() => {
    const opener = focusedNow();
    return () => giveBack([prefer.current && web() ? document.getElementById(prefer.current) : null, opener]);
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
    giveBack([opener.current, fallback.current]);
    opener.current = null;
  }, [open, into, fallback]);
}

/** What Tab stops at inside `box`, in the page's order: every element the browser stops at (tend explore audit 38). */
const STOPS = 'a[href], area[href], button, input, select, textarea, summary, iframe, audio[controls], video[controls], '
  + '[contenteditable]:not([contenteditable="false"]), [tabindex]';
function tabStops(box: HTMLElement): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>(STOPS)]
    .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0);
}

/**
 * Whether a modal dialog other than `box`'s own is open over it (react-native-web's Modal sets `aria-modal`, and keeps
 * its own trap, with focus brackets outside its content).
 */
function modalAbove(box: HTMLElement): boolean {
  return [...document.querySelectorAll('[aria-modal="true"]')].some((m) => !box.contains(m));
}

/**
 * While `active`, Tab and Shift+Tab stay inside `ref`'s element on the web (tend explore 27): a full-screen surface that is
 * not a Modal. It wraps at the two ends (`trapStep`) and leaves every other move to the browser (audits 38, 39), bringing
 * back in a move that strays out; it stands aside while focus is in a modal above it, whose own trap has the keyboard
 * (audit 36). On a phone `accessibilityViewIsModal` does it.
 */
export function useFocusTrap(ref: Ref, active: boolean) {
  useEffect(() => {
    if (!active || !web()) return;
    let back = false;
    const boxOf = () => {
      const box = ref.current as HTMLElement | null;
      return box && typeof box.querySelectorAll === 'function' ? box : null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
      back = e.shiftKey;
      const box = boxOf();
      if (!box) return;
      const stops = tabStops(box);
      const a = focusedNow();
      const at = a ? stops.indexOf(a as HTMLElement) : -1;
      const from: TrapFrom = modalAbove(box) ? 'above'
        : !a ? 'page'
        : !box.contains(a) ? 'outside'
        : at >= 0 ? { on: at }
        : { before: stops.filter((s) => a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING).length };
      const next = trapStep(from, stops.length, back);
      if (next == null) return;
      e.preventDefault();
      stops[next].focus();
    };
    // A move the browser made out of the box (from the page, after a click on text) comes back in at the end it left by.
    // Where focus is now, which a modal's own trap may already have moved on from the event's target.
    const onFocus = () => {
      const box = boxOf();
      const t = focusedNow();
      if (!box || !t || box.contains(t) || modalAbove(box)) return;
      const stops = tabStops(box);
      const next = trapStep('outside', stops.length, back);
      if (next != null) stops[next].focus();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
    };
  }, [ref, active]);
}
