// @layer core
/**
 * The app's one set of timings (motion M1). Short and physical: a settle, a
 * press, a lift, never a celebration (the restraint rule). Pure, so tests can
 * import it; the hooks and feedback live in `motion.ts`.
 */
export const MOTION = {
  /** A press and its release. */
  fast: 120,
  /** A sheet or card moving between states. */
  base: 220,
  /** A pill or banner lifting in. */
  lift: 180,
  /** A camera fit. */
  camera: 600,
  /** A camera ease to one point (a selected star). */
  ease: 400,
  /** One beat of a pulse (the recording dot). */
  pulse: 500,
  /** Between the pocket alert's two taps: one nudge, felt as two (PA1). */
  nudgeGap: 120,
  /** The one spring: settles without a visible bounce. */
  spring: { damping: 28, stiffness: 240, mass: 1 },
} as const;

export type MotionToken = 'fast' | 'base' | 'lift' | 'camera' | 'ease' | 'pulse';

/** The one feedback call's kinds (M8): `nudge` is the pocket alert (PA1). */
export type FeedbackKind = 'tap' | 'success' | 'warning' | 'nudge';

/** A haptic step: an impact of a weight, or one of the system's notification patterns. */
export interface HapticStep {
  at: number;
  weight: 'light' | 'medium' | 'success' | 'warning';
}

/**
 * Each feedback kind as steps in time (PA1, PA4). A button press is one light
 * tap; the pocket alert is two firmer ones, so a nudge in a pocket is never
 * taken for a stray touch.
 */
export const HAPTIC_PATTERNS: Record<FeedbackKind, readonly HapticStep[]> = {
  tap: [{ at: 0, weight: 'light' }],
  success: [{ at: 0, weight: 'success' }],
  warning: [{ at: 0, weight: 'warning' }],
  nudge: [
    { at: 0, weight: 'medium' },
    { at: MOTION.nudgeGap, weight: 'medium' },
  ],
};

/**
 * A nudge within three gaps of the last one is dropped (audit 6): two
 * double-taps run together read as one long buzz.
 */
export const nudgeAllowed = (lastAt: number | null, now: number): boolean => lastAt === null || now - lastAt >= MOTION.nudgeGap * 3;

/**
 * Whether a browser is offered the pocket alert (PA6, audit 4). expo-haptics'
 * web build vibrates where `navigator.vibrate` exists and otherwise tries
 * iPhone Safari's switch haptic on a touch screen; only a touch screen has a
 * motor to feel (desktop Chrome has `navigator.vibrate` and nothing to buzz).
 */
export const buzzOffered = (env: { vibrate: boolean; coarse: boolean }): boolean => env.coarse;

/** Large buttons shrink to this while pressed (M4). */
export const PRESS_SCALE = 0.97;

/** With reduce motion on, every effect is instant (M2). */
export const durationFor = (token: MotionToken, reduced: boolean): number => (reduced ? 0 : MOTION[token]);
