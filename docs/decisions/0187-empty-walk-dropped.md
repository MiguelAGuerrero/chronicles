# 0187. A walk with nothing in it is dropped at Stop, not replayed

Date: 2026-11-17 · Status: accepted · Area: deletion, walk, ui

## Context
The owner, Nov 16: a walk started by mistake, where nothing moved and nothing was kept, still ended in the whole replay. The gate (`/vision`) said aligned if reshaped; the steward found two breaches (absence of data read as emptiness; a delete the owner never made made final by a kill), three drifts and one tone issue, all taken into `specs/empty-walk/spec.md` (EW1-EW12).

## Decision
The owner's calls, Nov 16:
- **Empty** is no moment of any kind, no pause, still or gap decision, at least one read fix, and every read fix within **15 m** of every other (`lib/emptyWalk/core.ts`, the spread, never the distance from the first fix). Time never decides. No read fix at all (none stored, or all gated out) is uncertainty and keeps the walk.
- Stopping an empty walk, from the walk screen or the recording bar, skips the replay and schedules the walk's delete through the Undo window. The pill says **"Walk not kept."**, with Undo.
- **A kill restores the walk.** The drop is the app's call, not the owner's, so it is a `volatile` job: never saved to `pending_delete`, never finished by a launch. Amends 0113's "a killed app completes the delete", for this drop only.
- The 0113 whole-walk confirm is waived for it: the walk holds nothing, and Undo is offered.
- **A narrow exception to 0113's "flush on every route change":** the one screen change Stop causes does not store the drop (`deletions.holdNextFlush`, set by `endWalk(..., { leaves: true })`). Any later route change, Close, or another delete still stores it.

## Consequences
- `lib/emptyWalk/{core,shell,index}.ts`; `session.endWalk` is the one stop both views call; `toastText(kind, what, dropped)`; `PendingJob.volatile`, `PendingState.pending.dropped`.
- A walk the reader cannot read keeps its replay (EW10).
- Tests: `src/lib/__tests__/deletion/emptyWalk.test.ts`; the `capturehome` journey's EW checks.
- VISION.md is at its size budget, so its Precedents table has no row for this call; the owner may move older history out to add one.
- Deferred: a sweep of walks already saved; native paths in `docs/NATIVE_UNVERIFIED.md`.
