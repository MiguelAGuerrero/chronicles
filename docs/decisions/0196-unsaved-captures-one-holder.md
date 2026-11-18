# 0196. Unsaved captures have one owner: an app-wide holder, while the app is open

Date: 2026-11-17 · Status: accepted · Area: captures, storage, walk, tabs

## Context
A photo, video or voice memo whose save fails is held for Retry (SA8, decision 0107). Each capture path held its own
(`useCaptures`' state on the walk screen, Navigate, ready, Memories' open line, the recording bar, Respond and the
planner), so leaving a screen dropped what it held, a second failed memo replaced the first, the recording bar's Stop
ended a walk without the photo it held, and Respond and the planner held memos where no Retry was shown. A first
attempt handed a memo from screen to screen (`tend captures 2`, unpushed); its review found eight ways that still lose
a recording (F1-F8). The owner, Nov 17: "Ship fix 1, slice the rest" (`specs/unsaved-captures`).

## Decision
The owner, in person on Nov 17, on the slice's plan:

- **Q1, where held captures live:** "One app-wide holder": a new in-memory module `src/lib/unsaved/`. One list, in the
  order taken, that every screen with capture pills shows and both Stops ask (`heldFor(walkId)`); each entry carries
  its own walk, so any screen's Retry keeps it where it belongs.
- **Q2, how long:** "While the app is open" (UN15 as written). Nothing about a held capture is written to storage; a
  reload or a closed app drops them.
- **Q3, a walk ended without them, and the build:** "Let them go; build as written". At the second hold of Stop, a
  walk's held captures are let go and their files removed (UN8). No ✕ on a pill outside a walk; two pills as today.

- **After the review, Nov 17, in person:**
  - UN6: "Two lines, nothing cut".
  - UN10 on the bar only: "No room left. Retry on the walk screen." (outside a walk: "No room left. Retry on
    Memories."). Other screens keep the full sentence.
  - A capture failing after the walk has ended: "Keep it as its own moment". It stays held with its Retry, and Retry
    keeps it as a moment of its own at its time and place, outside the ended walk; the walk is never recomputed.

## Consequences
- `memoGate` keeps its job (is anything recording or being saved); the holder answers what is held.
- `docs/DEFERRED.md`'s "Held captures live in memory" still holds for a reload; leaving a screen no longer drops them.
- A capture held outside a walk shows until Retry keeps it or the app closes.
