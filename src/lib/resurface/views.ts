// @layer core
import type { Faced } from '../moment';
import { partOfDay, weekdayName } from './context';
import type { Walk } from '../types';
import type { MomentView } from './types';
import { plainNote } from '../refs';

const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** A moment's own words, by kind. A memo has a transcript only once a transcriber gives it one (RM13). */
export function wordsOf(c: Faced, transcript: (c: Faced) => string | null = () => null): string | null {
  if (c.kind === 'text') return clean(plainNote(c.body));
  if (c.kind === 'photo' || c.kind === 'video') return clean(c.caption);
  return clean(transcript(c));
}

/**
 * Captures as the feed sees them. A moment of a walk still open, or of a walk
 * that is gone, is left out: it joins once the walk is stopped.
 */
export function toMomentViews(captures: Faced[], walks: Walk[], transcript?: (c: Faced) => string | null): MomentView[] {
  const byId = new Map(walks.map((w) => [w.id, w]));
  const out: MomentView[] = [];
  for (const c of captures) {
    const walk = c.walk_id ? byId.get(c.walk_id) : undefined;
    if (c.walk_id && (!walk || walk.open || walk.ended_at == null)) continue;
    out.push({
      id: c.id,
      t: c.t,
      kind: c.kind,
      walkId: c.walk_id,
      words: wordsOf(c, transcript),
      place: walk?.area?.trim() || null,
      hasMedia: c.kind === 'text' ? true : !!c.file_path,
      capture: c,
    });
  }
  return out;
}

/**
 * The moments of a walk still open, which the feed leaves out (RM17) but a thread must show: a reply made during a
 * walk joins its thread at once, and a thread that cannot show it reads as one that is not there.
 */
export function openWalkViews(captures: Faced[], walks: Walk[], transcript?: (c: Faced) => string | null): MomentView[] {
  const open = new Set(walks.filter((w) => w.open || w.ended_at == null).map((w) => w.id));
  return toMomentViews(
    captures.filter((c) => c.walk_id && open.has(c.walk_id)),
    walks.map((w) => (open.has(w.id) ? { ...w, open: false, ended_at: w.ended_at ?? w.started_at } : w)),
    transcript,
  );
}

/**
 * The moments the owner's threads can show: the feed's and a walk-in-progress's, with a delete's hidden ids and walks
 * gone at once (RM19), as `compose` does for the feed.
 */
export function threadPool(feed: MomentView[], inOpenWalk: MomentView[], hidden: ReadonlySet<string>): Map<string, MomentView> {
  const pool = new Map<string, MomentView>();
  for (const m of [...feed, ...inOpenWalk]) if (!hidden.has(m.id) && !(m.walkId && hidden.has(m.walkId))) pool.set(m.id, m);
  return pool;
}

/**
 * Every kept moment a responses sheet can list (response thread RT13): the feed's, and those of a walk still open,
 * so a response made mid-walk is there at once.
 */
export function poolWithOpenWalks(captures: Faced[], walks: Walk[], transcript?: (c: Faced) => string | null): MomentView[] {
  return [...toMomentViews(captures, walks, transcript), ...openWalkViews(captures, walks, transcript)];
}

/** The walks a card may link to: a walk still being recorded has no replay yet. */
export function closedWalks(walks: Record<string, Walk>): Record<string, Walk> {
  return Object.fromEntries(Object.entries(walks).filter(([, w]) => !w.open && w.ended_at != null));
}

/**
 * The small "From ..." line under a card: the walk's own name, else its day and part of the day. No town: the
 * arrival line carries the place, and says none until it is read (audit 3).
 */
export function fromLine(walk: Walk | undefined): string | null {
  if (!walk) return null;
  const title = walk.title?.trim();
  return `From ${title || `${weekdayName(walk.started_at)} ${partOfDay(walk.started_at)} walk`}`;
}
