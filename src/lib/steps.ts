/**
 * Telling walking from standing by the phone's motion (Motion, MO3, MO4).
 * GPS can't tell 10 m of drift from a walk; steps can. Steps are found from
 * the acceleration's size with gravity taken out, the same on every platform
 * (Expo's Pedometer has no web build). Pure: samples in, a state out, on the
 * samples' own clock.
 */
export const STEPS = {
  /** Gravity is followed by a slow average of the acceleration's size (time constant, ms). */
  gravityMs: 1000,
  /** The bounce is lightly smoothed (time constant, ms), so a sharp tap barely registers. */
  smoothMs: 80,
  /** A step is a peak of at least this much bounce (m/s²): a gentle walk with the phone held flat gives about 1. */
  peak: 0.6,
  /** Between two steps the bounce dips at least this far below rest (m/s²): a tap on the screen only spikes up. */
  dip: 0.3,
  /** Steps come 0.3-1 s apart (1-3.3 a second). */
  minGapMs: 300,
  maxGapMs: 1000,
  /** Walking: this many steps, evenly spaced, within the last windowMs. */
  steps: 3,
  windowMs: 3000,
  /** Evenly spaced: the longest gap at most this many times the shortest. */
  evenRatio: 1.6,
  /** Still: no step for this long. */
  stillAfterMs: 3000,
  /** No samples for this long: unknown (the sensors stopped, or the page was hidden). */
  gapMs: 2000,
  /** Fewer samples than this long since starting: unknown. */
  warmMs: 1500,
} as const;

export interface MotionSample {
  /** ms */
  t: number;
  /** Acceleration including gravity, m/s². */
  x: number;
  y: number;
  z: number;
}

export type MotionState = 'walking' | 'still' | 'unknown';

export class StepDetector {
  private gravity: number | null = null;
  private smooth = 0;
  private prev = 0;
  private rising = false;
  /** The lowest bounce since the last step. */
  private low = 0;
  private lastT: number | null = null;
  private firstT: number | null = null;
  /** Times of recent steps. */
  private steps: number[] = [];

  push(p: MotionSample) {
    const size = Math.hypot(p.x, p.y, p.z);
    if (!Number.isFinite(size)) return;
    if (this.lastT == null || p.t - this.lastT > STEPS.gapMs) {
      // A fresh start: gravity from this sample, no history.
      this.gravity = size;
      this.smooth = 0;
      this.prev = 0;
      this.rising = false;
      this.low = 0;
      this.steps = [];
      this.firstT = p.t;
      this.lastT = p.t;
      return;
    }
    const dt = Math.max(1, p.t - this.lastT);
    this.lastT = p.t;
    this.gravity! += (size - this.gravity!) * Math.min(1, dt / STEPS.gravityMs);
    const bounce = size - this.gravity!;
    this.smooth += (bounce - this.smooth) * Math.min(1, dt / STEPS.smoothMs);
    // A peak: it was rising and now falls, high enough, and far enough from the last step.
    this.low = Math.min(this.low, this.smooth);
    if (this.smooth < this.prev && this.rising && this.prev >= STEPS.peak && this.low <= -STEPS.dip) {
      const last = this.steps[this.steps.length - 1];
      if (last == null || p.t - last >= STEPS.minGapMs) {
        this.steps.push(p.t);
        this.low = 0;
      }
    }
    this.rising = this.smooth > this.prev;
    this.prev = this.smooth;
    while (this.steps.length && p.t - this.steps[0] > Math.max(STEPS.windowMs, STEPS.stillAfterMs)) this.steps.shift();
  }

  state(now: number): MotionState {
    if (this.lastT == null || this.firstT == null || now - this.lastT > STEPS.gapMs || this.lastT - this.firstT < STEPS.warmMs) return 'unknown';
    const recent = this.steps.filter((t) => now - t <= STEPS.windowMs);
    if (recent.length >= STEPS.steps) {
      const gaps = recent.slice(1).map((t, i) => t - recent[i]);
      const lo = Math.min(...gaps);
      const hi = Math.max(...gaps);
      if (lo >= STEPS.minGapMs && hi <= STEPS.maxGapMs && hi <= STEPS.evenRatio * lo) return (this.firm = 'walking');
    }
    const last = this.steps[this.steps.length - 1];
    if (last == null || now - last >= STEPS.stillAfterMs) return (this.firm = 'still');
    // A step lately, but not a steady walk (yet, or any more): keep the last firm answer.
    return this.firm;
  }

  private firm: MotionState = 'still';
}
