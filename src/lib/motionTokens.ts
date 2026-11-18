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
  /** Explore's toast stays this long, then goes by itself ("Zoom in to look closer"; decision 0172, O7; tend explore audit 14). */
  exploreToast: 3000,
  /** The walk screen's toast stays this long ("Hold to stop the walk"; decision 0172, O23). */
  walkToast: 1500,
  /** The walk screen's arrival line ("You've arrived") stays this long (O23). */
  arrival: 4000,
  /** The walk screen's dead-zone nudge (L15) stays this long, once seen (O23). */
  deadZoneNudge: 20_000,
  /** Focus moves to Save this long after the mic turns into it, mid-memo (O23). */
  saveFocus: 300,
  /** A walk's notice that is not sticky ("Walk started · recording") stays this long (O23). */
  walkNotice: 6000,
  /** A reminder fired on a walk stays this long, on the walk's card and on the recording bar (R7; O23). */
  reminder: 30_000,
  /** The moment bar's toast on the ready screen ("Too short, not kept") stays this long (O23). */
  momentToast: 4000,
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

/** A note page is kept this long after the last keystroke (NP9, decision 0151): Journal's save-as-you-write. */
export const NOTE_SAVE_PAUSE = 1000;

/** With reduce motion on, every effect is instant (M2). */
export const durationFor = (token: MotionToken, reduced: boolean): number => (reduced ? 0 : MOTION[token]);

/**
 * Whether a sheet's move to its height is set rather than sprung (tend tabs T38): every move with reduce motion (M2),
 * and a peek's move on the sheet's mount or on the move its screen's first read asks for (Chronicle with nothing
 * walked, 76 to 124), so nothing rises at launch; a first read that lands while a spring runs springs on from it,
 * never jumps (tend tabs audit 38). Every other move springs, before the first read too (tend tabs audit 37), and
 * half and full always: M5's spring holds for every move after the first known height (the owner, Nov 18).
 */
export const sheetMoveSnaps = (m: { reduced: boolean; peek: boolean; mount: boolean; firstKnown: boolean; moving: boolean }): boolean =>
  m.reduced || (m.peek && (m.mount || (m.firstKnown && !m.moving)));

/**
 * The replay's rhythm (RR1-RR16, decision 0085) and its pace (RY1-RY22, decision 0203): the prototypes' numbers
 * (https://claude.ai/artifact/XouW4WPy8e2yPQWYsYDUNc, https://claude.ai/artifact/7oLxtuZMhpvXd18H4BLR5P), in
 * milliseconds unless named in metres or as a share. The owner's tuned settings change only this object. Nothing
 * shrinks to fit a total: there is no cap (RY10).
 */
