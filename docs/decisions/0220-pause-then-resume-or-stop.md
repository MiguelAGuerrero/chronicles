# 0220. The walk's strip: Pause alone, then Resume or a held Stop; pills, no outline

Date: 2026-11-18 · Status: accepted · Area: walk screen, recording

## Context
The owner, Nov 18: the strip's buttons looked unpolished, outlined boxes beside the walk's numbers. AllTrails' are
text, not boxes, and it shows no Stop while recording: Pause, then Resume and Stop (`docs/research/adjacent-apps.md`,
"Record a walk": Honour; AllTrails' entry there is unverified). The hold to end is this app's own (0008, 0048); no adjacent
app's hold is recorded there.

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
- **A round "…"** opens the walk's settings, beside the drag and a tap on the numbers (a control drawn to be found,
  0167), named as the numbers name them ("Walk settings", "Lower the walk settings"). It shows only while walking: at
  320 px it does not fit beside the paused pair.
- **Paused: Resume and Stop half and half, words only** (the owner, after a mock of three ways: Resume on the left, Stop
  on the right, no icons on either at any width). A round Stop was built first and dropped: its "Stopping…" did not fit
  48 px. Stop stays held (spoken "Hold to stop"; a tap says "Hold to stop the walk").
- Pause, Resume and Stop are pills thin at the sides (4 px) with their words centred, 48 high; below 360 px the words are
  14 px and Pause's icon sits closer, so an hour-long walk's numbers ("1:05:12 · 12.4 km") still leave every word whole.
- **Departures on the owner's call, for later reviews:** `ui-patterns.md` T5 (the walking row mixes the icon-only … with
  the labelled Pause); a tap where Pause was lands on Stop while paused, harmless since Stop needs a hold; the soft pills'
  edges are about 1.2:1 on the strip's ground (their words and glyphs identify them, WCAG 1.4.11).

## Consequences
- Amends 0009's "Pause sits beside Hold, Resume is filled orange" and O27's word under the icon (0172): Pause's word sits
  beside its icon; Resume and Stop are words alone. Stop's spoken name stays "Hold to stop", and a tap says "Hold to stop
  the walk".
- `stopWalk` already ends an open pause at the stop time, so a paused walk stops as any walk does.
- **Amends EW5** (empty walk, the owner's answer, Nov 18: "Ignore the final pause"): every walk stopped from the walk
  screen now has a pause, which EW5 counted as evidence of a walk, so none would be dropped. The pause still open at Stop
  is not counted (`pausesKept`, `lib/emptyWalk/core`); a pause resumed from still keeps the walk. The bar's Stop is
  unchanged. `specs/empty-walk/spec.md` (a mirror) says so; the owner's doc, once it exists, wins.
- The e2e reaches Stop through the harness's `toStop` (taps Pause first); "the walk screen is up" is `walk-actions`.
- Not run on a phone (`docs/NATIVE_UNVERIFIED.md`).
