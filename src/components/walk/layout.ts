import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The walk screen's geometry, shared by its ready state and the walk (NR5,
 * NR6, NR9): the bottom strip, the capture stack at the right edge and the
 * small edge buttons above it. Both states place everything from these, so
 * Start records in place and nothing moves under the thumb.
 */

/** The bottom strip above the safe area: 10 + 48 (its buttons) + 10, and its 1 px top line. */
export const BAR_H = 69;
/** The capture buttons (camera, mic, note): a thumb's target, smaller than the old row's 68. */
export const CAP = 56;
/** The memo's Discard, set apart from Save by size. */
export const CAP_SMALL = 48;
/** Between the stack's buttons, and between the stack and the strip. */
export const STACK_GAP = 12;
/** The small round edge buttons (Locate or Recenter, unwalked streets, walk me back). */
export const EDGE = 44;
/** Between the captures and the first edge button above them. */
const EDGE_LIFT = 16;

/** Capture slots, from the strip up: the camera nearest the thumb. */
export type CapSlot = 'photo' | 'voice' | 'note';
const CAP_INDEX: Record<CapSlot, number> = { photo: 0, voice: 1, note: 2 };
/** Edge slots above the captures, from the bottom up. */
export type EdgeSlot = 'locate' | 'unwalked' | 'back';
const EDGE_INDEX: Record<EdgeSlot, number> = { locate: 0, unwalked: 1, back: 2 };

/** The stack's column: its right edge inside the 640 column on wide screens, and every slot's bottom. */
export function useStackLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const right = Math.max(12, (width - 640) / 2 + 12);
  const sideInset = Math.max(12, (width - 640) / 2);
  /** The strip's top, from the screen's bottom. */
  const barTop = insets.bottom + BAR_H;
  const capBottom = (s: CapSlot) => barTop + STACK_GAP + CAP_INDEX[s] * (CAP + STACK_GAP);
  const capsTop = capBottom('note') + CAP;
  const edgeBottom = (s: EdgeSlot) => capsTop + EDGE_LIFT + EDGE_INDEX[s] * (EDGE + STACK_GAP);
  return {
    insets,
    sideInset,
    barTop,
    /** The captures' right edge. */
    right,
    /** An edge button's right edge: centred on the captures' column. */
    edgeRight: right + (CAP - EDGE) / 2,
    capBottom,
    edgeBottom,
    /** The pills' area: left of the stack, just above the strip. */
    pills: { left: sideInset + 12, right: right + CAP + STACK_GAP, bottom: barTop + STACK_GAP },
  };
}
