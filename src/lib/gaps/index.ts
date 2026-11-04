// @layer shell
import { db } from '../db';
import { fetchTiles } from '../discovery/tileFetch';
import { boundsOf, distanceM } from '../geo';
import type { ReadTrace } from '../rides';
import { deriveSegments, type RoadFeature } from '../streets';
import { tilesIn } from '../tileMath';
import type { GapDecision } from '../types';
import { decisionFor, GAP_RULES, gapKey, gapsOf, inferGap, readBounds, stretchesFor, type Gap, type Inference, type Stretch } from './infer';

/**
 * Filling gaps' reads (G8, G10, G12). A gap's streets are read in code from
 * the z14 tiles around it (no camera moves, so the walk screen, the replay
 * and a snap all read the same), each tile whole, and what was inferred is
 * remembered for the session under the tile build, so a gap is read once.
 */

/** Street pieces are at most 200 m (streets.ts), so a read this much wider holds every piece touching the gap's box whole. */
const PIECE_PAD_M = 250;

/** Inferences this session, by build and gap: null is "read, nothing to fill". */
const known = new Map<string, Inference | null>();
const inFlight = new Map<string, Promise<Inference | null | undefined>>();

/**
 * Reads one gap's streets and infers it: undefined when its streets couldn't
 * be read (offline, no tile build yet), so it is tried again later (G8).
 */
export async function readGap(walkId: string, g: Gap): Promise<Inference | null | undefined> {
  // A break within GPS error is joined straight, with nothing to read (offline too).
  if (distanceM(g.from, g.to) < GAP_RULES.straightM) return inferGap(g, [], null);
  const [build, url] = await Promise.all([db.getMeta('tile_build'), db.getMeta('tile_url')]);
  if (!build || !url) return undefined;
  const key = `${build}|${walkId}|${gapKey(g)}`;
  if (known.has(key)) return known.get(key);
  const running = inFlight.get(key);
  if (running) return running;
  const job = (async () => {
    const want = readBounds(g);
    const padded = boundsOf([[want[0], want[1]], [want[2], want[3]]], PIECE_PAD_M)!;
    const features = await fetchTiles(url, tilesIn(padded)).catch(() => null);
    if (!features) return undefined;
    const segments = deriveSegments(features.roads, features.names, build);
    // The pieces read are cached like any other street read (fog, navigation).
    await db.putSegments(segments).catch(() => {});
    const inf = inferGap(g, segments, want);
    known.set(key, inf);
    return inf;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

/** What was inferred for a gap this session, without reading anything. */
async function knownFor(walkId: string, g: Gap): Promise<Inference | null | undefined> {
  const build = await db.getMeta('tile_build');
  return build ? known.get(`${build}|${walkId}|${gapKey(g)}`) : undefined;
}

export interface WalkStretches {
  stretches: Stretch[];
  /** Every gap worth reading, with a stretch or not (GW2). */
  gaps: Gap[];
  /** A gap with no decision whose streets couldn't be read: snap again later (G8). */
  unread: boolean;
}

/**
 * Every gap's stretch for a walk (G5, G6, G10). `tr` is the trace read
 * without fills. A gap the walker decided is never read. With `read` false
 * nothing goes to the network: only what this session already inferred.
 */
export async function walkStretches(walkId: string, tr: ReadTrace, opts: { read: boolean }): Promise<WalkStretches> {
  const gaps = gapsOf(tr);
  if (!gaps.length) return { stretches: [], gaps, unread: false };
  const decisions = await db.getGapDecisions(walkId).catch(() => [] as GapDecision[]);
  const undecided = gaps.filter((g) => !decisionFor(g, decisions));
  const inferred: Inference[] = [];
  let unread = false;
  // One gap at a time: a long walk with many gaps reads a few tiles each, never all at once.
  for (const g of undecided) {
    // A break within GPS error is joined straight whether or not anything may be read.
    const inf = distanceM(g.from, g.to) < GAP_RULES.straightM ? inferGap(g, [], null) : opts.read ? await readGap(walkId, g) : await knownFor(walkId, g);
    if (inf === undefined) unread = true;
    else if (inf) inferred.push(inf);
  }
  return { stretches: stretchesFor(gaps, inferred, decisions), gaps, unread };
}

/** The road features of some z14 tiles, read in code, for drawing a gap's way (GW7); null when they can't be read. */
export async function readDrawTiles(tiles: [number, number][]): Promise<{ roads: RoadFeature[]; names: RoadFeature[]; build: string } | null> {
  const [build, url] = await Promise.all([db.getMeta('tile_build'), db.getMeta('tile_url')]);
  if (!build || !url || !tiles.length) return null;
  const f = await fetchTiles(url, tiles).catch(() => null);
  return f ? { roads: f.roads, names: f.names, build } : null;
}

/** Keeps or dismisses a stretch (G10). */
export function decide(walkId: string, s: Stretch, state: GapDecision['state'], now = Date.now()): Promise<void> {
  return db.putGapDecision({ walk_id: walkId, t0: s.t0, t1: s.t1, state, path: s.path, length_m: s.lengthM, street: s.street, decided_at: now });
}

export { fillsOf, gapKey, stretchAt, type Stretch } from './infer';
