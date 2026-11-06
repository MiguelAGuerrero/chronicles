// @layer core
import { signalsOf } from './extractors';
import type { MomentView, Pick, Prefs, Reason, SignalExtractor, Thread } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PickContext {
  now: number;
  /** Decides the order among equals; the shell passes one per open. */
  seed: string;
  prefs: Prefs;
  threads: Thread[];
  extractors: SignalExtractor[];
}

/** FNV-1a: a small stable hash, so a seed orders moments the same way every time. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** The same month and day; a 29 Feb moment keeps 28 Feb in a year that has no 29th (audit 11). */
function sameDay(d: Date, today: Date): boolean {
  if (d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) return true;
  return d.getMonth() === 1 && d.getDate() === 29 && today.getMonth() === 1 && today.getDate() === 28 && !isLeap(today.getFullYear());
}

const CATEGORY: Record<Reason['kind'], number> = { anniversary: 0, thread: 1, month: 2, older: 3 };

/**
 * The moments that can be resurfaced, in the order they are shown (RM7, RM8,
 * RM10): an anniversary, then a moment in a live thread, then the same month
 * of an earlier year, then any older one. Never a moment from the last day,
 * one in Not this one, one without its media or its words. Moments the user
 * asked to see less of go to the back of their group. Pure: the seed is an
 * argument, the clock is `now`.
 */
export function resurfaceOrder(moments: MomentView[], ctx: PickContext): Pick[] {
  const { now, seed, prefs, threads, extractors } = ctx;
  const hidden = new Set(prefs.hidden);
  const dim = new Set(prefs.dim);
  const less = new Set(prefs.less);
  const threadOf = new Map<string, Thread>();
  for (const t of threads) for (const id of t.momentIds) if (!threadOf.has(id)) threadOf.set(id, t);
  const today = new Date(now);

  const keyed: { pick: Pick; cat: number; penalty: number; h: number }[] = [];
  for (const m of moments) {
    if (m.t > now - DAY_MS || hidden.has(m.id) || !m.hasMedia) continue;
    if (m.kind === 'text' && !m.words?.trim()) continue;
    const d = new Date(m.t);
    const years = today.getFullYear() - d.getFullYear();
    let reason: Reason;
    if (years >= 1 && sameDay(d, today)) reason = { kind: 'anniversary', years };
    else if (threadOf.has(m.id)) reason = { kind: 'thread', name: threadOf.get(m.id)!.name };
    else if (years >= 1 && d.getMonth() === today.getMonth()) reason = { kind: 'month' };
    else reason = { kind: 'older' };
    const penalty = dim.has(m.id) || signalsOf(m, extractors).some((s) => less.has(s.term)) ? 1 : 0;
    keyed.push({ pick: { moment: m, reason }, cat: CATEGORY[reason.kind], penalty, h: hash(`${seed}:${m.id}`) });
  }
  keyed.sort((a, b) => a.cat - b.cat || a.penalty - b.penalty || a.h - b.h || (a.pick.moment.id < b.pick.moment.id ? -1 : 1));
  const order = keyed.map((k) => k.pick);
  // The next open starts somewhere else than where the last one ended (RM8).
  if (order.length > 1 && order[0].moment.id === prefs.lastShown) order.push(order.shift()!);
  return order;
}

export function pickResurfaced(moments: MomentView[], ctx: PickContext): Pick | null {
  return resurfaceOrder(moments, ctx)[0] ?? null;
}
