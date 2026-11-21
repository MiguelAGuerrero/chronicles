# Plan: thread a moment as it is kept (TK1-TK11)

From G11 (`/tend inbox`, the owner's yes and "Build it now", Nov 21), decision 0253, the brief
`docs/research/threading-at-capture.md`. The mock-up is approved; this plan draws nothing it did not show.

## Files

| File | Layer | Change |
|---|---|---|
| `src/lib/threads/picker.ts` | core | `lastAddedTo(members)` (TK4); `threadSearch(rows, query)` over a thread's name and heading words (TK5); `filterPicker` unchanged |
| `src/components/threads/AddToThread.tsx` | view | the pool from `poolWithOpenWalks` (TK6); "Last added to" first (TK4); the search field over threads and moments on the first step, not focused (TK5); a picture on photo and video rows (TK7); the name step after a new thread (TK8); `moment` narrowed to `{ id }`; `onDone(message | null, ok)` (null: the card already said it) |
| `src/components/threads/ThreadFromPill.tsx` | view (new) | the card over the walk screen and Navigate, ready, in the app's `Modal` (transparent), its Escape and Back closing it (TK3) |
| `src/components/walk/AddToMomentPill.tsx` | view | Thread before × (TK1); Thread beside New moment with Group captures on (TK2); `onThread` prop |
| `src/app/walk.tsx` | view | `onThread` opens `ThreadFromPill` for `momentPill.store.get().id`; its line ("Connected", "Could not connect") through the screen's toast |
| `src/components/MomentBar.tsx` | view | the same on Navigate, ready |
| `src/components/CaptureView.tsx`, `src/components/chronicle/MemoriesScreen.tsx` | view | `onDone`'s null message: say nothing more after the name step |
| `scripts/e2e/journeys/capthread.js` | journey (new) | TK1-TK10 on the walk screen |

Seven source files and a journey. No new dependency, no migration, no new `Db` method, no navigation change: the card
is a `Modal` like the note page both hosts already open, and only while no other is up (the pill hides under the note
page, a card and the drawer).

## Data

None new. "Last added to" reads `thread_member.added_at` (truth, already stored). The thread shell's `startThread`,
`addToThread` and `rename` are unchanged; the name step calls `rename` on the new thread's id.

## Tests per criterion

| Id | Test |
|---|---|
| TK1, TK2 | journey `capthread`: the pill's buttons and their order, spoken names; Group captures on (`stacks`'s way of setting `group_captures`) |
| TK3 | journey: × and Escape close the card, the pill and the stack still there |
| TK4 | unit `threads/capThread.test.ts` (`lastAddedTo`: newest `added_at`, a hidden thread skipped, none with none); journey: the first row after one thread exists |
| TK5 | unit (`threadSearch` by name, by heading words, empty query, nothing); journey: "mur" finds Murals and a moment |
| TK6 | unit (`poolWithOpenWalks` holds an open walk's moments, the card's pool); journey: mid-walk the first photo is offered |
| TK7 | journey: a photo row holds an image beside its words and line |
| TK8 | journey: the name step, "Murals" typed, Done; the stored thread's name |
| TK9 | unit: `capThread` words hold no digit; journey: a thread holding the moment is disabled, "This moment is in it" |
| TK10 | journey: three photos, one thread |
| TK11 | unit over `fakePorts()` (`threads.startThread` with a moment not kept returns null; `rename` failing) and the card's words in `capThreadWords` |

New words go in one core module, `src/lib/threads/capThread.ts` (core), with the two functions above, so a test holds
them to "no digit".

## The testing's size

**Flow** (`docs/TESTING.md`): a screen changes on two hosts. Journeys: `capthread` (new, alone until green), then
`stacks` (the pill's buttons, MS2), `threads` (the card from the viewer) and `responses` (the pool) in one batch;
`launch` as the smoke. About 12 minutes.

## Deferred

- A keep-threading mode (the owner's answer 3): after use, a question of its own.
- `MomentPicker`'s own keyboard lift (already deferred, `threads.md`).

## Native paths not run on a device

The pill's fifth button at 320 pt, the card in a transparent `Modal` over the walk map with the keyboard up, the
small pictures in the rows. Items in `docs/NATIVE_UNVERIFIED.md`.

## Cost

The card reads `threads.moments()` once per open (every moment row, no media; it already did from the viewer) and
filters in memory: n is a library of years, thousands of rows, O(n log n) for the sort, once per keystroke for the
search (as the viewer's card today). Small pictures load only for the rows drawn (a page of 40). Nothing runs per frame
or per fix; the pill gains one button. Harness: none moves (the card is closed while walking); device only for the
Modal over the live map.

## Actions, goals and controls

| Screen | Goal | How often, where | Control | Matrix | Adjacent apps |
|---|---|---|---|---|---|
| Pill | Put the moment just kept with others like it | Now and then, on foot, one hand, right after a capture | A 44 pt ink button with the link mark, spoken "Add this moment to a thread", before × | 24 (a scoped sub-task without losing context), 22's restraint for the stack | Pinterest's Save asks at once; Lightroom Classic's B |
| Card | Add to the series I am making now | Each mural after the first | The first row, "Last added to" | 16 (pick from a long list, with search) | Lightroom Classic's target collection; Pinterest's last board first |
| Card | Find an older thread or moment | Occasional | A search field, closed until tapped | 16, 17 (16 px input) | Keep's label filter |
| Card | Start a series with the earlier mural | The first of a series | A new thread, then rows with pictures | 16 | Keep's Create |
| Name step | Name the series so search finds it | Once per thread | A labelled text field, Leave it unnamed, Done | 17, 20 (no further confirmation) | Pinterest's new-board name |
| Card | Leave | Any time | × at the top right, Escape, Back | 23 | all |

**Against precedent.** The album cameras choose before the shutter; we choose after, because a choice before the
shutter is a capture behind an extra tap (VISION.md, Never). Keep files from a menu; we file from the pill, because a
moment's actions live in its menu only once it is no longer being made (0114's rule is for a moment that exists; the
pill is where a moment just kept is still "this moment").

**Where the owner will look first.** On the pill that rises after the photo's editor closes, beside camera, mic and
note: the link mark is the same one the viewer's Add to a thread carries. Defaults that make it quieter: the mark is
wordless (the pill's buttons are, MS6), spoken by name; the search is closed until tapped (the owner's call).

## Steward

(below, once run)
