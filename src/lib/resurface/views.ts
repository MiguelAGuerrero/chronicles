// @layer core
import type { Faced } from '../moment';
import { partOfDay, weekdayName } from './context';
import type { Walk } from '../types';
import type { MomentView } from './types';

const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** A moment's own words, by kind. A memo has a transcript only once a transcriber gives it one (RM13). */
export function wordsOf(c: Faced, transcript: (c: Faced) => string | null = () => null): string | null {
  if (c.kind === 'text') return clean(c.body);
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
 * The small "From ..." line under a card: the walk's own name, else its day and part of the day. No town: the
 * arrival line carries the place, and says none until it is read (audit 3).
 */
export function fromLine(walk: Walk | undefined): string | null {
  if (!walk) return null;
  const title = walk.title?.trim();
  return `From ${title || `${weekdayName(walk.started_at)} ${partOfDay(walk.started_at)} walk`}`;
}
