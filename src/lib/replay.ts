// @layer core
import type { Faced } from './moment';
import { distanceM, isBreak, type PauseSpan } from './geo';
import { renameChanged, renamePatch } from './rename';
import type { LngLat, TracePoint, Walk } from './types';
import { suggestTitle } from './walkTitle';

/**
 * The replay's shared pieces: the fog beat's length, captures grouped into
 * stops, and the trace as timed runs, drawn up to a time with the walker at
 * its end. How the path beat is told is a ceremony's (`lib/ceremony`,
 * decisions 0085, 0086); the trace breaks where `isBreak` says (a gap over
 * GAP_MS, or a pause, however short).
 */

export const FOG_MS = 4000;
/** The first beat's streets are all lit this far into it: the rest of the beat looks at the walk whole. */
export const FOG_LIT_MS = FOG_MS * 0.8;

/**
 * How many of a walk's `n` walked streets are lit `elapsed` ms into the first beat's lighting, which takes `over` ms
 * (replay ceremony RC23): in the order walked, none before it starts, all of them once it is over (or at once when it
 * takes no time). A map asks this as time passes; no screen renders for it.
 */
export function litStreets(n: number, elapsed: number, over: number): number {
  if (n <= 0) return 0;
  if (!(over > 0)) return n;
  return Math.max(0, Math.min(n, Math.ceil(n * Math.min(1, elapsed / over))));
}
const GROUP_M = 40;
const GROUP_GAP_MS = 120_000;
export const GAP_MS = 60_000;

export interface PauseGroup {
  /** Walk time at which the path stops for this group. */
  t: number;
  at: LngLat | null;
  /** Shown one after another, each until the viewer moves on. */
  captures: Faced[];
}

/** Captures taken close together, in space and time, share one stop. */
export function groupCaptures(captures: Faced[]): PauseGroup[] {
  const groups: PauseGroup[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t)) {
    const pos: LngLat | null = c.lat != null && c.lon != null ? [c.lon, c.lat] : null;
    const g = groups[groups.length - 1];
    const near = g && c.t - g.t <= GROUP_GAP_MS && (!g.at || !pos || distanceM(g.at, pos) <= GROUP_M);
    if (near) {
      g.captures.push(c);
      // A group begun by a placeless capture takes its place from the first placed one, so a far one can't join it (audit).
      if (!g.at && pos) g.at = pos;
    } else groups.push({ t: c.t, at: pos, captures: [c] });
  }
  return groups;
}

/**
 * Where Back (Android), Escape (web) or the name sheet's Back takes the walk's replay from a beat: the name step goes
 * back to its card with the words typed kept (tend replay 4, T21); any other beat leaves the replay, as Not now or Done
 * does, unless words typed in Name it would go with it: then it asks first (`ask`, tend replay 15). While the ask
 * shows, Back and Escape are Keep editing, as in Rename (tend chronicle 9).
 */
export function backFrom(beat: string, words: { typed?: boolean; asking?: boolean } = {}): 'card' | 'leave' | 'ask' | 'keep-editing' {
  if (words.asking) return 'keep-editing';
  if (beat === 'name') return 'card';
  return words.typed ? 'ask' : 'leave';
}

/** The replay's beats, as its screen moves through them. */
export type ReplayBeat = 'reading' | 'fog' | 'path' | 'card' | 'name';

/**
 * What the open replay does with news of its walk's captures (tend replay T41): a capture kept after the replay opened
 * (a memo still being saved through the bar's Stop, decision 0227), or a change to one. On the card or the name step
 * the walk is read again at once, so it is pinned there; while the walk is read or told it waits (`late`) and is read
 * when the card comes, so no telling changes under it and the next Watch again plays it. Nothing is said of it.
 */
export function arrival(late: boolean, e: { heard: ReplayBeat } | { to: ReplayBeat }): { late: boolean; read: boolean } {
  const atCard = (b: ReplayBeat) => b === 'card' || b === 'name';
  if ('heard' in e) return atCard(e.heard) ? { late: false, read: true } : { late: true, read: false };
  return atCard(e.to) && late ? { late: false, read: true } : { late, read: false };
}

/**
 * Whether leaving the first replay would drop words typed in Name it (the owner's "Ask there too", Nov 16; decision
 * 0172, O17): words Keep it would store otherwise than the walk holds, read as Rename reads them (`renameChanged`, with
 * `offered`, the suggestion the field was filled with). Words left as they were, or both fields emptied, leave at once.
 */
export function wordsTyped(walk: Walk, title: string, epilogue: string, offered: string | null): boolean {
  if (!title.trim() && !epilogue.trim()) return false;
  return renameChanged(walk, title, epilogue, offered);
}

/**
 * The title the walk's card shows on the first replay: the name typed in Name it, unsaved, until Keep it or leaving (the
 * owner's "Show the typed name", Nov 17; tend replay audit 16), read as Keep it would store it, so a suggestion kept or
 * an emptied field shows the walk's own title or its suggestion, as the card did before.
 */
export function cardTitle(walk: Walk, title: string, offered: string | null): string {
  return renamePatch(walk, title, null, offered).title ?? walk.title ?? suggestTitle(walk);
}

