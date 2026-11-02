import { db } from '../db';
import { createNotifier, parseNoticePrefs, serializePrefs, type NoticePrefs } from './core';
import { transport } from './transport';

export { NOTICE_KINDS, PAUSE_REMIND_MS, type Notifier, type NoticePrefs, type Permission } from './core';

/** Meta: the notification kinds switched off in Settings (NT4). */
export const NOTIFY_OFF_KEY = 'notify_off';

export async function loadNoticePrefs(): Promise<NoticePrefs> {
  return parseNoticePrefs(await db.getMeta(NOTIFY_OFF_KEY));
}
export async function saveNoticePrefs(p: NoticePrefs): Promise<void> {
  await db.setMeta(NOTIFY_OFF_KEY, serializePrefs(p));
}

/**
 * The app's notifier (NT3): the platform transport, the walker's switches, and
 * what a tap does. A tapped reminder's captures wait in meta for the screen
 * that mounts next (a cold start has no router yet): the walk if one is open,
 * else the home (R4). expo-router and the reminder store are loaded lazily: on
 * a phone this module loads with the location task, before the router.
 */
export const notifier = createNotifier({
  transport,
  prefs: loadNoticePrefs,
  onOpen: (ids) => {
    // The screen in front opens it at once (audit 1); else it waits in meta for the next screen.
    (async () => {
      const { openRecall } = await import('../discovery/recallCheck');
      if (await openRecall(ids)) return;
      const open = await db.getOpenWalk().catch(() => null);
      const { router } = await import('expo-router');
      router.navigate(open ? '/walk' : '/chronicle');
    })().catch(() => {});
  },
  onStop: (ids) => {
    import('../discovery/recallCheck').then(({ stopRecall }) => Promise.all(ids.map(stopRecall))).catch(() => {});
  },
});
