// @layer core
import type { MomentView } from '../resurface/types';

/**
 * The journal's page (chronicle journal JN1, JN2, JN8; decision 0151): every kept moment as an entry on one
 * sheet, in the order made, under a heading per day. Pure: the clock is an argument.
 */

/** The entries drawn at first, and added each time the top is reached (JN1). */
export const JOURNAL_PAGE = 30;

export type JournalRow =
  | { k: 'day'; key: string; t: number; today: boolean }
  | { k: 'slip'; key: string }
  | { k: 'entry'; key: string; m: MomentView };

/** The moments the page holds: the feed's and an open walk's (JN8), less what a delete hid, oldest first, ties by id. */
export function journalMoments(_feed: MomentView[], _inOpenWalk: MomentView[], _hidden: ReadonlySet<string>): MomentView[] {
  return [];
}

/**
 * The sheet's rows, oldest above (JN1): the latest `limit` entries under their day headings, today's heading
 * always (JN2), and the slip under it when there is one (JN20). `more` says older entries remain.
 */
export function journalPage(_moments: MomentView[], _now: number, _limit: number, _opts: { slip?: boolean } = {}): { rows: JournalRow[]; more: boolean } {
  return { rows: [], more: false };
}
