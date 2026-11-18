# 0227. The bar's Stop through a memo being saved; no empty-walk drop while a save is under way

Date: 2026-11-18 · Status: accepted · Area: tabs, recording, captures · Amends: 0048 (the bar's Stop refuses under a memo), 0187 (an empty walk is dropped at Stop)

## Context
Inbox T35 ("The bar's Stop calls a memo still being saved "recording""): a memo save that outlasts the bar's 5 s wait
read "A voice memo is recording. Save it first.", and a save that never settles refused the bar's Stop until a reload
(DEFERRED, "Tabs and the recording bar", auditor F5). The owner's answer, in person, Nov 18: **"Yes, as recommended"**.

Before building, `/tend` found that the recommended shape, built alone, lets a memo saving through the stop land in a
walk the empty-walk drop (0187) deletes, or in no walk once the drop is stored: the drop reads the walk's moments
before the memo's row exists. A photo still being kept past the bar's 5 s wait already met the same drop. The owner's
answer to that, in person, Nov 18: **"Shape + never drop mid-save"**.

The review asked whether "Hold Stop again in a moment" promises that the next hold waits for the save (it goes after
its own 5 s wait, saved or not). The owner, in person, Nov 18: **"Keep the words"**.

A walk deleted from its replay while a memo is still being saved into it would take a late row with it, or leave one
with a deleted walk. The owner, in person, Nov 18: **"Becomes a loose moment"**.

## Decision
- `memoGate` tells a memo recording from one still being saved, each save by its number (`stopUnder`). Past the bar's
  5 s wait, a save still running reads **"The voice memo is still being saved. Hold Stop again in a moment."** in the
  bar's line; a memo recording with none being saved still reads "A voice memo is recording. Save it first."
- **A save still running after a second hold's wait no longer blocks the bar's Stop.** The memo keeps saving into the
  ended walk, as a photo being kept does. A save begun after the first hold is said before any stop goes through it.
- **No empty-walk drop while a save is under way at the stop** (a memo recording or being saved, a photo or video being
  kept, a held capture's Retry; `memoGate.underWay`, `unsaved.retrying`, asked before the walk's rows are read and
  again after): the walk is kept and its replay
  plays, uncertain means kept, as EW6 already reasons. A stop that goes through a save pins the walk until the drop
  is decided, so a save that ends meanwhile cannot slip it.
- **A Stop's second hold lets go only the held captures it warned of** (`unsaved.ended(walkId, only)`): a save that
  fails as the walk ends stays held for Retry rather than going unwarned with them (UN8 holds for what was warned of).
- **A walk's delete waits, bounded at 10 s, for the saves under way into it** (memo saves and kept photos, the bar's
  photo included; `WALK_SAVES_WAIT_MS`, `deletion/runner.ts`): those go with the walk. A save that lands after the
  bound is moved to a loose moment, never lost.
- "Never drop mid-save" holds for every stop: both Stops end through one shell once their own waits are over
  (`lib/unsaved/stopEnd`, tend tabs audit 42). The walk screen keeps its own waits and words.

## Consequences
- Amends 0048's consequence "It refuses under a memo (`memoGate`)": it refuses under a memo recording, and under a save
  still running only for the first hold that meets it.
- Amends 0187's "Stopping an empty walk ... skips the replay and schedules the walk's delete": not while a save is under
  way, from either Stop. The walk screen's Stop otherwise keeps its waits and its words.
- The rule lines that still say the bar's Stop refuses under a memo, or that a walk with no moment is dropped, are the
  owner's to reword ("Open before the loop", `docs/STATUS.md`); the loop added its lines beside them.
- Tests: `src/lib/__tests__/tabs/barStopMemo.test.ts`, `src/lib/__tests__/deletion/emptyWalk.test.ts` and
  `src/lib/__tests__/captures/unsavedShell.test.ts` (`tend tabs T35`); the `unsaved` journey's T35 checks.
- The owner accepted one gap: an app killed between a late save's row and its move to a loose moment leaves a row of
  a deleted walk (`docs/NATIVE_UNVERIFIED.md`).
- Not run on a phone: a native memo's save through the bar's Stop (`docs/NATIVE_UNVERIFIED.md`).
