// @layer core
import { dayKey } from '../days';
import type { MomentView } from '../resurface/types';

/**
 * The journal's page (chronicle journal JN1, JN2, JN8; decision 0154): every kept moment as an entry on one
 * sheet, in the order made, under a heading per day. Pure: the clock is an argument.
 */

/** The entries drawn at first, and added each time the top is reached (JN1). */
export const JOURNAL_PAGE = 30;

export type JournalRow =
  | { k: 'day'; key: string; t: number; today: boolean }
  | { k: 'slip'; key: string }
  | { k: 'entry'; key: string; m: MomentView };

/** The moments the page holds: the feed's and an open walk's (JN8), less what a delete hid, oldest first, ties by id. */
export function journalMoments(feed: MomentView[], inOpenWalk: MomentView[], hidden: ReadonlySet<string>): MomentView[] {
  const seen = new Set<string>();
  const out: MomentView[] = [];
  for (const m of [...feed, ...inOpenWalk]) {
    if (seen.has(m.id) || hidden.has(m.id) || (m.walkId && hidden.has(m.walkId))) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * The sheet's rows, oldest above (JN1): the latest `limit` entries under their day headings, today's heading
 * always (JN2), and the slip under it when there is one (JN20). `more` says older entries remain. `moments`
 * are in book order already (`journalMoments`).
 */
export function journalPage(moments: MomentView[], now: number, limit: number, opts: { slip?: boolean } = {}): { rows: JournalRow[]; more: boolean } {
  const shown = moments.slice(Math.max(0, moments.length - limit));
  // `now` is the page's clock, which can trail an entry just written (the page left open past midnight) or a clock
  // set back: today is the later of the two days, so its heading and the slip are never drawn twice (audit 2).
  const last = shown.length ? dayKey(shown[shown.length - 1].t) : '';
  const today = last > dayKey(now) ? last : dayKey(now);
  const rows: JournalRow[] = [];
  let day: string | null = null;
  const heading = (key: string, t: number) => {
    rows.push({ k: 'day', key: `day:${key}`, t, today: key === today });
    if (key === today && opts.slip) rows.push({ k: 'slip', key: 'slip' });
    day = key;
  };
  for (const m of shown) {
    const key = dayKey(m.t);
    // An entry stamped after "now" (a clock set back) still reads under its own day.
    if (key !== day) heading(key, m.t);
    rows.push({ k: 'entry', key: m.id, m });
  }
  if (day !== today) heading(today, now);
  return { rows, more: moments.length > shown.length };
}
