# Empty walk: plan (EW)

## Files
- `src/lib/emptyWalk.ts` (`// @layer core`): `isEmptyWalk(input)`, `EMPTY_WALK_M = 15` (spread of read fixes, farthest pair). No clock, no ports.
- `src/lib/session.ts` (shell): `stopWalk` returns `{ dropped: boolean }`: after writing the end, it reads moments, pauses, stills,
  fills and trace through the existing `db` and `readTrace`, asks core, and when empty schedules `deletions.schedule` for the walk with a `volatile` flag: it is hidden at once and stored on dismiss or a later route change, but never written to meta `pending_delete`, so a kill leaves the walk (EW9).
  A read failure returns `dropped: false` (EW10). Both views read the result, so neither holds the rule (EW7).
- `src/app/walk.tsx`, `src/components/RecordingBar.tsx`: on `dropped` go back (not `/replay`) and let the toast show.
- `src/lib/deletion/core.ts` / `UndoToast`: the walk text "Walk not kept." (EW8).

## Data
No new truth, no migration. It deletes through `db.deleteWalk`.

## Steward triage (Nov 16)
S1 accepted (EW6 reversed); S2 accepted: a kill restores (EW9), confirm waived in the spec; S3 accepted: the owner confirmed the 0113
exception and 15 m; S4 accepted (15 m, EW4 courtyard fixture, EW12 time never decides); S5 accepted ("Walk not kept."); S6 accepted
(spread, EW11).

## Trap, the owner approved the exception
`_layout.tsx:40` calls `deletions.flush()` on **every route change**, which stores the delete. Leaving the walk screen for home would
store it at once and Undo would vanish. Recommended: the drop is scheduled after navigation, and `flush` ignores the route change that
the stop itself caused (a `holdThroughNext` flag in `pending`, pure, tested). Approved by the owner Nov 16 as a narrow exception; a decision
record amending 0113 is written when the slice ships.

## Tests
- `src/lib/__tests__/walk-screen/emptyWalk.test.ts` (core): EW2 to EW6, EW11, EW12, one test each (a 40 m courtyard fixture, a cold-start jump fixture, a poor-accuracy-only fixture).
- `src/lib/__tests__/recording/stopDrop.test.ts` (shell, `fakePorts()`): EW1, EW7, EW9 (kill leaves the walk), EW10.
- `src/lib/__tests__/deletion/dropText.test.ts`: EW8 (no digit, none of "nothing", "empty", "wasted").
- `scripts/e2e/journeys/`: add one check to the walk journey: start, stop with no movement, no `/replay`, notice shown (EW1, EW8), Undo restores.

## Screen actions
- Stop (hold): unchanged control; the outcome differs. Where the owner looks: the screen they land on, a pill at the top as on
  other deletes. Default I took: the pill is the existing quiet `UndoToast`, nothing added (overrule if you want it louder).
- Undo: the pill's existing action (matrix: Undo for an unrequested delete).

## Deferred
Sweeping walks already saved; a recoverable trash (0113 keeps it its own slice).

## Native
`stopWalk` and the toast run on a phone only after a development build: add a NATIVE_UNVERIFIED item (Do: start a walk, stand still,
hold Stop; Expect: no replay, "Nothing to keep" pill, Undo restores) (EW1, EW9). Native has never run on a device.
