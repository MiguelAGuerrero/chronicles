// @layer core
import { boundsOf, distanceM, distanceToLinesM, pointSegmentDist, projector, type Bounds } from '../geo';
import { liveRuns, type ReadTrace } from '../rides';
import { tilesIn } from '../tileMath';
import type { LngLat } from '../types';

/*
 * Where I've been (specs/where-ive-been, decision 0220): each earlier walk's walked line, simplified, kept beside the walk as a
 * cache of its trace (WB14) and drawn by the "Where I've been" layer near the map (WB6). Pure: the shell reads and writes.
 */

/** The rule a line was built by; a change rebuilds every line (WB14). */
export const LINE_CODE = 'p1';
/** A line draws when it passes within this of the map's layer centre (WB6). */
export const PAST_REACH_M = 5000;
/** A run keeps every walked point within this of its simplified line (WB16). */
export const SIMPLIFY_M = 5;
/** The zoom of the tiles a line is indexed by: a reach is a handful of them (WB6). */
export const PAST_TILE_Z = 12;

/** One walk's line, as kept (`walk_line`): its walked runs, where they lie, and the rule they were built by. */
export interface WalkLine {
  walk_id: string;
  code: string;
  /** West, south, east, north; all zero for a walk with nothing walked. */
  bounds: Bounds;
  /** The z12 tiles (`x/y`) the line crosses; empty for a walk with nothing walked. */
  tiles: string[];
  runs: LngLat[][];
}

/** Douglas-Peucker on metres around the run's first point: every point stays within `toleranceM` of the result (WB16). */
export function simplifyRun(run: LngLat[], toleranceM: number = SIMPLIFY_M): LngLat[] {
  if (run.length <= 2) return run.slice();
  const proj = projector(run[0]);
  const xy = run.map(proj);
  const keep = new Uint8Array(run.length);
  keep[0] = 1;
  keep[run.length - 1] = 1;
  const stack: [number, number][] = [[0, run.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = pointSegmentDist(xy[i], xy[a], xy[b]);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at >= 0 && worst > toleranceM) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return run.filter((_, i) => keep[i]);
}

/** The z12 tiles a set of runs crosses, as `x/y`: each segment's box, so a long straight segment keeps its middle tiles. */
function tilesOfRuns(runs: LngLat[][]): string[] {
  const out = new Set<string>();
  for (const run of runs)
    for (let i = 0; i < run.length; i++) {
      const a = run[i];
      const b = run[Math.min(i + 1, run.length - 1)];
      const box: Bounds = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
      for (const [x, y] of tilesIn(box, PAST_TILE_Z)) out.add(`${x}/${y}`);
    }
  return [...out].sort();
}

/**
 * A walk's line from its trace read with its pauses, stills and kept gaps (WB7): the walked runs as the live map draws them
 * (split at rides, pauses and gaps), each simplified. A gap filled only by inference is never passed in, so it stays a break.
 */
export function lineOf(walkId: string, tr: ReadTrace, code: string = LINE_CODE): WalkLine {
  const runs = liveRuns(tr)
    .filter((r) => r.length >= 2)
    .map((r) => simplifyRun(r));
  const all = runs.flat();
  return { walk_id: walkId, code, bounds: boundsOf(all) ?? [0, 0, 0, 0], tiles: tilesOfRuns(runs), runs };
}

/** The z12 tiles of the square of `reachM` around the centre: where a line drawn near it is kept (WB6). */
export function reachTiles(centre: LngLat, reachM: number = PAST_REACH_M): string[] {
  const box = boundsOf([centre], reachM);
  return box ? tilesIn(box, PAST_TILE_Z).map(([x, y]) => `${x}/${y}`) : [];
}

/** The lines that pass within `reachM` of the centre, in walk order (WB6). */
export function nearLines(rows: WalkLine[], centre: LngLat, reachM: number = PAST_REACH_M): WalkLine[] {
  return rows.filter((l) => l.runs.length > 0 && distanceToLinesM(centre, l.runs) <= reachM).sort((a, b) => a.walk_id.localeCompare(b.walk_id));
}

/** Never the walk being recorded (WB8), nor one waiting in the Undo window or deleted (WB13). */
export function visibleLines(rows: WalkLine[], hidden: ReadonlySet<string>, openWalkId: string | null): WalkLine[] {
  return rows.filter((l) => l.walk_id !== openWalkId && !hidden.has(l.walk_id));
}

/** What the map is sent on: the same lines give the same key in any order, a rebuilt line a new one (WB16). */
export function linesKey(rows: WalkLine[]): string {
  return rows
    .map((l) => {
      let sum = 0;
      let n = 0;
      for (const run of l.runs)
        for (const [x, y] of run) {
          sum += x * 7 + y * 13;
          n++;
        }
      return `${l.walk_id}:${l.code}:${l.runs.length}:${n}:${sum.toFixed(6)}`;
    })
    .sort()
    .join('|');
}

/** Closed walks with no line, or a line of another rule code, to build; an open walk never (WB8, WB14). */
export function staleIds(walks: { id: string; open: boolean }[], codes: { walk_id: string; code: string }[], code: string = LINE_CODE): string[] {
  const current = new Set(codes.filter((c) => c.code === code).map((c) => c.walk_id));
  return walks.filter((w) => !w.open && !current.has(w.id)).map((w) => w.id);
}

/** The order older walks are prepared in: nearest the centre first, then walks with no known place, newest first (WB15). */
export function prepareOrder(walks: { id: string; at: LngLat | null; started_at: number }[], centre: LngLat | null): string[] {
  const dist = (w: { at: LngLat | null }) => (centre && w.at ? distanceM(centre, w.at) : Infinity);
  return walks
    .slice()
    .sort((a, b) => {
      const da = dist(a);
      const db = dist(b);
      if (da !== db) return da - db;
      return b.started_at - a.started_at;
    })
    .map((w) => w.id);
}

/** The lines as one feature collection's lines, for the map. */
export function pastRuns(rows: WalkLine[]): LngLat[][] {
  return rows.flatMap((l) => l.runs);
}
