# 0033. Notifications: one contract on both platforms, local only

Date: 2026-11-01 · Status: accepted · Area: notifications

## Context
Slice 6, NT1-NT12. The owner wanted the web to try their look and feel, with phones following the same decisions (Nov 1). expo-notifications has no web build.

## Decision
One contract: the app says what (`Notice`: kind, id, title, body, data, actions, `inFront`); a `NoticeTransport` says how. Reminder and pause code call `notifier` and never a platform API. Taps and actions come back through `onResponse` and `routeResponse` the same on both: open (captures wait in meta `recall_open`) or stop (`stopRecall`).

Local only: no push subscription, no server. Kinds: Remind me here and Pause reminder, both on (meta `notify_off` lists those off, so a new kind starts on). Permission is asked only from a tap in front; a reminder from the background only checks.

## Consequences
- `notify/core.ts` (pure), `transport.native.ts`, `transport.web.ts`, `index.ts`; the web goes through a service worker (`public/sw.js`), a listed native-first exception (0006).
- Listeners stack (`lib/openers.ts`), newest first; a web cold open passes the tap in `?notice=` (`noticeFromUrl`).
- iOS shows web notifications only for a Home Screen app, with no actions, and suspends a hidden page, so a pocketed iPhone gets nothing.
- Shared origin: GitHub Pages shares notification permission and IndexedDB across the account's projects.
- Deferred: the "in front" rule per transport, the Android channel's importance, unit tests of the web transport. Native unverified: the transport, the early-tap queue, the test banner.
