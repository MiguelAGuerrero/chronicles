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
  /** The one spring: settles without a visible bounce. */
  spring: { damping: 28, stiffness: 240, mass: 1 },
} as const;

export type MotionToken = 'fast' | 'base' | 'lift' | 'camera' | 'ease' | 'pulse';

/** Large buttons shrink to this while pressed (M4). */
export const PRESS_SCALE = 0.97;

/** With reduce motion on, every effect is instant (M2). */
export const durationFor = (token: MotionToken, reduced: boolean): number => (reduced ? 0 : MOTION[token]);
