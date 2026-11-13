# 0155. Tap to capture a place, and a quiet pass-by

Date: 2026-11-12 · Status: accepted · Area: explore, captures · Amends: E8, E18 (a capture finds the one place within 60 m), E11 (what a walk passed), 0031, SH4 (retired) · From: `/fix`, then `/slice tap-to-capture-places`

## Context
A moment taken near a point of interest found it by itself within 60 m, and with two in reach a chip asked which. The owner
often meant something else. They asked for it to be deliberate and for passing very close to a place to be noticed quietly,
with the distance a setting.

## Decision (the owner's answers, Nov 12)
- A capture finds a place only after a tap on the place's card, "Capture here": the next capture of that walk finds it.
  Arming clears after that capture, when the walk ends, and when the walker is farther than 60 m from the place. Plain
  capture is unchanged and stays one tap. The "Which place is this moment about?" chip and a loose moment's find are gone.
- Passing is a quiet mark, never a find and never a count: "Passed X without stopping" (`passedLine`), now within the
  pass-by distance (4-20 m, default 8 m, `explore_pass`) instead of 60 m. Places within 60 m are still named on the map.
- A walk keeps the distance it was walked with (`walk_pass:<id>`), so changing the setting never rewrites an old replay;
  a walk without it reads the default.
- Vision: aligned if reshaped (steward S1-S4 accepted: the armed line is plain ink above the stack; no surface counts passes).

## Consequences
Walks recorded before this read 8 m, not the 60 m they showed at the time (`docs/DEFERRED.md`). SQLite and IndexedDB are
unchanged (two meta keys). No derivation rule changed, so `SNAP_RULES` is untouched.
