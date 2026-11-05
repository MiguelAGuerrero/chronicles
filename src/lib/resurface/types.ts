// @layer core
import type { Capture, CaptureKind } from '../types';

/**
 * Resurfaced moments (specs/resurfaced-moments): the types the feed, the
 * threads and the extractors share. Pure: nothing here reads storage.
 */

/** One moment as the feed sees it: a capture, the words it carries, where it was made. */
export interface MomentView {
  id: string;
  t: number;
  kind: CaptureKind;
  walkId: string | null;
  /** Its own words: a note's text, a photo's or video's caption, a memo's transcript (none yet). */
  words: string | null;
  /** The town or area its walk was placed in, when it has one. */
  place: string | null;
  /** False when a photo, video or memo has no file to show or play (RM7). */
  hasMedia: boolean;
  capture: Capture;
}

/** Where a signal came from. Open on purpose: an image tagger adds its own. */
export type SignalSource = 'note' | 'caption' | 'transcript' | (string & {});

/** One thing a moment is about. `weight` and `source` are never shown (RM22). */
export interface Signal {
  /** Folded and canonical: the thread's identity. */
  term: string;
  weight: number;
  source: SignalSource;
  /** The way the user wrote it, for the thread's name. Defaults to the term. */
  shown?: string;
}

/**
 * The extension point (RM13): turns one moment into signals. The threads,
 * the feed and the shell read signals and nothing else, so a transcriber (it
 * fills a memo's `words`) or an image tagger (a new extractor) changes none
 * of them.
 */
export interface SignalExtractor {
  id: string;
  extract(m: MomentView): Signal[];
}

export interface Thread {
  term: string;
  /** What the rail shows: the user's rename, else their own most common spelling, capitalised. */
  name: string;
  /** Newest first. */
  momentIds: string[];
  first: number;
  last: number;
  /** The month (0-11) it keeps coming back in, when it does so in two or more years. */
  seasonMonth: number | null;
  /** Internal order: how it recurs over time. Never shown. */
  score: number;
}

/** What the user chose, kept in meta (RM21). Ids and terms only, never text from a moment. */
export interface Prefs {
  /** Not this one: never resurfaced (RM20). */
  hidden: string[];
  /** Moments to bring up less (Show less like this, for a moment with no words). */
  dim: string[];
  /** Terms to bring up less. */
  less: string[];
  /** A thread's own name, by term. */
  renames: Record<string, string>;
  /** Not a thread: the term is never offered again. */
  removed: string[];
  /** The moment the top card showed last, so the next open starts elsewhere (RM8). */
  lastShown: string | null;
  /** Bring moments back is off: no top card, no Another (MC9). The rail and Lately stay. */
  off: boolean;
}

export type Reason =
  | { kind: 'anniversary'; years: number }
  | { kind: 'month' }
  | { kind: 'thread'; name: string }
  | { kind: 'older' };

export interface Pick {
  moment: MomentView;
  reason: Reason;
}
