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
| Any list or viewer | Delete a moment, media, a thread; remove from a thread | Occasional, at home looking back | Act at once + Undo pill that waits | 7 (undoable delete), 10 (undo) | Google Photos: trash with undo; Apple Photos: Recently Deleted (teardown) |
| Walk actions | Delete a whole walk | Rare, much lost | Confirm card with the verb, then Undo | 8 | |
| The pill | Undo, Dismiss | Just after a delete | Snackbar-style pill with two labelled actions, no auto-dismiss | 10, F3 | M3 snackbar with action |
| Viewer | Look at the photo without chrome | Every visit | Tap toggles the bars | 2 | Apple Photos, Google Photos: tap hides the controls (teardown, verified) |
| Viewer | Remind me here, Go here | Occasional | Items in More | 3 | Google Photos: More at the top (verified) |
| Viewer | Reply kept, Connected, reminder set | After the action | No pill; screen-reader announcement; the result shows in the info line or More | 19, 20 | HIG: no confirmation for routine success |

## Deferred, and why

- **Tap to hide on a video:** a video's own controls take its taps (expo-video); hiding bars over a playing video is its own change.
- **Hiding unavailable menu items vs disabling them** (M5, platforms disagree): not touched.
- **The delete confirm's size line** ("Frees about 34 MB"): it goes with the confirm for moments and media; the walk's confirm keeps it.

## Native paths that will not run on a device

The pill's announcement (`announceForAccessibility`), the screen-reader check that keeps the bars (UC8), the tap toggle on a native photo, the background flush. Each goes into `docs/NATIVE_UNVERIFIED.md` with its UC id. Native has never run on a device.

## For you to decide

1. **When a waiting Undo is stored, besides Undo, ✕, another delete and the app going to the background.** With no timer, a delete can wait a long time; a killed app drops a waiting delete (the thing comes back), as it does today in its 5 s. Options:
   - **(a) Also when you leave the screen** (a route change): the pill stays while you look around the screen you deleted from, and is stored as you move on. No data model change. (Recommended.)
   - **(b) Only on Undo, ✕, another delete or the background:** the pill follows you between screens until one of those. Simplest, but the longest window for a kill to drop it.
   - **(c) Store at once, keep a recoverable copy until the pill goes** (a "deleted" mark, files kept, purged later): survives a kill, but is a data model change (a migration) and a new cleanup path.
