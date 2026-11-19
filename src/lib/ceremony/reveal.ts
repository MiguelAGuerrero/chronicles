// @layer core
/**
 * The walked line, revealed (replay ceremony RC1, RC3; decision 0206). A frame says how far each path is drawn, as a
 * walk time; a map is not sent that line again as time passes. It is sent each run whole, once, and told how much of
 * the run being walked to show: the share of its length, measured as the map measures a line's progress (in Web
 * Mercator). `traceUntil`'s rules, read as a share: the runs behind are whole, the one being walked ends at the
 * walker, the ones ahead are not drawn. Rides are revealed the same way, apart from the walk (they are dashed).
 */
import type { TimedRun } from '../replay';
import type { LngLat } from '../types';
import { between } from './camera';
import type { Hop, HopSpan, Story } from './types';

/** One kind of line at one time: the runs wholly drawn, and the run being drawn with how far along it is. */
export interface LineReveal {
  /** Whole runs, by reference, and a key that changes only when the list does. */
  done: LngLat[][];
  doneKey: string;
  /** The run being drawn, whole and by reference, or null between runs. */
  run: LngLat[] | null;
  /** The share of `run`'s length that is drawn, 0 to 1. */
  p: number;
  /** Where the line ends: the walker's place on the run being drawn, else the end of the last whole run. */
  end: LngLat | null;
}

export interface Reveal {
  walked: LineReveal;
  rides: LineReveal;
}

/** Web Mercator's y for a latitude, in the degrees longitude is counted in. */
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * (180 / Math.PI);
const span = (a: LngLat, b: LngLat) => Math.hypot(b[0] - a[0], mercY(b[1]) - mercY(a[1]));

/** The last point of a run at or before walk time t. */
function lastAtOrBefore(run: TimedRun, t: number): number {
  let lo = 0;
  let hi = run.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (run[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** A run's length up to each of its points, as a map measures a line's progress (Web Mercator). */
export function runLengths(run: LngLat[]): Float64Array {
  const cum = new Float64Array(run.length);
  for (let k = 1; k < run.length; k++) cum[k] = cum[k - 1] + span(run[k - 1], run[k]);
  return cum;
}

function revealInto(out: LineReveal, pathId: string, timed: TimedRun[], full: LngLat[][], t: number, lengths: (run: LngLat[]) => Float64Array): void {
  for (let r = 0; r < timed.length; r++) {
    const run = timed[r];
    const line = full[r];
    // The two lists come from the same fixes; a mismatch draws nothing more, never throws (as `traceUntil`).
    if (!line || run.length === 0 || run[0].t > t) return;
    if (run[run.length - 1].t <= t) {
      out.done.push(line);
      out.doneKey += `${pathId}:${r}:${line.length}|`;
      if (line.length) out.end = line[line.length - 1];
      continue;
    }
    const i = lastAtOrBefore(run, t);
    if (i + 1 >= run.length || i + 1 >= line.length) return;
    const f = (t - run[i].t) / (run[i + 1].t - run[i].t || 1);
    const cum = lengths(line);
    const total = cum[cum.length - 1];
    out.run = line;
    out.p = total > 0 ? Math.max(0, Math.min(1, (cum[i] + (cum[i + 1] - cum[i]) * f) / total)) : 0;
    out.end = [line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f];
    return;
  }
}

/**
 * What of the story's lines is drawn when each path is drawn up to `drawn[id]` (a frame's `drawn`: a walk time,
 * Infinity for the whole path, absent for a path not begun). It is asked every frame: `lengths` is how a run's
 * lengths are had, so a caller that keeps them (the replay's loop, by run) pays for a run of an eight-hour walk once,
 * not sixty times a second.
 */
export function revealOf(story: Story, drawn: Record<string, number>, lengths: (run: LngLat[]) => Float64Array = runLengths): Reveal {
  const walked: LineReveal = { done: [], doneKey: '', run: null, p: 0, end: null };
  const rides: LineReveal = { done: [], doneKey: '', run: null, p: 0, end: null };
  for (const id in drawn) {
    const path = story.paths[id];
    if (!path) continue;
    revealInto(walked, id, path.walked, path.drawn, drawn[id], lengths);
    revealInto(rides, id, path.rideTimed, path.rideRuns, drawn[id], lengths);
  }
  return { walked, rides };
}

/** A run cut at a share of its length, ending there: for a map that cannot reveal a line and is sent it instead. */
export function cutRun(run: LngLat[], p: number): LngLat[] {
  if (run.length < 2 || p >= 1) return run;
  if (p <= 0) return [run[0]];
  let total = 0;
  for (let k = 1; k < run.length; k++) total += span(run[k - 1], run[k]);
  let left = total * p;
  for (let k = 1; k < run.length; k++) {
    const d = span(run[k - 1], run[k]);
    if (d >= left) {
      const u = d > 0 ? left / d : 0;
      return [...run.slice(0, k), [run[k - 1][0] + (run[k][0] - run[k - 1][0]) * u, run[k - 1][1] + (run[k][1] - run[k - 1][1]) * u]];
    }
    left -= d;
  }
  return run;
}

/** A reveal as the runs it draws: the whole ones, then the run being drawn, cut where it ends. */
export function revealedRuns(l: LineReveal): LngLat[][] {
  return l.run ? [...l.done, cutRun(l.run, l.p)] : l.done;
}

/**
 * A frame's hops as the lines a map draws (replay ceremony RC18, RC21): each from where its trace stops, as far as it
 * is drawn, straight as a map draws a line. They go to the layer a gap's link already uses, so they are a gap's dots.
 */
export function hopLines(hops: Hop[]): LngLat[][] {
  return hops.map((h) => [h.from, h.p >= 1 ? h.to : between(h.from, h.to, h.p)]);
}

/**
 * What decides a frame's hops are sent to the map again: how many there are, and the one being drawn by the telling's
 * bucket of time, never by the frame. A dotted line cannot be revealed by a paint property (see `REPLAY_LINES`), so a
 * hop is data while it draws: a few sends over its fifth of a break, at most one every `everyMs`, and none after.
 */
export function hopsKey(hops: Hop[], ms: number, everyMs: number): string {
  const last = hops[hops.length - 1];
  return hops.length ? `${hops.length}:${last.p >= 1 ? 'whole' : Math.floor(ms / everyMs)}` : '';
}

/**
 * A card's dotted links with a telling's hops among them (RC21: a hop stays on the map through the card). `empty` are
 * the gaps the card joins by dots already (GW2), `gaps` every gap of the walk: across a gap the card keeps its own way
 * of drawing it (its dots, or its offered way, faint), and a hop that crossed one is that gap's, by the time it spans.
 * A hop across anything else (a pause, a break too long to be a gap) is added, as it was drawn.
 */
export function linksWithHops(empty: { from: LngLat; to: LngLat }[], gaps: { t0: number; t1: number }[], hops: HopSpan[]): LngLat[][] {
  const more = hops.filter((h) => !gaps.some((g) => g.t0 < h.t1 && h.t0 < g.t1));
  return [...empty.map((g): LngLat[] => [g.from, g.to]), ...more.map((h): LngLat[] => [h.from, h.to])];
}
