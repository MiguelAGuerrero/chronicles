// @layer core
/**
 * A replay is a story told by a ceremony (decision 0086).
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
import type { Faced } from '../moment';
import type { TimedRun } from '../replay';
import type { LngLat } from '../types';
import type { StageRoom } from './room';

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
  captures: Faced[];
  at: LngLat | null;
  /** When you came to a stand there, and when you moved on (both the capture's time when the trace can't tell). */
  arrive: number;
  leave: number;
  pathId: string | null;
  /** The trace covers it: the walker was on the trace there. False for one taken in a gap or a pause, or loose (audit 30). */
  onTrace: boolean;
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
  captures: Faced[];
}

/** The overlay kinds a stage can draw; each has a view (`components/ceremony/overlays.tsx`). */
export const OVERLAY_KINDS = ['bubble', 'card', 'pile', 'whisper', 'passed'] as const;
export type OverlayKind = (typeof OVERLAY_KINDS)[number];

/** A note or memo in the corner: `enter` and `exit` run 0 to 1. */
export interface BubbleOverlay {
  kind: 'bubble';
  key: string;
  capture: Faced;
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
  capture: Faced;
  /** Where it grows from: its pin, or null to grow in place. */
  from: LngLat | null;
  grow: number;
  tuck: number;
  playing: boolean;
  progress: number;
  /** Reduce motion: fade in place instead of moving. */
  fade: boolean;
  /** A stack's grid (MS17): its photos and videos, how far each has swiped in (0 to 1), and how far it has scrolled. */
  pieces?: Faced[];
  shown?: number[];
  scroll?: number;
}

export interface PileOverlay {
  kind: 'pile';
  key: 'pile';
  /** Oldest first. */
  captures: Faced[];
}

export interface WhisperOverlay {
  kind: 'whisper';
  key: string;
  text: string;
  at: LngLat;
  opacity: number;
}

/**
 * A place passed without stopping, named on the last view (replay ceremony RC25): beside its place, or, for the one
 * line that says more than two (RP19), beside none (`at` null).
 */
export interface PassedOverlay {
  kind: 'passed';
  key: string;
  text: string;
  at: LngLat | null;
  opacity: number;
}

export type Overlay = BubbleOverlay | CardOverlay | PileOverlay | WhisperOverlay | PassedOverlay;

/**
 * A break crossed (replay ceremony RC18, RC21): the straight way from where a trace stops to where it picks up, drawn
 * in a gap's dots as far as `p` (0 to 1) of the way. Drawn by the map, in the layer a gap's link already uses.
 */
export interface Hop {
  from: LngLat;
  to: LngLat;
  p: number;
}

/** A hop of a telling, whole: its two ends, and the walk's times it crosses (the break's own). */
export interface HopSpan {
  from: LngLat;
  to: LngLat;
  t0: number;
  t1: number;
}

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
  /** Every break crossed so far, the one being crossed as far as it is drawn (RC21); they stay to the end. */
  hops: Hop[];
  /** The time of day where the walker is (epoch ms), or null for no clock. */
  clock: number | null;
  /** 0 to 1: the clock dissolves from one time to the other across a break; it does not roll through it (RC19). */
  clockFade: number;
  /** A line under the clock ("43 min later"), with its opacity. */
  line: string | null;
  lineOpacity: number;
  /** The day walked (epoch ms), shown on the last view with its opacity (RC26); null while the path is told. */
  date: number | null;
  dateOpacity: number;
  overlays: Overlay[];
}

/**
 * The whole of what is told, as its screen frames it (replay ceremony RC23, RC24): its bounds (west, south, east,
 * north), the room the screen leaves around them when the telling opens (a walk: its first beat's own frame) and over
 * its card, where it closes (px in from each edge), and the closest a fit goes. The ceremony fits both views itself,
 * with the arithmetic a map uses for the same bounds and room, so nothing jumps between the map's fits and its frames.
 */
export interface WholeFrame {
  bounds: readonly [west: number, south: number, east: number, north: number];
  open: { top: number; right: number; bottom: number; left: number };
  close: { top: number; right: number; bottom: number; left: number };
  maxZoom: number;
}

export interface CeremonyOptions {
  reduceMotion: boolean;
  /**
   * The screen the telling is shown on (replay ceremony RC11-RC16): the camera is the ceremony's to say, and where it
   * holds the map depends on how much of it the screen shows and on where a card rests on it.
   */
  screen: StageRoom;
  /** The whole and its room (RC23, RC24); none, and the camera opens and ends on the walker. The timing is the same. */
  whole?: WholeFrame | null;
  /** No beat showed the whole before the path (a day's replay): the telling shows it for a while itself, then dives (RC23). */
  holdOpen?: boolean;
  /** The last view names each place passed without stopping (a walk's, RC25); a day's names none, as its card (0153). */
  namePassed?: boolean;
}

/** When a moment begins in a telling, and where a press of Next lands for it: a little before, never inside the moment before (RY13, RY14). */
export interface Landing {
  t0: number;
  land: number;
}

/** A press of Next: where the telling was, and where it landed. A frame after it says what lay between (RY21). */
export interface Jump {
  from: number;
  at: number;
}

/** A story as one ceremony tells it: how long, when its moments begin, and the frame at any time. */
export interface Showing {
  total: number;
  /** In order; empty when nothing was kept. */
  stops: Landing[];
  /** Every hop the telling draws, whole, each from where a trace stops to where it picks up: they stay on the map through the card (RC21). */
  hops: HopSpan[];
  frame(ms: number, jump?: Jump | null): Frame;
}

export interface Ceremony {
  id: string;
  /** The overlay kinds its frames may hold. */
  overlays: readonly OverlayKind[];
  show(story: Story, opts: CeremonyOptions): Showing;
}
