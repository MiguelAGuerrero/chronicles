# 0219. The sheet's first known height is set, not sprung; the plain peek stays as the read's placeholder

Date: 2026-11-18 · Status: accepted · Area: tabs, motion · Reads: M5 (`specs/polish-motion/spec.md`), `.claude/rules/motion-polish.md`'s "`HomeSheet` springs its height" · From: the review of `tend tabs T38` (`/tend inbox T38 yes`, the proxy's yes under 0157, 2026-11-18)

## Context
T38 ("Chronicle's stacked empty peek springs from 76 to 124 px as the map mounts") was built as the proxy's yes under
decision 0157, to corrected criteria (the rise is the nothing-walked, no-walk-open state; 0148's walk-open 76 kept):
with nothing walked and no walk open, the sheet takes the stacked peek's 124 with no spring as soon as Chronicle's
first read lands. Before that read the peek is plain at 76 and draws nothing it cannot yet know (`tend tabs audit 1`).
So the walker sees the plain peek for a moment, then the line and Navigate at their height in one step.

The review's steward asked two questions only the owner answers (0157: "a steward's Silent question" is always the
owner's): whether M5 ("The home sheet settles at its height with a spring rather than a fixed timing") governs the
peek's first known height when the map mounts, or only the moves after it; and whether the plain peek should be seen
at all before the first read, or the sheet stay unseen until its state is known.

## Decision
The owner's answers, in person, 2026-11-18, verbatim:

- M5: **"Only later moves"**. The first known height is set, not sprung; M5's spring holds for every move after it.
- The plain peek: **"Keep the plain peek"**. The plain 76 shows as a placeholder before the read (HIG, Loading), then
  the one step to 124.

These are the owner's calls, not the proxy's. T38 itself stays the proxy's yes under 0157.

## Consequences
- M5 and motion-polish.md's "`HomeSheet` springs its height in JavaScript" are read as covering every move after the
  sheet's first known height: the mount's own move and the move Chronicle's first read asks for are set
  (`sheetMoveSnaps`, `lib/motionTokens`); every other move springs, before the first read too (`tend tabs audit 37`),
  and a first read that lands on a running spring springs on from it (`audit 38`).
- The plain peek is a placeholder for a moment at most: the tabs journey bounds it to 6 frames on the web build
  (`tend tabs audit 39`); on a phone its length is unverified (`docs/NATIVE_UNVERIFIED.md`).
- M5's words in the owner's spec doc and motion-polish.md's line are still to say by hand ("Open before the loop"):
  the loop adds rule lines only (0135), and a spec is the owner's.
