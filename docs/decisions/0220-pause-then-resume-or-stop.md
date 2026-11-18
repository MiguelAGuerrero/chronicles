# 0220. The walk's strip: Pause alone, then Resume or a held Stop; pills, no outline

Date: 2026-11-18 · Status: accepted · Area: walk screen, recording

## Context
The owner, Nov 18: the strip's buttons looked unpolished, outlined boxes beside the walk's numbers. AllTrails' are
text, not boxes, and it shows no Stop while recording: Pause, then Resume and Stop. Nike Run Club does the same, and
holds to end (`docs/research/adjacent-apps.md`, "Record a walk": Honour).

## Decision
The owner's four answers, Nov 18:
- **While walking, the strip shows Pause alone.** Paused, it shows Resume and Stop; ending a walk from the walk screen
  is Pause, then hold Stop. Stop stays held (0008, 0048): "protection against accidents".
- **The recording bar is left as it is**: its own held Stop, no Pause (0048 stands), the way out when the walk screen
  can't be reached.
- **Icon and word side by side, no outline**, 48 high to tap. First built bare (no fill); the owner, the same day:
  "Have them be pill fills, please." Pause and Stop are soft pills (`theme.line` on the strip's ground); the hold's fill
  sweeps across Stop's pill while held.
- **Resume a solid accent pill, its icon and word white** (the owner's pick over a soft pill with an orange word): the
  strip's one primary action while paused, as 0172 allows.
- At 320 px the pills are 8 px at the sides and the word 14 px, so Resume and Stop together take what the boxed Pause and
  Hold did and the walk's numbers stay whole.

## Later the same day: AllTrails' size and place (fix walk-strip-buttons)
The owner: "The button size seems a little bit small and position is awkward. I'm leaning towards how AllTrails had it"
(a wide Pause pill with a round "…" beside it). Their answers:
- **One row still** (the strip's 69 shared with the ready screen, NR5/NR6), not AllTrails' two rows: the numbers keep
  their width and the buttons fill the rest of it.
- **A round "…"** opens the walk's options, beside the drag and a tap on the numbers (a control drawn to be found, 0167).
  It shows only while walking: at 320 px the numbers, …, Resume and Stop do not fit in one row while paused.
- **Paused: Resume wide, Stop round** (held, its glyph alone; its spoken name "Hold to stop" and a tap's "Hold to stop the
  walk" unchanged). Pause and Resume are wide pills, … and Stop 48 round, all 48 high, no outline.

## Consequences
- Amends 0009's "Pause sits beside Hold, Resume is filled orange" and O27's word under the icon (0172): the word sits
  beside it. Stop's word is "Stop"; its spoken name stays "Hold to stop", and a tap says "Hold to stop the walk".
- `stopWalk` already ends an open pause at the stop time, so a paused walk stops as any walk does.
- **Amends EW5** (empty walk, the owner's answer, Nov 18: "Ignore the final pause"): every walk stopped from the walk
  screen now has a pause, which EW5 counted as evidence of a walk, so none would be dropped. The pause still open at Stop
  is not counted (`pausesKept`, `lib/emptyWalk/core`); a pause resumed from still keeps the walk. The bar's Stop is
  unchanged. `specs/empty-walk/spec.md` (a mirror) says so; the owner's doc, once it exists, wins.
- The e2e reaches Stop through the harness's `toStop` (taps Pause first); "the walk screen is up" is `walk-actions`.
- Not run on a phone (`docs/NATIVE_UNVERIFIED.md`).
