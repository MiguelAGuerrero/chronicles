// @layer core
/**
 * A replay is a story told by a ceremony (decision 0082).
 *
 * The story is what happened, in time order, with no timing or look of its
 * own: the paths walked, the moves along them, the moments (with when you
 * arrived and left), the breaks in a trace, the travel between a day's
 * entries, the places passed. A walk and a day give the same kind of story.
 *
 * A ceremony turns a story into frames: where the walker is, how far each
 * path is drawn, the camera, the clock, and a list of typed overlays. The
 * screens draw frames through one stage whose overlay views are looked up by
 * kind, so a new ceremony is a registry entry (`registry.ts`) plus a view for
 * any overlay kind it adds: the story, the screens and other ceremonies stay
 * as they are.
 */
import type { TimedRun } from '../replay';
import type { Capture, LngLat } from '../types';

/** One walk's trace, as the story knows it. */
export interface StoryPath {
  id: string;
  /** The walker: walked and ridden fixes, split at breaks. */
  dot: TimedRun[];
  /** The solid trace, timed, and the same as drawn (rides are separate, dashed). */
  walked: TimedRun[];
  drawn: LngLat[][];
  rideTimed: TimedRun[];
  rideRuns: LngLat[][];
  /** Every dot point flattened, in time order: its time, metres along the path (gaps add none), run and place. */
  ts: number[];
  ms: number[];
  runOf: number[];
  ps: LngLat[];
  start: number;
  end: number;
}

/** Captures that share a stop, where they were, and the still time around them. */
export interface StoryMoment {
  kind: 'moment';
  captures: Capture[];
  at: LngLat | null;
  /** When you came to a stand there, and when you moved on (both the capture's time when the trace can't tell). */
  arrive: number;
  leave: number;
  pathId: string | null;
}

/** Moving along a path between two times, `m0` to `m1` metres along it. */
export interface StoryMove {
  kind: 'move';
  pathId: string;
  t0: number;
  t1: number;
  m0: number;
  m1: number;
}

/** A break in a trace: the app closed, a pause, a long loss of fixes. */
export interface StoryBreak {
  kind: 'break';
  pathId: string;
  t0: number;
  t1: number;
  from: LngLat | null;
  to: LngLat | null;
}

/** Between a day's entries, where no trace says the way: from one place to the next, as the crow flies. */
export interface StoryTravel {
  kind: 'travel';
  t0: number;
  t1: number;
  from: LngLat | null;
  to: LngLat | null;
  m: number;
}

export type StoryEvent = StoryMoment | StoryMove | StoryBreak | StoryTravel;

/** A place passed within reach and not stopped for (the card's low, E11). */
export interface StoryPass {
  pathId: string;
  t: number;
  at: LngLat;
  name: string;
  generic: boolean;
}

export interface Story {
  start: number;
  end: number;
  paths: Record<string, StoryPath>;
  events: StoryEvent[];
  passes: StoryPass[];
  /** Every capture the story shows, in the order its moments come. */
  captures: Capture[];
}

/** The overlay kinds a stage can draw; each has a view (`components/ceremony/overlays.tsx`). */
export const OVERLAY_KINDS = ['bubble', 'card', 'pile', 'whisper'] as const;
export type OverlayKind = (typeof OVERLAY_KINDS)[number];

/** A note or memo in the corner: `enter` and `exit` run 0 to 1. */
export interface BubbleOverlay {
  kind: 'bubble';
  key: string;
  capture: Capture;
  enter: number;
  exit: number;
  /** A memo's play time: on while it plays, with how far along (0 to 1). */
  playing: boolean;
  progress: number;
}

/** A photo or video card: grows from the pin (`grow` 0 to 1), holds, and tucks into the pile (`tuck` 0 to 1). */
export interface CardOverlay {
  kind: 'card';
  key: string;
  capture: Capture;
  /** Where it grows from: its pin, or null to grow in place. */
  from: LngLat | null;
  grow: number;
  tuck: number;
  playing: boolean;
  progress: number;
  /** Reduce motion: fade in place instead of moving. */
  fade: boolean;
}

export interface PileOverlay {
  kind: 'pile';
  key: 'pile';
  /** Oldest first. */
  captures: Capture[];
}

export interface WhisperOverlay {
  kind: 'whisper';
  key: string;
  text: string;
  at: LngLat;
  opacity: number;
}

export type Overlay = BubbleOverlay | CardOverlay | PileOverlay | WhisperOverlay;

/** What is on screen at one time into the ceremony. A function of that time alone. */
export interface Frame {
  /** The ceremony has ended: the card comes next. */
  done: boolean;
  walker: LngLat | null;
  /** Where the camera holds the map, and at what zoom; a null centre leaves the map where it is (no following). */
  camera: { center: LngLat | null; zoom: number | null };
  /** Walk time each path is drawn up to; a path not started is absent; Infinity is the whole path. */
  drawn: Record<string, number>;
  /** The captures whose pins are on the map, by id, in any order the ceremony likes. */
  pins: string[];
  /** 0 to 1: the map dims across a cut. */
  dim: number;
  /** The time of day where the walker is (epoch ms), or null for no clock. */
  clock: number | null;
  /** A line under the clock ("43 min later"), with its opacity. */
  line: string | null;
  lineOpacity: number;
  overlays: Overlay[];
}

export interface CeremonyOptions {
  reduceMotion: boolean;
}

/** A story as one ceremony tells it: how long, and the frame at any time. */
export interface Showing {
  total: number;
  frame(ms: number): Frame;
}

export interface Ceremony {
  id: string;
  /** The overlay kinds its frames may hold. */
  overlays: readonly OverlayKind[];
  show(story: Story, opts: CeremonyOptions): Showing;
}
