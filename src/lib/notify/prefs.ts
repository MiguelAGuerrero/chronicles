// @layer shell
import type { Ports } from '../ports/types';
import { parseNoticePrefs, serializePrefs, type NoticePrefs } from './core';

/** Meta: the notification kinds switched off in Settings (NT4). */
export const NOTIFY_OFF_KEY = 'notify_off';

/** The notification switches, kept in meta as the kinds switched off, so a new kind starts on (NT4). */
export function createNoticePrefs(p: Pick<Ports, 'db'>) {
  return {
    async loadNoticePrefs(): Promise<NoticePrefs> {
      return parseNoticePrefs(await p.db.getMeta(NOTIFY_OFF_KEY));
    },
    async saveNoticePrefs(prefs: NoticePrefs): Promise<void> {
      await p.db.setMeta(NOTIFY_OFF_KEY, serializePrefs(prefs));
    },
  };
}
