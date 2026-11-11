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
  /** A tooltip stays open this long when nothing closes it (WK22). */
  tip: 4000,
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
 * Whether a browser is offered the pocket alert (PA6, audit 4, decision 0138).
 * It needs `navigator.vibrate` and a touch screen: desktop Chrome has vibrate
 * and no motor; iPhone Safari has no vibrate, and expo-haptics' switch-haptic
 * fallback fires only from a tap, never from a location update, so there the
 * alert would be offered and never felt.
 */
export const buzzOffered = (env: { vibrate: boolean; coarse: boolean }): boolean => env.vibrate && env.coarse;

/** On the web only the pocket alert plays, and only where the browser is offered it (decision 0138, fix pocket-alert-hide audit 1: a saved switch stays silent where it is hidden). */
export const webFeedbackPlays = (kind: FeedbackKind, offered: boolean): boolean => kind === 'nudge' && offered;

/** Large buttons shrink to this while pressed (M4). */
export const PRESS_SCALE = 0.97;

/** With reduce motion on, every effect is instant (M2). */
export const durationFor = (token: MotionToken, reduced: boolean): number => (reduced ? 0 : MOTION[token]);

/**
 * The replay's rhythm (RR1-RR16, decision 0085): the prototype's numbers
 * (https://claude.ai/artifact/XouW4WPy8e2yPQWYsYDUNc), in milliseconds unless
 * named in metres. The owner's tuned settings change only this object.
 */
export const REPLAY_RHYTHM = {
  /** A stretch between nearby moments. */
  glide: 1800,
  /** Added to a glide for a long, empty stretch, however long. */
  zip: 900,
  /** A stretch is long from here (metres), and gets its full zip at zipAtM + zipFullM. */
  zipAtM: 450,
  zipFullM: 1200,
  /** The camera's pull-back at the middle of a long stretch (1 is the walking zoom). */
  zoomOut: 1.7,
  /** Travel between a day's entries pulls back to show this many metres per unit of zoom-out, at least `zoomOut`. */
  travelZoomM: 1500,
  /** The walking zoom, where the camera follows the walker. */
  baseZoom: 16,
  /** Stretches shorter than this (metres) are not played: the walker steps across them. */
  minLegM: 10,
  /** A cut across a break in the trace. */
  cut: 1400,
  /** A note's pause: this for up to noteWords words, plus notePerFive per five more, at most noteMax. */
  note: 800,
  noteWords: 12,
  notePerFive: 200,
  noteMax: 3000,
  /** A photo's card on screen, from growing to tucked away. */
  photo: 2400,
  /** A card growing from its pin, and tucking into the pile. */
  grow: 380,
  tuck: 480,
  /** A stack's grid (moment stacks MS17): each piece swipes in this long after the one before, and one past nine scrolls the grid this long. */
  gridStagger: 180,
  gridScroll: 2400,
  /** After a memo, before the walker moves on. */
  mediaTail: 400,
  /** Shortest a memo or video slot is, whatever its stored length. */
  mediaMin: 1000,
  /** Waiting for a medium (audit 20): one that never starts, how far behind counts as late, and the most for one that plays (the camera's cap). */
  mediaStartWait: 2000,
  mediaLag: 400,
  mediaMaxWait: 30_000,
  /** Bubbles: how long one stays, how many at once, coming in and going. */
  bubbleLife: 9000,
  bubbles: 3,
  bubbleIn: 280,
  bubbleOut: 420,
  /** A passed place's line beside it. */
  whisper: 2600,
  /** Travel this much later says so under the clock. */
  laterAfterMs: 15 * 60_000,
  /** How long "N min later" stays after its cut or travel. */
  lineAfter: 1500,
  /** Zooming in to the walker at the start, and standing at the end before the card. */
  intro: 900,
  /** How far out the camera starts before zooming in to the walker. */
  introZoomOut: 2.2,
  rest: 800,
  /** The soft cap on the path (RR5), and the floors nothing shrinks below. */
  cap: 60_000,
  floors: { leg: 600, photo: 1200, note: 300, cut: 600, intro: 300, rest: 300 },
} as const;
