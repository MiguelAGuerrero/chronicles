import * as Notifications from 'expo-notifications';
// Named: lint's namespace check cannot follow the package's nested `export *` to it.
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import type { NoticeResponse, NoticeTransport, Permission } from './core';

/*
 * The phone's transport (NT3): expo-notifications, local only. Loaded with the
 * location task, before the router, so a tap on a cold start is kept until
 * the notifier listens.
 */
const CHANNEL = 'walk';
/** One category per set of actions; "stop" is the only action so far (R8). */
const STOP_CATEGORY = 'recall';

// "Stop reminding me" opens the app: with the app killed, a background action reaches no listener.
Notifications.setNotificationCategoryAsync(STOP_CATEGORY, [
  { identifier: 'stop', buttonTitle: 'Stop reminding me', options: { opensAppToForeground: true } },
]).catch(() => {});

// In front, the screen shows its own card: a notice is listed quietly, unless it asks to show (the test, NT6).
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const inFront = !!(n.request.content.data as { inFront?: boolean } | undefined)?.inFront;
    return { shouldShowBanner: inFront, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
  },
});

let listener: ((r: NoticeResponse) => void) | null = null;
const early: NoticeResponse[] = [];
Notifications.addNotificationResponseReceivedListener((res) => {
  const r: NoticeResponse = {
    id: res.notification.request.identifier,
    data: res.notification.request.content.data as NoticeResponse['data'],
    action: res.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER ? null : res.actionIdentifier,
  };
  if (listener) listener(r);
  else early.push(r);
});
/** A tap that launched the app may come before any listener (audit 3): read it once, then clear it. */
function launchTap(): NoticeResponse | null {
  const res = Notifications.getLastNotificationResponse();
  if (!res) return null;
  Notifications.clearLastNotificationResponse();
  return {
    id: res.notification.request.identifier,
    data: res.notification.request.content.data as NoticeResponse['data'],
    action: res.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER ? null : res.actionIdentifier,
  };
}

let channel: Promise<unknown> | null = null;
const ensureChannel = () =>
  Platform.OS === 'android'
    ? (channel ??= Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Walk reminders', importance: AndroidImportance.DEFAULT }).catch(() => {
        channel = null;
      }))
    : Promise.resolve();

export const transport: NoticeTransport = {
  async permission(): Promise<Permission> {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'default' : 'denied';
  },
  async request(): Promise<Permission> {
    await ensureChannel();
    const p = await Notifications.requestPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'default' : 'denied';
  },
  async show(n) {
    await ensureChannel();
    const id = await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: {
        title: n.title,
        body: n.body,
        data: { ...n.data, inFront: !!n.inFront },
        ...(n.actions?.some((a) => a.id === 'stop') ? { categoryIdentifier: STOP_CATEGORY } : {}),
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
    return !!id;
  },
  async schedule(n, afterMs) {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { ...n.data, inFront: !!n.inFront } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, afterMs / 1000), channelId: CHANNEL },
    });
  },
  async cancel(id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await Notifications.dismissNotificationAsync(id).catch(() => {});
  },
  onResponse(fn) {
    listener = fn;
    const launched = launchTap();
    // The listener may also have delivered it: one tap is handled once.
    if (launched && !early.some((r) => r.id === launched.id)) early.push(launched);
    for (const r of early.splice(0)) fn(r);
  },
};
