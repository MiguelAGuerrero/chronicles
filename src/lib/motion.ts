import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { successFeedback, tapFeedback, warnFeedback } from './haptics';

export { durationFor, MOTION, PRESS_SCALE } from './motionTokens';

/**
 * Motion for the app (the "Polish: motion" tab), on React Native's own
 * Animated: transforms and opacity on the phone's native thread, nothing per
 * frame through React state (M3), and no extra library in the web build (the
 * owner's call, Nov 1: Reanimated added 140 KB gzipped for four effects).
 */

/** The system's reduce-motion setting at launch, read synchronously on the web so the first frame is right. */
let reducedNow = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
AccessibilityInfo.isReduceMotionEnabled().then((v) => (reducedNow = v), () => {});

/** Reduce motion, kept live: a change during a session applies at once (M2, audit 3). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(reducedNow);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reducedNow = v;
      if (alive) setReduced(v);
    }, () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => {
      reducedNow = v;
      setReduced(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** Native driver where it exists: react-native-web runs Animated in JavaScript. */
export const nativeDriver = Platform.OS !== 'web';

export type FeedbackKind = 'tap' | 'success' | 'warning';

/**
 * One feedback call per action (M8): a haptic on phones, nothing on web. No
 * sounds yet; when they come, they are opt-in and must not use the memo's
 * audio session, which plays with the ringer switch off.
 */
export function feedback(kind: FeedbackKind): void {
  if (kind === 'tap') tapFeedback();
  else if (kind === 'success') successFeedback();
  else warnFeedback();
}
