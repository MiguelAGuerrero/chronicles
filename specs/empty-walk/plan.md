# Empty walk: plan (EW)

## Files
- `src/lib/emptyWalk.ts` (`// @layer core`): `isEmptyWalk(input)`, `EMPTY_WALK_M`. No clock, no ports.
- `src/lib/session.ts` (shell): `stopWalk` returns `{ dropped: boolean }`: after writing the end, it reads moments, pauses, stills,
  fills and trace through the existing `db` and `readTrace`, asks core, and when empty schedules `deletions.schedule` for the walk.
  A read failure returns `dropped: false` (EW10). Both views read the result, so neither holds the rule (EW7).
- `src/app/walk.tsx`, `src/components/RecordingBar.tsx`: on `dropped` go back (not `/replay`) and let the toast show.
- `src/lib/deletion/core.ts` / `UndoToast`: the walk text "Nothing to keep. Walk dropped." (EW8).

## Data
No new truth, no migration. It deletes through `db.deleteWalk`.

## Trap to settle before code
`_layout.tsx:40` calls `deletions.flush()` on **every route change**, which stores the delete. Leaving the walk screen for home would
store it at once and Undo would vanish. Recommended: the drop is scheduled after navigation, and `flush` ignores the route change that
the stop itself caused (a `holdThroughNext` flag in `pending`, pure, tested). The owner's call in 0113 was "flush on leaving the screen",
so this is a narrow exception, recorded as an amendment to 0113.

## Tests
- `src/lib/__tests__/walk-screen/emptyWalk.test.ts` (core): EW2 to EW6, one test each.
- `src/lib/__tests__/recording/stopDrop.test.ts` (shell, `fakePorts()`): EW1, EW7, EW9, EW10.
- `src/lib/__tests__/deletion/dropText.test.ts`: EW8 (no digit, no "empty").
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
