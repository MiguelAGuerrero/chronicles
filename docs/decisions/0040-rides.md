# 0040. A bus, trolley or train inside a walk is a ride

Date: 2026-11-01 · Status: accepted · Area: rides, trace

## Context
The owner's call, Nov 1, after a bus ride showed only "Weak GPS" and no trace: every fix over 7 m/s was dropped as a jump. The concept doc's "Rides" tab, R1-R14.

## Decision
A bus, trolley or train inside a walk is a ride. Rides are part of exploring: drawn dashed, holding captures, counted for places, never for streets or walked distance.

## Consequences
- `readTrace` (`src/lib/rides.ts`, pure) finds rides by `RIDE_RULES`: a 20 s window in which more than half the speeds are over 7 m/s and the net movement is 4.5 m/s or more.
- Two kinds of consumer: walked only (snapping, walk me back, Explore's "passed", the solid line) use `tr.walked` with `tr.breaks`; walked and ridden (places, placing captures, the replay's dot, `here`) use `smoothKept(tr)` or `keptFixes` with the pauses only. Never `smoothDwells(keptFixes(tr))`.
- Drawn dashed (`rides` prop, `RIDE_DASH`, `rideRuns`, `joins`); `traceDistances`; the summary's `ride_m` (SQLite migration 10); "+ 539 m by ride" on the card; `SNAP_RULES` 3.
- Replay: `schedule(..., rides)` squeezes rides with a `Warp`; warps must never overlap.
- On a ride (`ridingAt`): a quiet "On a ride" chip; Explore, the fog and re-routing pause; reminders and memories go on (0032, 0037).
- Audit (Nov 1): 14 findings, 11 fixed (`rides audit N` in `rides.test.ts`).
- Deferred: caching the settled part of a long walk; the first 20 s of a ride after a relaunch. Native unverified: the task's tail, the dashed layer, migration 10.
