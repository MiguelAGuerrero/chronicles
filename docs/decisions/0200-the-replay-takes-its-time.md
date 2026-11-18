# 0200. The replay takes its time: no cap, a button to the next moment, the grid kept

Date: 2026-11-18 · Status: accepted · Area: replay · Amends: 0085 (the soft cap of about 60 s; RR5), RR1, RR2, RR9, RR11, MS17 (the grid's hold)

## Context
The owner, Nov 18: the replay "feels a little choppy, too fast. There's no rhythm or pacing. The display of media is a bit too fast.
There's not enough time to savor a moment because it flashes on for like 1-2 seconds". A photo was fully shown about 1.5 s, and the
whole path shrank to fit 0085's cap of about 60 s. A prototype (https://claude.ai/artifact/7oLxtuZMhpvXd18H4BLR5P) was shown twice
and audited (`docs/research/replay-ceremony-direction-audit.md`); the gate said aligned if reshaped.

## Decision
The owner's calls, Nov 18:
- **Each moment adds its own time.** The path stays brisk and a walk with many moments is simply longer. 0085's soft cap goes, and
  with it the shrinking toward floors (RR5). Memos and videos were never capped and still are not.
- **A skip ahead:** "a chevron that goes to the next moment where the controls for the replay exist". It is the answer to a long
  replay; there is no ceiling on length, no progress bar and no count (RR19 stands). On the plan the owner chose "a chevron,
  tested": the cold find took the bare chevron for something else and tapped Skip first, so the button says **Next**. It sits
  under Skip, not beside it: with the clock between Hold and Skip the three do not fit one row on a 375 px phone.
- **Photos tighten only at one stop**, the last whole again; a photo walked to is never shortened (on the steward's finding
  that shortening by order ranks later moments lower).
- **The grid is kept** for a moment of several pictures (0123, MS17), because a stack is "a multifaceted capture of a singular
  moment"; it holds longer.

Taken with them from the steward's pass on the spec: a press never edits out the lows (a passed place whispers on landing, a break
says how much later it is); a note is never taken away before it could be read.

## Consequences
- `specs/replay-pace/spec.md` (RY1-RY22): the numbers are the prototype's until the owner sends tuned ones, in `REPLAY_RHYTHM`.
- `Showing` gains `stops` and `frame` takes the press: inside 0086's seam (a ceremony says what happens when); the screens still
  import no ceremony.
- 0085's "nothing waits for a tap", its bubbles, cards, whispers and clock stand. The camera, the breaks, the opening and close,
  what stays behind and captions are the owner's leanings for later slices, each gated before its own spec; none is decided here.
- VISION.md is at its size budget, so its Precedents table has no row for this call; the owner may move older history out to add one.
