# 0208. The walk's strip: Pause alone, then Resume or a held Stop; bare icon and word

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
- **Icon and word side by side, no border or fill**, 48 high to tap. The hold's fill sweeps behind Stop's icon and word
  while held, the only ground it takes.
- **Resume in the accent** (icon and word, no fill): the strip's one primary action while paused, as 0172 allows.

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
