# 0196. Add to a moment you made earlier: the viewer offers Add on any moment, at any time

Date: 2026-11-17 · Status: accepted · Area: captures, chronicle, vision

## Context
Decision 0123 made a moment hold several media, grouped explicitly by an "Add to this moment" pill after a capture. The viewer
offered Add only while that pill was open, two minutes after the last capture (`specs/moment-stacks` MS12, the owner's call,
Nov 10); at any other time it offered Respond, which makes a new moment. The owner, Nov 17: moments made back to back, such
as "turn left onto Maple Street" then "at the stop sign, turn right onto East Union Boulevard", are separate in Chronicle, and
outside a walk there is no way to bring them together. They do not want a time delta to decide it: "I want it to be intuitive
and a part of the experience of the UI itself", by adding to the same moment when it is created or by opening a previous
moment and adding to it, "almost like a graph structure". Each piece is its own unit; how a collection is shown depends on
whether it is a piece of a bigger moment or alone.

The gate (`/vision`, decision 0094) found it **aligned if reshaped**: it serves Honour (the moment arrives whole), and the rules
to keep are one fix per moment (0036), counts in words, moments stay whole and separate moments are never merged (0104, 0123).

## Decision
The owner's calls, Nov 17:
- **A stack is how a moment's pieces are shown together.** Each piece stays its own unit with its own capture time. No time
  delta, no derived grouping, no setting decides it: the owner chooses, by Add.
- **The viewer's dock offers Add on every moment, at any time**, beside Respond, outside a walk and on one. This reverses
  MS12's "only while the pill is open". The walk screen's pill is unchanged. The top-row Add that showed only while the pill was
  open is removed: one control does one job.
- **Respond stays the graph**: a new moment at its own place and time, linked to the one it answers (0104). Its menu is titled
  so the two read apart: "Add to this moment" and "A new moment, linked to this one".
- **Existing moments are never merged.** Add keeps new media in a moment; grouping separate moments stays a thread (0104).

Default taken, for the owner to overrule (the vision is silent on it): **an added piece keeps no place of its own.** The moment keeps
its one fix (0036); a corner the walker has moved on to is kept by Respond. The alternatives, each an architecture call for the
owner: a fix kept on each piece (a migration, and "one fix per moment" no longer holds), or a warning when a new piece is far from
the moment (a location read at add time).

## Consequences
- No migration and no new `Db` method: `useCaptures` already adds a piece to a moment by `into` (MS2, MS3), and the viewer's
  `ReplyDock` carries a `useCaptures`. The slice is `specs/moment-append` (MA1-MA13).
- MS12 is superseded by MA6; MS14 (never merged) and MS15 (kept on the device) hold.
- **Proposed edit to `docs/VISION.md`** (the owner makes it): a Shapes row, "Add to a moment made earlier | aligned if reshaped |
  Add and Respond side by side in the viewer's dock, always; Add keeps a piece in the moment with its own time and no new place;
  Respond makes a linked moment at its own place; no time delta, no merge; its size never a number", and 0196 in Precedents.
