import * as Notifications from 'expo-notifications';
// Named: lint's namespace check cannot follow the package's nested `export *` to it.
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from './db';
import type { Notifier } from './notify.types';

/** A pause this long gets a reminder that nothing is being recorded. */
export const PAUSE_REMIND_MS = 10 * 60_000;
const CHANNEL = 'walk';
const pauseId = (walkId: string) => `pause-${walkId}`;
const RECALL_CATEGORY = 'recall';
const STOP_ACTION = 'stop';

// "Stop reminding me" on the notification itself (R8). It opens the app: with
// the app killed, a background action reaches no listener (expo-notifications).
Notifications.setNotificationCategoryAsync(RECALL_CATEGORY, [
  { identifier: STOP_ACTION, buttonTitle: 'Stop reminding me', options: { opensAppToForeground: true } },
]).catch(() => {});
Notifications.addNotificationResponseReceivedListener((res) => {
  const data = res.notification.request.content.data as { captureIds?: string[] } | undefined;
  const ids = data?.captureIds ?? [];
  if (!ids.length) return;
  Notifications.dismissNotificationAsync(res.notification.request.identifier).catch(() => {});
  if (res.actionIdentifier === STOP_ACTION) {
    // Through the reminder store, so its in-memory copy forgets the flag too.
    import('./discovery/recallCheck').then(({ stopRecall }) => Promise.all(ids.map(stopRecall))).catch(() => {});
    return;
  }
  // A tap opens the memory, playing (R4). The ids wait in meta for the screen
  // that mounts next (a cold start has no router yet): the walk if one is
  // open, else the home. expo-router is loaded lazily: this module loads with
  // the location task, before the router's entry.
  if (res.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    db.setMeta('recall_open', JSON.stringify(ids))
      .then(() => import('expo-router'))
      .then(({ router }) => router.navigate('/walk'))
      .catch(() => {});
  }
});

// In front, the walk screen shows its own reminder; the notification is for a phone in a pocket.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let ready: Promise<boolean> | null = null;
/**
 * Asks once, when it is first needed (the first pause, a reminder set), not at
 * launch. With `ask` false (the location task, in the background, where no
 * prompt can show) it only checks, and caches nothing.
 */
function permitted(ask = true): Promise<boolean> {
  if (!ask) return Notifications.getPermissionsAsync().then((p) => p.granted, () => false);
  ready ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Walk reminders',
        importance: AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  })().catch(() => {
    ready = null;
    return false;
  });
  return ready;
}

/** Local notifications only: nothing is sent to or through a server. */
export const notifier: Notifier = {
  async pauseStarted(walkId) {
    if (!(await permitted())) return;
    await Notifications.scheduleNotificationAsync({
      identifier: pauseId(walkId),
      content: { title: 'Your walk is still paused', body: 'Nothing is being recorded. Open Chronicles to resume or stop it.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: PAUSE_REMIND_MS / 1000, channelId: CHANNEL },
    });
  },
  async ask() {
    await permitted();
  },
  async recall(text, captureIds, walkId) {
    if (!(await permitted(false))) return;
    await Notifications.scheduleNotificationAsync({
      // One per walk: a newer reminder replaces the last, never a stack (R7).
      identifier: `recall-${walkId}`,
      content: { title: text.title, body: text.body, categoryIdentifier: RECALL_CATEGORY, data: { captureIds } },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
  },
  async pauseEnded(walkId) {
    await Notifications.cancelScheduledNotificationAsync(pauseId(walkId)).catch(() => {});
    await Notifications.dismissNotificationAsync(pauseId(walkId)).catch(() => {});
  },
};
