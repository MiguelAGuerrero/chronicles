# Plan: UI conformance

Spec: `specs/ui-conformance/spec.md` (UC1-UC11). Read this, then say go (or what to change). No code has been written.

## Files

| Area | Files | What changes |
|---|---|---|
| Undo window (UC1, UC2) | `src/lib/deletion/pending.ts` (core), `deletion/index.ts` | No timer: `schedule` waits until `undo`, `dismiss` (new: stores at once), another `schedule`, or `flush` (background, and see "For you to decide"). `UNDO_MS` goes. |
| The pill (UC1, UC3) | `src/components/UndoToast.tsx` | A ✕ beside Undo (`dismiss`), 44 px each, spoken names. |
| Deletes (UC4, UC5) | `src/components/CaptureView.tsx`, `WalkActions.tsx`, `chronicle/MemoriesScreen.tsx`, `lib/deletion/core.ts` | Moment, media and thread deletes skip the confirm; the walk keeps it. `toastText` gains "Removed from the thread". |
| Remove from a thread (UC6) | `lib/threads/shell.ts`, `lib/threads/rules.ts` | `removeFromThread` goes through the Undo window; `visibleThreads` hides a waiting membership (`thread/moment` key). The confirm-remove card goes. |
| Viewer (UC7, UC8, UC9) | `CaptureView.tsx`, `threads/ReplyDock.tsx` | `chrome` state: a tap on a photo toggles it; hidden, the top bar, strip and dock unmount and the photo fills the screen; a screen reader keeps them (native only). Remind and Go here become More items (`viewer-remind`, `viewer-go` kept as test ids). |
| Pills (UC10) | `CaptureView.tsx`, `ReplyDock.tsx`, `threads/AddToThread.tsx` | "Connected", "Reply kept", "It will come back…", "No more reminders here" become `AccessibilityInfo.announceForAccessibility`; failures, Saved to Photos and Downloaded stay. |

Data: none (no migration). No new feature folder: tests go in `deletion/`, `threads/`, and the journeys.

## Tests per criterion

| Criteria | Where | Name |
|---|---|---|
| UC1, UC2 | `src/lib/__tests__/deletion/deletion.test.ts` (the pure window over a fake timer) | `UC1: ...`, `UC2: ...` |
| UC3, UC4, UC5 | the `deletion` journey (the pill's two buttons and their size; a moment and media delete with no card; a walk's card) | `check('UC3: ...')` ... |
| UC6 | `threads/shell.test.ts` (Remove scheduled, membership hidden, Undo restores) and the `threads` journey | `UC6: ...` |
| UC7, UC9 | the `edit` journey (the photo viewer: tap hides and shows, the photo's box grows; More holds Remind and Go here) | `UC7`, `UC9` |
| UC8 | `UNTESTED` (`device:` the web build always reports a screen reader on) and a device item | |
| UC10 | the `threads` journey (no "Connected" or "Reply kept" pill; the info line says In a thread) | `UC10` |
| UC11 | the journeys as they stand (`threads`, `qol`, `walk`, `memories`, `replay`), updated only for the moved buttons | |

## Each action, its goal and its control (`docs/research/ui-references.md`, section 2)

| Screen | Action | Goal, frequency, situation | Control | Matrix | Precedent |
|---|---|---|---|---|---|
| Any list or viewer, the walk screen's viewer too | Delete a moment or a thread; remove from a thread | Routine; at home, and on a walk one-handed | Act at once + Undo pill that waits, kept recoverable through a lock (UC2) | 7 (undoable delete, "if restorable"), 10 (undo) | Google Photos: trash with undo; Apple Photos: Recently Deleted (teardown) |
| Walk actions | Delete a whole walk; remove its photos, videos and memos | Rare, much lost | Confirm card that says what goes, then Undo | 8 | |
| The pill | Undo, Dismiss | Just after a delete | Snackbar-style pill with two labelled actions, no auto-dismiss | 10, F3 | M3 snackbar with action |
| Viewer | Look at the photo without chrome | Every visit | Tap toggles the bars | 2 | Apple Photos, Google Photos: tap hides the controls (teardown, verified) |
| Viewer | Remind me here, Go here | Occasional | Items in More; a reminder's state in the info line | 1 (the bar holds one or two actions), 3 | Google Photos: More at the top (verified) |
| Viewer | Reply kept, added to a thread, reminder set | After the action | No pill: an inline status in the info line, announced | 19 (inline status near the thing), 20 | HIG: no confirmation for routine success |

## Deferred, and why

- **Tap to hide on a video:** a video's own controls take its taps (expo-video); hiding bars over a playing video is its own change.
- **Hiding unavailable menu items vs disabling them** (M5, platforms disagree): not touched.
- **The delete confirm's size line** ("Frees about 34 MB"): it goes with the confirm for moments and media; the walk's confirm keeps it.

## Native paths that will not run on a device

The pill's announcement (`announceForAccessibility`), the screen-reader check that keeps the bars (UC8), the tap toggle on a native photo, the background flush. Each goes into `docs/NATIVE_UNVERIFIED.md` with its UC id. Native has never run on a device.

## Steward triage (Nov 10: 0 breaches, 4 drift, 1 tone, all accepted)

- **S1 drift, accepted:** with no confirm, an Undo stored when the app goes to the background lasts only until the phone locks. The wait now survives the background (UC2); what a kill does is the decision below. A4 (a destructive item from a menu is confirmed elsewhere) gives way to A3 only because the delete stays restorable while the pill is up.
- **S2 drift, accepted:** removing a walk's media keeps its confirm (UC5).
- **S3 drift, accepted:** a kept reply, an added thread and a reminder say so inline in the info line, not by a pill and not by nothing (UC10).
- **S4 drift, accepted:** a set reminder shows in the info line (UC12); the table cites matrix row 1.
- **S5 tone, accepted:** Undo and ✕ 8 px apart, Undo the prominent one, ✕ named "Close, it stays deleted" (UC3).
- **Silent, for you:** whether the pill should say what a delete frees ("Moment deleted · about 3 MB"); left out unless you want it.

## For you to decide

1. **What a killed app does to a waiting delete.** The wait now survives the phone locking (steward S1). Today a killed app drops a waiting delete, so the moment comes back; with no timer the wait can be long. Options:
   - **(a) Keep it waiting across a kill** (recommended): the waiting ids are kept in meta, so after a relaunch the delete is stored and the moment stays gone; Undo is offered only while the pill is up. Your act always happens. No migration, a meta key.
   - **(b) A kill drops it** (today's rule): the moment comes back after a crash or a forced quit, with no word.
   - **(c) A recoverable trash** (a deleted mark, files kept, a Recently deleted list, purged later): safest and the precedent's way (Photos, Google Photos), but a data model change, a migration and a new screen; its own slice.