/**
 * Name it's fields after a Rename from the card's More (QL23): only a field Rename changed from `walk` (the walk as the
 * card held it) takes Rename's words, so a line typed in Name it outlives a Rename of the title alone (tend replay
 * audit 15, the review's S2; decision 0172, O17). A title Rename cleared shows the suggestion, offered as one.
 */
export function fieldsAfterRename(
  walk: Walk,
  patch: { title: string | null; epilogue: string | null },
  fields: { title: string; epilogue: string; offered: string | null },
): { title: string; epilogue: string; offered: string | null } {
  const named = patch.title === walk.title ? { title: fields.title, offered: fields.offered } : { title: patch.title ?? suggestTitle(walk), offered: patch.title ? null : suggestTitle(walk) };
  return { ...named, epilogue: patch.epilogue === walk.epilogue ? fields.epilogue : patch.epilogue ?? '' };
}

/**
 * What a screen reader hears as a beat begins (`t0`, the beat's start): once per beat, never again when the walk is
 * read anew within it (the streets snapped, a note edited; tend replay 9). The fog says its headline; the day's card
 * is said however it was reached, Skip included. Null for nothing.
 */
export function beatWords(beat: string, t0: number, saidAt: number | null, headline: string): string | null {
  if (saidAt === t0) return null;
  if (beat === 'reading') return 'Reading the streets you walked';
  if (beat === 'fog') return headline;
  if (beat === 'card') return 'Summary';
  if (beat === 'day-card') return 'Summary of the day';
  return null;
}

export type TimedRun = { t: number; p: LngLat }[];

/** Index of the last element with t <= target, or -1. */
function lastAtOrBefore(run: TimedRun, t: number): number {
  let lo = 0, hi = run.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (run[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/** The trace up to walk time t, as runs, ending at the interpolated position. Completed runs are reused as-is. */
export function traceUntil(runs: TimedRun[], fullRuns: LngLat[][], t: number): LngLat[][] {
  const out: LngLat[][] = [];
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    const full = fullRuns[r];
    // The two lists must come from the same fixes; a mismatch draws nothing more, never throws.
    if (!full || run.length === 0 || run[0].t > t) break;
    if (run[run.length - 1].t <= t) {
      out.push(full);
      continue;
    }
    const i = lastAtOrBefore(run, t);
    if (i + 1 >= run.length || i >= full.length) break;
    const a = run[i];
    const b = run[i + 1];
    const f = (t - a.t) / (b.t - a.t || 1);
    out.push([...full.slice(0, i + 1), [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f]]);
    break;
  }
  return out;
}

/** The walker's position at walk time t; during a gap it waits at the end of the run before it. */
export function walkerAt(runs: TimedRun[], t: number): LngLat | null {
  let last: LngLat | null = null;
  for (const run of runs) {
    if (run.length === 0) continue;
    if (run[0].t > t) return last ?? run[0].p;
    const i = lastAtOrBefore(run, t);
    if (i === run.length - 1) {
      last = run[i].p;
      continue;
    }
    const a = run[i];
    const b = run[i + 1];
    const f = (t - a.t) / (b.t - a.t || 1);
    return [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f];
  }
  return last;
}

export function timedRuns(fixes: TracePoint[], pauses: PauseSpan[] = []): TimedRun[] {
  const runs: TimedRun[] = [];
  fixes.forEach((f, i) => {
    if (i === 0 || isBreak(fixes[i - 1], f, pauses, GAP_MS)) runs.push([]);
    runs[runs.length - 1].push({ t: f.t, p: [f.lon, f.lat] });
  });
  return runs;
}

/**
 * The cards' one hint (tend replay T19, decision 0165), and only while the map has a pin to tap: a moment with no
 * place draws none (tend replay audit 11). Null without a placed moment.
 */
export function pinHint(captures: readonly Pick<Faced, 'lat' | 'lon'>[]): string | null {
  return captures.some((c) => c.lat != null && c.lon != null) ? 'Tap a pin to open it' : null;
}

/**
 * How much of the walk's room the gap question must leave clear over the card's sheet (`replay-ceremony ui 11`): two
 * targets' height, the least in which the card's own fit still shows a walk.
 */
export const KEEP_ASK_CLEAR = 96;
/**
 * Where the walk's-end question about offered gaps is asked on the walk's card (`replay-ceremony ui 11`, the UI
 * review's U2; the owner's defaults, Nov 20): a prompt never covers what it asks about. Over the map, 12 px above the
 * card's sheet, wherever that leaves `KEEP_ASK_CLEAR` px of the walk's room in view above it (`top`: where the card's
 * fit begins the walk's room; `askH`: the question's own height); else inside the sheet, as its first block, with
 * nothing over the map. Decided from the room, never from a device.
 */
export function keepAskPlace(o: { height: number; top: number; sheetH: number; askH: number }): 'over' | 'sheet' {
  return o.height - o.sheetH - 12 - o.askH - o.top >= KEEP_ASK_CLEAR ? 'over' : 'sheet';
}
