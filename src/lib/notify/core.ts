/*
 * Notifications, the platform-neutral part (v1 slice 6, NT3). The app says
 * what to notify; a NoticeTransport says how, on its platform:
 * expo-notifications on a phone (`transport.native.ts`), the service worker
 * on the web (`transport.web.ts`). Nothing here imports a platform API, so the
 * decisions (which kinds, when to ask, what a tap does) are the same on both
 * and are tested once. Everything stays on the device: no push server.
 */

/** A pause this long gets a reminder that nothing is being recorded. */
export const PAUSE_REMIND_MS = 10 * 60_000;

export type NoticeKind = 'recall' | 'pause' | 'test';

/** The kinds the walker can switch, in Settings' order (NT4). The test notification is not one. */
export const NOTICE_KINDS: readonly { id: Exclude<NoticeKind, 'test'>; label: string; note: string }[] = [
  { id: 'recall', label: 'Remind me here', note: 'A flagged photo, memo or note when you pass it again.' },
  { id: 'pause', label: 'Pause reminder', note: 'When a walk has been paused for 10 minutes.' },
];

export type NoticePrefs = Record<Exclude<NoticeKind, 'test'>, boolean>;
export const DEFAULT_NOTICE_PREFS: NoticePrefs = { recall: true, pause: true };

/** Stored as the kinds switched off (meta `notify_off`), so a new kind starts on. */
export function parseNoticePrefs(raw: string | null): NoticePrefs {
  try {
    const off = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(off)) return { ...DEFAULT_NOTICE_PREFS };
    return { recall: !off.includes('recall'), pause: !off.includes('pause') };
  } catch {
    return { ...DEFAULT_NOTICE_PREFS };
  }
}
export const serializePrefs = (p: NoticePrefs): string => JSON.stringify(NOTICE_KINDS.map((k) => k.id).filter((k) => !p[k]));

/** What a tap carries back: the captures it is about. */
export interface NoticeData {
  captureIds?: string[];
}

export interface NoticeAction {
  id: 'stop';
  title: string;
}

/** One notification, as the app means it; each transport renders it its own way. */
export interface Notice {
  kind: NoticeKind;
  /** One per id: a newer notice with the same id replaces the last (R7). */
  id: string;
  title: string;
  body: string;
  data?: NoticeData;
  /** Offered where the platform has actions (phones, Android Chrome, desktop); iOS web has none (NT9). */
  actions?: NoticeAction[];
  /** Shown even with the app in front (the test). Otherwise the screen shows its own card, and a phone lists it quietly. */
  inFront?: boolean;
}

export type Permission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NoticeResponse {
  id: string;
  data: NoticeData | undefined;
  /** An action's id, or null for a tap on the notification itself. */
  action: string | null;
}

/** How a platform shows notifications. Local only. */
export interface NoticeTransport {
  permission(): Promise<Permission>;
  /** Asks the walker. Only from a tap in front: a browser refuses otherwise, and a background task can't show a prompt. */
  request(): Promise<Permission>;
  show(n: Notice): Promise<void>;
  /** Shows it after a delay. On the web this lasts only while the page lives (NT10). */
  schedule(n: Notice, afterMs: number): Promise<void>;
  /** Cancels a scheduled notice and clears a shown one with this id. */
  cancel(id: string): Promise<void>;
  /** Taps and actions, from whichever platform event delivers them. */
  onResponse(fn: (r: NoticeResponse) => void): void;
}

/** What a tap or an action means (NT8, NT9): the same from either platform. */
export function routeResponse(r: Pick<NoticeResponse, 'data' | 'action'>): { kind: 'open' | 'stop'; captureIds: string[] } | null {
  const ids = r.data?.captureIds ?? [];
  if (!ids.length) return null;
  return { kind: r.action === 'stop' ? 'stop' : 'open', captureIds: ids };
}

export const recallId = (walkId: string) => `recall-${walkId}`;
export const pauseId = (walkId: string) => `pause-${walkId}`;

/** The app's notifier: the same calls on every platform. */
export interface Notifier {
  /** A pause began: remind after PAUSE_REMIND_MS that nothing is recorded (NT10). */
  pauseStarted(walkId: string): Promise<void>;
  /** The pause ended (resumed or stopped): the reminder is no longer due. */
  pauseEnded(walkId: string): Promise<void>;
  /** A flagged capture came back while the app is in the background (R3, NT7). */
  recall(text: { title: string; body: string }, captureIds: string[], walkId: string): Promise<void>;
  /** The walk ended: its notifications go (NT11). */
  walkEnded(walkId: string): Promise<void>;
  /** Asks for permission from a tap in front (a reminder set, a switch turned on). */
  ask(): Promise<Permission>;
  /** Where permission stands, for Settings (NT5). */
  permission(): Promise<Permission>;
  /** A real reminder-style notification, now, whatever is in front (NT6). */
  test(): Promise<Permission>;
}

export function createNotifier(o: {
  transport: NoticeTransport;
  prefs: () => Promise<NoticePrefs>;
  onOpen: (captureIds: string[]) => void;
  onStop: (captureIds: string[]) => void;
}): Notifier {
  const t = o.transport;
  t.onResponse((r) => {
    const route = routeResponse(r);
    t.cancel(r.id).catch(() => {});
    if (route?.kind === 'stop') o.onStop(route.captureIds);
    else if (route?.kind === 'open') o.onOpen(route.captureIds);
  });
  /** Granted now, asking first only when `ask` (a tap in front). */
  const allowed = async (ask: boolean) => {
    const p = await t.permission().catch((): Permission => 'unsupported');
    if (p === 'granted') return true;
    if (!ask || p !== 'default') return false;
    return (await t.request().catch((): Permission => 'denied')) === 'granted';
  };
  const on = async (kind: keyof NoticePrefs) => (await o.prefs().catch(() => DEFAULT_NOTICE_PREFS))[kind];
  return {
    async pauseStarted(walkId) {
      if (!(await on('pause')) || !(await allowed(true))) return;
      await t.schedule(
        { kind: 'pause', id: pauseId(walkId), title: 'Your walk is still paused', body: 'Nothing is being recorded. Open Chronicles to resume or stop it.' },
        PAUSE_REMIND_MS,
      );
    },
    async pauseEnded(walkId) {
      await t.cancel(pauseId(walkId)).catch(() => {});
    },
    async recall(text, captureIds, walkId) {
      // From the background (the location task, a hidden page): never a prompt.
      if (!(await on('recall')) || !(await allowed(false))) return;
      await t.show({
        kind: 'recall',
        id: recallId(walkId),
        title: text.title,
        body: text.body,
        data: { captureIds },
        actions: [{ id: 'stop', title: 'Stop reminding me' }],
      });
    },
    async walkEnded(walkId) {
      for (const id of [recallId(walkId), pauseId(walkId)]) await t.cancel(id).catch(() => {});
    },
    async ask() {
      await allowed(true);
      return t.permission().catch((): Permission => 'unsupported');
    },
    permission: () => t.permission().catch((): Permission => 'unsupported'),
    async test() {
      if (await allowed(true)) {
        await t.show({
          kind: 'test',
          id: 'test',
          title: 'A memory from here',
          body: 'This is how a reminder looks when you pass a flagged capture.',
          inFront: true,
        });
      }
      return t.permission().catch((): Permission => 'unsupported');
    },
  };
}
