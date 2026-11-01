import { FadeInUp, FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { successFeedback, tapFeedback, warnFeedback } from './haptics';
import { MOTION } from './motionTokens';

export { durationFor, MOTION, PRESS_SCALE } from './motionTokens';
export { useReducedMotion };

/**
 * Motion for the app (the "Polish: motion" tab). Effects run on Reanimated's
 * UI thread or as the map's own camera moves, never through React state per
 * frame (M3). Reanimated follows the system's reduce-motion setting by itself
 * (`ReduceMotion.System`), on the web through `prefers-reduced-motion`, so
 * the e2e forces it with `emulateMedia` (M2).
 */

/** A pill or banner lifting in: a fade with a short rise, and a fade out (M7). */
export const liftIn = FadeInUp.duration(MOTION.lift).withInitialValues({ transform: [{ translateY: 8 }] }).reduceMotion(ReduceMotion.System);
export const liftOut = FadeOut.duration(MOTION.fast).reduceMotion(ReduceMotion.System);

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
