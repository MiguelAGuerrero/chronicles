---
paths:
  - "src/lib/rides.ts"
  - "src/lib/__tests__/rides.test.ts"
---
# Rides

Rides (a bus, trolley or train inside a walk): how `readTrace` finds them and how every consumer must treat them. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **A bus, trolley or train inside a walk is a ride** (the owner's call, Nov 1, after a
  bus ride showed only "Weak GPS" and no trace: every fix over 7 m/s was dropped as a
  jump). Rides are part of exploring: drawn dashed, holding captures, counted for
  places, never for streets or walked distance.
- **Reading** (`readTrace`, pure): fixes are gated, split at pauses and gaps over 60 s,
  and each stretch is searched for rides (`RIDE_RULES`): a 20 s window in which more
  than half the speeds are over 7 m/s and the net movement is 4.5 m/s or more,
  counted as the window slides (linear: a 3 h walk reads in about 8 ms on a desktop).
  - **Speed:** the phone's own where it gives one over 0 (Android reports 0 for "no
    reading"), else the movement over 5 s, or since the fix before when fixes are
    further apart.
  - **Edges:** a ride runs from its first fix over 7 m/s back to the last stop and
    on to the next, judged by the slower of the speed behind and ahead, so a GPS jump
    or a run-up at the stop is never drawn into it. `joins` keeps a jump between the
    walk and a ride as a gap.
  - **Joins:** rides join across traffic still at 3 m/s (however long) or a stop
    (3 min, 150 m). A ride under 20 s, or that never gets 200 m from where it began
    (drift), is dropped as before. Inside a ride, 100 m/s is a jump.
- **Two traces, two kinds of consumer.**
  - Walked only (snapping, walk me back, Explore's "passed", the solid line): use
    `tr.walked` with `tr.breaks` (pauses and rides), so a ride breaks the walk
    however short.
  - Walked and ridden (places, placing captures, the replay's dot, `here`): use
    `smoothKept(tr)` (or `keptFixes` unsmoothed) with the pauses only. Never pass
    `tr.breaks` there: every ride fix lies inside its own break. Never
    `smoothDwells(keptFixes(tr))`: a stop inside a ride would become a gap in it.
  - The title still comes from walked metres (`assignAreas`), unless the walk has
    none.
- **Drawn dashed** (`rides` prop, `RIDE_DASH`, the trace's green on its white edge,
  hidden with the trace while navigating). `rideRuns` joins a ride to the walk
  either side unless the step is a jump (`joins`). The web map carries
  `data-rides="<rides>:<points>"` for the e2e.
- **Distance:** `traceDistances` gives walked (as before) and ridden. The summary's
  `ride_m` (SQLite migration 10, nullable; absent on older IndexedDB rows) falls
  back to the trace's in the replay. The strip puts "+ 539 m ride" on a second line;
  the card adds "+ 539 m by ride" under its line (`card-ride`), so "walked" isn't
  said twice.
- **Streets are read only where you walked** (`snapWalk`: walked bounds); places from
  the whole trace, and a walk that is all ride is still placed. `SNAP_RULES` 3
  re-reads every walk.
- **Replay** (`schedule(..., rides)`): a ride keeps its real share of the path up to
  4 s, all rides together at most half, squeezed evenly (a `Warp`), so the dot
  glides along it and stops at captures on it. Gap warps inside a ride are dropped:
  warps must never overlap, or `toActive` runs backward.
- **On a ride** (`ridingAt`, through stops of up to 3 min, ending after 20 s walking
  30 m from where it stopped): a quiet "On a ride" chip, the one status chip shown
  when nothing is wrong; Explore names nothing, gives no pocket alert and starts no
  read; the fog reads no streets; the dead-zone nudge doesn't count it; navigation
  neither re-routes nor says "off your route"; reminders and memories go on.
  "Weak GPS" is judged by `lastGoodAt`, the newest fix inside the accuracy gate, kept
  or not.
- **Live** (`useLiveTrace`): raw fixes are kept and read again whole at each 2 s
  publish that has a new fix, since a ride is only known once it lasted a while, and
  then from where it began. Between fixes, only `ridingAt` runs, on the last read.
  Ride lines are re-sent to the map only when they change (`sameRuns`).
  Deferred: caching the settled part of a long walk.
- **The phone's task** reads each batch with the two minutes before it (`tail`), so
  reminders fire from a ride. After a relaunch, the first 20 s of a ride are missed
  (deferred). Native (unverified on a device): the task's tail, the dashed layer,
  migration 10.
- **Audited (Nov 1):** 14 findings, 11 fixed with a regression test each
  (`rides audit N` in `rides.test.ts`); old walks gain their rides' places only when
  their replay opens, as with every rule change.
