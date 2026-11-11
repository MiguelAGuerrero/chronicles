import { useRef } from 'react';
import type { GestureResponderEvent, GestureResponderHandlers } from 'react-native';
import { pinchStep } from '../../lib/gallery/view';

const fingers = (e: GestureResponderEvent) => e.nativeEvent.touches as unknown as ArrayLike<{ pageX: number; pageY: number }> | undefined;
const spread = (e: GestureResponderEvent): number => {
  const t = fingers(e);
  if (!t || t.length < 2) return 0;
  return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
};
const twoFingers = (e: GestureResponderEvent): boolean => (fingers(e)?.length ?? 0) >= 2;

/**
 * A pinch on the grid (MG20), with React Native's own responder (no gesture library): one step per pinch, once the
 * fingers have spread or closed far enough. A single finger is the list's own scroll. Zoom In and Zoom Out in the
 * View menu do the same, so the gesture is never the only way.
 */
export function usePinch(onStep: (dir: 'in' | 'out') => void, enabled: boolean): GestureResponderHandlers {
  const pinch = useRef({ start: 0, done: false });
  const take = (e: GestureResponderEvent) => enabled && twoFingers(e);
  return {
    onStartShouldSetResponderCapture: take,
    onMoveShouldSetResponderCapture: take,
    onResponderGrant: (e) => {
      pinch.current = { start: spread(e), done: false };
    },
    onResponderMove: (e) => {
      const p = pinch.current;
      if (p.done || !twoFingers(e)) return;
      if (!p.start) p.start = spread(e);
      const step = pinchStep(p.start, spread(e));
      if (step) {
        p.done = true;
        onStep(step);
      }
    },
    onResponderRelease: () => {
      pinch.current = { start: 0, done: false };
    },
    onResponderTerminationRequest: () => false,
  };
}
