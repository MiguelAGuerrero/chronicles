# 0196. Quick actions on an entry, Stack with previous, and a stack as a gallery

Date: 2026-11-17 · Status: accepted · Area: captures, chronicle, journal, vision

## Context
Decision 0123 made a moment hold several media, grouped explicitly by an "Add to this moment" pill after a capture that closes
after two minutes, and said separate moments are never merged. The owner, Nov 17: moments made back to back ("turn left onto
Maple Street", then "at the stop sign, turn right onto East Union Boulevard") are separate entries in Chronicle, and outside a
walk nothing brings them together. They do not want a time delta to decide it. They first asked for Add on any moment from the
viewer (a first draft of this slice, set aside), then simplified: "just have a little action button that says add to previous
moment, or just say stack with previous when you capture it in the Chronicles page, and that's it. The displayed UI for any of
the stacks should be almost grid-like or some sort of gallery, collapsible or expandable, to show all the media content." Each
piece is its own unit; how it is displayed depends on whether it is a piece of a bigger moment or alone.

The gate (`/vision`, decision 0094) found it **aligned if reshaped**: it serves Honour and Return, and the rules in its way are
0123's "never merged", the journal's "the past is fixed" (0155), one fix per moment (0036), counts in words and a moment's context.

## Decision
The owner's calls, Nov 17:
- **A row of quick-action icons under every entry** on Chronicle's page: Respond, Add to a thread, Edit and Stack with previous, icons only, with spoken names, in fixed slots. This overrules T5 and decision 0167's preference for a word or a captioned control for this row; the cold find (0167) still checks it, with a one-word caption as the fallback for a glyph it cannot place. Reaction and the map pin stay on the entry's top line.
- **A stack is how a moment's pieces are shown together.** Each piece stays its own unit with its own capture time. No delta, no
  derived grouping and no setting decides it: the owner chooses, by the button.
- **Stack with previous**, one of the four, **moves the new piece in**, only on the entry just kept in this sitting, with Undo (the reverse of Split out,
  0123 MS16). The entry's pieces join the previous moment and the emptied entry goes. It is offered only while nothing points at
  the entry (no thread, reply, reminder, find or reaction), so no link can break.
- **Previous is the moment before it on the same day**, on a walk or off one.
- **A stack's grid is collapsible.** Chronicle's page shows a stack's first piece and the two-card mark, with a control to expand
  it into a grid of every piece and to collapse it again. No tile or label carries a number.

This narrows two rules to this one case and no further: 0123's "Separate moments are never merged" and the journal's "the past is
fixed; nothing inserts on a past page". Both still hold for everything else; connecting existing moments stays a thread (0104).

Defaults taken, for the owner to overrule: Edit is empty on a stack's row; collapsed by default; the 100 m nearness rule (the pill's number) in place of keeping a fix on each piece; the grid on Chronicle's page now, the other lists deferred; an added
piece keeps no place of its own (the moment keeps its one fix, 0036) and says in words when it was made if later.

## Consequences
- One new `Db` method, `joinMoment`, no migration (it repoints `capture.moment_id` and deletes the emptied moment row). A killed app
  finishes a pending join as it does a split (0113). The slice is `specs/stack-with-previous` (SW1-SW18).
- `.claude/rules/journal.md` gains the narrow exception. MS12 (Add only while the pill is open) is unchanged by this slice.
- **Proposed edit to `docs/VISION.md`** (the owner makes it): a Shapes row, "Quick actions on an entry: icons only, with spoken names, in fixed slots; Stack with the moment before | aligned if reshaped | A
  labelled button on the entry just kept, one tap with Undo, moves its pieces into the previous moment of the same day; only
  while nothing points at it; a stack's pieces shown as a collapsible grid, never a number", plus 0123's missing row and 0196 in
  Precedents.
