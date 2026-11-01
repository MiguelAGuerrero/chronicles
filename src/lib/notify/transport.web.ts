import type { NoticeResponse, NoticeTransport, Permission } from './core';
import { noticeFromUrl, SW_MESSAGE, swOptions } from './webNotice';

/*
 * The web's transport (NT2, NT3): the service worker in `public/sw.js` shows
 * notifications, so an installed app can show them while its page is hidden.
 * A web exception (AGENTS.md): expo-notifications has no web build. Local
 * only: no push subscription, no server. Scheduled notices live in this page,
 * so they fire only while it is alive (NT10); iOS suspends a hidden page.
 */
const base = process.env.EXPO_BASE_URL ?? '';
const supported = () =>
  typeof window !== 'undefined' && 'Notification' in window && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

let reg: Promise<ServiceWorkerRegistration | null> | null = null;
function registration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null);
  reg ??= navigator.serviceWorker
    .register(`${base}/sw.js`, { scope: `${base}/` })
    .then(() => navigator.serviceWorker.ready)
    .catch(() => {
      // Not kept: the next notice tries again (audit 4).
      reg = null;
      return null;
    });
  return reg;
}
// Registered on load (NT2); a browser without service workers loses notifications only.
registration();

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const hidden = () => typeof document !== 'undefined' && document.visibilityState !== 'visible';

const mapPermission = (p: NotificationPermission): Permission => (p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'default');

async function show(n: Parameters<NoticeTransport['show']>[0]): Promise<boolean> {
  // In front, the screen shows its own card; only the test asks to show anyway (NT6, NT7).
  if (!n.inFront && !hidden()) return false;
  const r = await registration();
  if (!r || Notification.permission !== 'granted') return false;
  await r.showNotification(n.title, swOptions(n, base) as NotificationOptions);
  return true;
}

export const transport: NoticeTransport = {
  async permission() {
    return supported() ? mapPermission(Notification.permission) : 'unsupported';
  },
  async request() {
    if (!supported()) return 'unsupported';
    return mapPermission(await Notification.requestPermission());
  },
  show,
  async schedule(n, afterMs) {
    clearTimeout(timers.get(n.id));
    timers.set(n.id, setTimeout(() => {
      timers.delete(n.id);
      show(n).catch(() => {});
    }, afterMs));
  },
  async cancel(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    const r = await registration();
    for (const n of (await r?.getNotifications({ tag: id }).catch(() => [])) ?? []) n.close();
  },
  onResponse(fn) {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
        const m = e.data as { type?: string; id?: string; data?: NoticeResponse['data']; action?: string | null } | undefined;
        if (m?.type === SW_MESSAGE && typeof m.id === 'string') fn({ id: m.id, data: m.data, action: m.action ?? null });
      });
    }
    // A window the service worker opened for a tap (no window was open): read once, then drop it from the URL.
    if (typeof window !== 'undefined') {
      const r = noticeFromUrl(window.location.search);
      if (r) {
        const url = new URL(window.location.href);
        url.searchParams.delete('notice');
        window.history.replaceState(window.history.state, '', url.href);
        setTimeout(() => fn(r), 0);
      }
    }
  },
};
