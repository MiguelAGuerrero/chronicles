import type { Notice, NoticeResponse } from './core';

/*
 * The web transport's pure parts (NT8, NT9), shared with the service worker's
 * protocol in `public/sw.js`: the message it posts on a tap, and the URL it
 * opens when no window is open. Kept here so it can be tested.
 */

/** The type of the message `sw.js` posts to a window on a tap or an action. */
export const SW_MESSAGE = 'notice-response';

/** A tap carried in the URL of a window the service worker opened (a cold open), or null. */
export function noticeFromUrl(search: string): NoticeResponse | null {
  try {
    const raw = new URLSearchParams(search).get('notice');
    if (!raw) return null;
    const m = JSON.parse(raw) as { type?: string; id?: string; data?: NoticeResponse['data']; action?: string | null };
    if (m?.type !== SW_MESSAGE || typeof m.id !== 'string') return null;
    return { id: m.id, data: m.data ?? undefined, action: m.action ?? null };
  } catch {
    return null;
  }
}

/** `showNotification`'s options for a notice: tagged by id, so a newer one replaces the last. */
export function swOptions(n: Notice, base: string) {
  return {
    body: n.body,
    tag: n.id,
    data: n.data ?? {},
    icon: `${base}/icon-192.png`,
    badge: `${base}/icon-192.png`,
    ...(n.actions?.length ? { actions: n.actions.map((a) => ({ action: a.id, title: a.title })) } : {}),
  };
}
