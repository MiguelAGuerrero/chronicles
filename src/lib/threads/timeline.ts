// @layer core
import type { Link } from './types';

export interface TimelineMoment {
  id: string;
  t: number;
}

export interface TimelineRow<M extends TimelineMoment> {
  moment: M;
  /** 0 for a moment standing on its own, 1 for a reply set under what it answers. */
  depth: 0 | 1;
  /** The moment it answers, when that moment is in the thread: only then does the row say "answering" (OT4, OT16). */
  answering: M | null;
}

/**
 * A thread, oldest first (OT9). A reply is set right under the moment it answers, however much later it
 * was made. A reply whose answered moment is gone (or not in the thread) stands on its own, in time order.
 */
export function buildTimeline<M extends TimelineMoment>(moments: M[], links: Link[]): TimelineRow<M>[] {
  const byId = new Map(moments.map((m) => [m.id, m]));
  const parentOf = new Map<string, string>();
  for (const l of links) if (byId.has(l.from_id) && byId.has(l.to_id) && l.from_id !== l.to_id) parentOf.set(l.from_id, l.to_id);
  // A chain of replies sits under its first answered moment, one level deep (a cycle ends at the oldest).
  const rootOf = (id: string): string => {
    const seen = new Set([id]);
    let cur = id;
    while (parentOf.has(cur)) {
      const next = parentOf.get(cur)!;
      if (seen.has(next)) return byId.get(cur)!.t <= byId.get(next)!.t ? cur : next;
      seen.add(next);
      cur = next;
    }
    return cur;
  };
  const byTime = (a: M, b: M) => a.t - b.t || (a.id < b.id ? -1 : 1);
  const roots = [...moments].filter((m) => rootOf(m.id) === m.id).sort(byTime);
  const rows: TimelineRow<M>[] = [];
  for (const r of roots) {
    rows.push({ moment: r, depth: 0, answering: null });
    for (const m of moments.filter((x) => x.id !== r.id && rootOf(x.id) === r.id).sort(byTime)) {
      const p = parentOf.get(m.id);
      rows.push({ moment: m, depth: 1, answering: p ? byId.get(p) ?? null : null });
    }
  }
  return rows;
}
