// @layer core
import { dayKey } from '../days';
import { signalsOf } from './extractors';
import { titleCase } from './terms';
import type { MomentView, Prefs, SignalExtractor, Thread } from './types';

/** Rules version: bump when a derivation rule below changes (nothing is cached yet, RM23). */
export const THREAD_RULES = 'resurface-2';
/** A term is a thread from this many moments, on this many days (RM11). */
export const THREAD_MIN_MOMENTS = 3;
export const THREAD_MIN_DAYS = 2;
/** A term in more than this share of moments says nothing (RM12); judged once there are enough moments. */
export const THREAD_MAX_SHARE = 0.4;
export const THREAD_SHARE_POOL = 10;
/** A term the user asked to see less of counts this much less in the order. */
const LESS = 0.5;

interface Acc {
  ids: MomentView[];
  days: Set<string>;
  months: Set<string>;
  shown: Map<string, number>;
}

/**
 * The things a user keeps coming back to. A term is a thread when it appears
 * in at least three moments on at least two days; threads are ordered by how
 * they recur over time (distinct days, and months twice over), never by how
 * much was said in one sitting. O(n log n): one pass to index terms.
 */
export function deriveThreads(moments: MomentView[], extractors: SignalExtractor[], prefs: Prefs, _now: number): Thread[] {
  const by = new Map<string, Acc>();
  for (const m of moments) {
    const day = dayKey(m.t);
    for (const s of signalsOf(m, extractors)) {
      let a = by.get(s.term);
      if (!a) by.set(s.term, (a = { ids: [], days: new Set(), months: new Set(), shown: new Map() }));
      a.ids.push(m);
      a.days.add(day);
      a.months.add(day.slice(0, 7));
      const w = s.shown ?? s.term;
      a.shown.set(w, (a.shown.get(w) ?? 0) + 1);
    }
  }
  const removed = new Set(prefs.removed);
  const less = new Set(prefs.less);
  const tooCommon = moments.length >= THREAD_SHARE_POOL ? moments.length * THREAD_MAX_SHARE : Infinity;
  const out: Thread[] = [];
  for (const [term, a] of by) {
    if (removed.has(term) || a.ids.length < THREAD_MIN_MOMENTS || a.days.size < THREAD_MIN_DAYS || a.ids.length > tooCommon) continue;
    const ms = [...a.ids].sort((x, y) => y.t - x.t);
    const shown = [...a.shown.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0][0];
    const byYear = new Map<number, Set<number>>();
    for (const m of ms) {
      const d = new Date(m.t);
      byYear.set(d.getMonth(), (byYear.get(d.getMonth()) ?? new Set()).add(d.getFullYear()));
    }
    const season = [...byYear.entries()].filter(([, ys]) => ys.size >= 2).sort((x, y) => y[1].size - x[1].size || x[0] - y[0])[0];
    out.push({
      term,
      name: prefs.renames[term] ?? titleCase(shown),
      momentIds: ms.map((m) => m.id),
      first: ms[ms.length - 1].t,
      last: ms[0].t,
      seasonMonth: season ? season[0] : null,
      score: (a.days.size + a.months.size * 2) * (less.has(term) ? LESS : 1),
    });
  }
  return out.sort((x, y) => y.score - x.score || y.last - x.last || (x.term < y.term ? -1 : 1));
}
