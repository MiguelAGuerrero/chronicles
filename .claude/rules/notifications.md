---
paths:
  - "src/lib/notify/**"
  - "public/sw.js"
  - "src/components/pwa*.ts"
  - "src/components/NotificationSettings.tsx"
  - "src/lib/openers.ts"
  - "src/lib/__tests__/{notify,openers}.test.ts"
---
# Notifications

Local notifications on both platforms (`lib/notify`): the contract, kinds and switches, permission, taps and openers, the web service worker. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **Notifications** (slice 6, NT1-NT12; `notify/core.ts` pure, `transport.native.ts`,
  `transport.web.ts`, `index.ts`). The owner wanted the web to try their look and
  feel, with phones following the same decisions (Nov 1).
  - **One contract:** the app says what (`Notice`: kind, id, title, body, data,
    actions, `inFront`); a `NoticeTransport` says how. Reminder and pause code
    call `notifier` and never a platform API. Taps and actions come back through
    `onResponse` and `routeResponse` the same on both: open (captures wait in
    meta `recall_open`) or stop (`stopRecall`).
  - **Kinds and switches:** Remind me here and Pause reminder, both on (meta
    `notify_off` lists those off, so a new kind starts on). Off sends no
    notification; the screen's own card and sticky reminder still show.
  - **Permission** is asked only from a tap in front (a reminder set, the first
    pause, a switch turned on, the test); a reminder from the background only
    checks. Settings explains denied and unsupported (an iPhone tab not
    installed).
  - **In front:** reminders and pauses are for the background; the test sets
    `inFront`. The phone lists background notices quietly in front; the web
    skips them while the page is visible.
  - **A tap opens at once** where a screen listens (`onRecallOpen`, the walk or
    the home); meta `recall_open` waits only for a cold start.
    - Listeners stack (`lib/openers.ts`), newest first, and return whether they
      opened it. The home declines while a walk is open, so the tap goes on to
      the walk.
    - A single slot once let the walk screen take the home's place and leave
      none, and a tap opened on both screens at once (Nov 1). A phone also
    reads `getLastNotificationResponse()` at load, so a tap that launched the
    app is kept.
  - **A tap kept while the walk screen mounts** (NR3): the walk screen now mounts as the app opens, so
    it can read `recall_open` before the tap is written. `openRecall` tells `onRecallWaiting` listeners
    once it is kept, and the walk screen takes it then.
  - **Web cold open:** with no window, `sw.js` opens the scope with the tap in
    `?notice=`, read once (`noticeFromUrl`) and removed from the URL. With a walk
    open, the home sends a waiting tap on to the walk.
  - **After the audit:** permission is asked first in the tap, before any
    storage (a browser refuses a late prompt); a kind switched off never
    prompts; turning Pause reminder off cancels a pending one; `show` resolves
    whether it showed, so the test never says "Sent." for nothing; a failed
    service-worker registration is retried; old `ambient-` notices are cleared
    at stop for one more release. The switches save as they change.
  - **Shared origin:** GitHub Pages serves every project of the account from one
    origin, so they share notification permission (and IndexedDB). A crafted
    `?notice=` link can only name capture ids, which can't be guessed.
  - **Deferred:** the "in front" rule stays per transport (a phone lists
    background notices quietly; a browser has no list); the Android channel's
    importance (DEFAULT, so the test may not pop up as a banner); unit tests of
    the web transport (the e2e drives the real service worker).
  - **Native** (unverified on a device): the transport behind the contract,
    including the early-tap queue for a cold start and the test banner.