export const REPLAY_RHYTHM = {
  /** A stretch between nearby moments (RY9). */
  glide: 2000,
  /** Added to a glide for a long, empty stretch, however long (RY9). */
  zip: 2000,
  /** The walker's pace along a stretch (RY8): it reaches a steady pace in `paceIn` (at most this share of the stretch) and slows over `paceOut`. */
  paceIn: 350,
  paceInMax: 0.35,
  paceOut: 550,
  paceOutMax: 0.4,
  /** A stretch is long from here (metres), and gets its full zip at zipAtM + zipFullM. */
  zipAtM: 450,
  zipFullM: 1200,
  /** The walking zoom (replay ceremony RC11): it was 16, and each step down shows twice the ground. */
  baseZoom: 15,
  /**
   * The camera (replay ceremony RC12-RC14; `lib/ceremony/camera.ts`). It keeps what it follows `focusY` of the way down
   * the screen. The middle of the screen, where the walker moves and the camera holds still: `holdX` of the width each
   * side of that point, `holdUp` of the height above it and `holdDown` below.
   */
  focusY: 0.42,
  holdX: 0.27,
  holdUp: 0.2,
  holdDown: 0.13,
  /** A re-frame (RC12): how long it takes, and where it ends: `reframeAhead` of the way from where the walker will be then to where it will be `reframeLook` later. */
  reframe: 1200,
  reframeLook: 700,
  reframeAhead: 0.6,
  /** The most of the screen's width the walker crosses a second (RC13): past it the camera rises. `riseSoft` rounds the rise's start and end (higher is sharper); under `risen` zoom levels it counts as not risen. */
  maxCross: 0.35,
  riseSoft: 4,
  risen: 0.02,
  /** Risen, the camera goes after where the walker will be `followLead` on, `followEase` behind it, and never more than a `followLand`th of the time the stretch has left, so it lands with the walker. */
  followLead: 900,
  followEase: 450,
  followLand: 3,
  /** Arriving at a card (RC14): the camera starts to settle this long before the walker stops, takes at least `settleMin`, and `settle` when no stretch leads there; from a risen stretch it closes in with `settleEase`. */
  settleLead: 900,
  settleMin: 300,
  settle: 700,
  settleEase: 250,
  /** A card's pin stands on its place this far under the card's lower edge (px: the pin's own 44 and 8 to spare), never nearer the screen's foot than `edge`. */
  pinUnder: 52,
  edge: 24,
  /** The camera's moves are worked out ahead in steps of this long (never per frame). */
  camStep: 50,
  /** Stretches shorter than this (metres) are not played: the walker steps across them. */
  minLegM: 10,
  /**
   * A break in the trace (replay ceremony RC17-RC22): the camera pulls back until both ends fit, a dotted line draws
   * across, the walker slides along it and the camera closes in. A far one (`breakFarM` metres or more) takes
   * `breakFar`; a nearer one less, never under `breakNear` of that. One whose ends are under `standPx` px apart at the
   * walking zoom is a stand of `stand` ms: no hop, no camera move.
   */
  breakFar: 4200,
  breakNear: 0.58,
  breakFarM: 250,
  standPx: 26,
  stand: 1300,
  /** A hop's parts, as shares of its time: the camera has pulled back by `hopPull`; the dots draw from `hopDraw` to `hopDrawn`; the walker slides from there to `hopLand`; the camera closes in from `hopClose`; the clock changes at `hopSwitch`. */
  hopPull: 0.3,
  hopDraw: 0.22,
  hopDrawn: 0.4,
  hopLand: 0.66,
  hopClose: 0.72,
  hopSwitch: 0.53,
  /** Pulled back, a hop's two ends fit in this share of the screen's width and of its height. */
  hopFitW: 0.56,
  hopFitH: 0.3,
  /** "N min later" (RC19): at a stand it comes `standLineIn` after the stand begins; it stays `breakLineAfter` after a break ends. The clock dissolves from one time to the other over `clockDissolve` each way. */
  standLineIn: 150,
  breakLineAfter: 600,
  clockDissolve: 220,
  /** The walker's wait at a note (RY5): this for up to noteWords words, plus notePerWord for each more, at most noteMax. */
  note: 1200,
  noteWords: 6,
  notePerWord: 250,
  noteMax: 5000,
  /** How long a note's bubble stays at the least once fully shown, so it can be read (RY7): this plus readPerWord a word, never past its life. */
  noteRead: 1500,
  readPerWord: 300,
  /** A photo on its own, fully shown (RY1), between growing and tucking. */
  photoHold: 4500,
  /** The first photo, and one after `longM` metres with nothing kept, is shown this much longer (RY2). */
  photoFirst: 1.2,
  longM: 550,
  /** Photos at one stop tighten by this share each, never under `stopFloor` of photoHold; the last is whole again (RY3). */
  stopTighten: 0.12,
  stopFloor: 0.55,
  /** A stack's grid stays this long after its last piece has swiped in (RY4). */
  gridHold: 5000,
  /** A card growing from its pin, and tucking into the pile (RY1). */
  grow: 550,
  tuck: 450,
  /** A stack's grid (moment stacks MS17): each piece swipes in this long after the one before, and one past nine scrolls the grid this long. */
  gridStagger: 180,
  gridScroll: 2400,
  /** After a memo ends, before the walker moves on; and a video's card standing after its video ends (RY6). */
  mediaTail: 1000,
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
  /** How long "N min later" stays after a day's long travel. */
  lineAfter: 1500,
  /** Zooming in to the walker at the start, and standing at the end before the card. */
  intro: 900,
  /** How far out the camera starts before zooming in to the walker. */
  introZoomOut: 2.2,
  rest: 800,
  /** A press of Next lands this long before the next moment begins (RY13). */
  nextLead: 450,
  /** After a press, "N min later" stays this long under the clock before any passed place is said (RY21). */
  jumpLine: 2000,
} as const;

/**
 * The replay's engine (replay ceremony RC6, decision 0206), apart from any ceremony: a ceremony says what a time shows,
 * the engine how often it is drawn. `frameMs` is the least time between two frames the replay draws: 0 draws every
 * display frame (60 a second on an iPhone); 1000 / 30 draws 30. It is the one number to set after watching on a phone
 * whose map cannot be drawn every frame (a replay's link can ask for one with `fps`, to try it without a build).
 * `resendMs` is for a map that cannot reveal a line and is sent it as data instead (the phone's, untried): at most
 * ten times a second.
 */
export const REPLAY_ENGINE = {
  frameMs: 0,
  resendMs: 100,
} as const;
