# 0262. The Nov 24 batch's four open questions: T51's pin, T48's pill and Undo, T50's 22 px

Date: 2026-11-24 · Status: accepted · Area: replay, walk-screen, map, process · Relates to: 0094, 0233, 0236, 0244, 0245

## Context
On Nov 24 the owner had six `/tend inbox` yeses built in one batch on one branch (T45, T48, T50, T51, T54, T60), each
test-first with unit tests only, then one end pass: the journeys, and one review round over the whole batch (the
`auditor`, the `ux-reviewer` and the `steward`). The steward left four questions it could not settle from
`docs/VISION.md` (its Silent questions), each with a recommended answer of keeping what was built:

1. **T51:** a capture with no place of its own is now pinned on the replay's card where its start time falls on the
   path, a place inferred, not one the phone read. Should that pin carry a mark saying so?
2. **T48:** the discarded memo's pill now stays until Undo, Close, the next capture or the screen going. Is a pill that
   stays until closed within Restraint ("the content is the novelty, not the chrome")?
3. **T50:** a loop's two ends are drawn as one mark while they lie within "one marker's diameter", 22 px on screen. Keep
   that edge?
4. **T48's Undo:** no expectation line holds what T48 serves (a memo discarded by a slip is not lost to a timer). Should
   one be drafted, and when?

## Decision
The owner's answers, in person, Nov 24.

1. **T51:** "Keep as built". The inferred pin is drawn as any pin, with no mark.
2. **T48:** "Yes, as chosen". A pill that stays until it is closed is within Restraint.
3. **T50:** "Keep 22 px". One marker's diameter stays the edge (the review's flicker at the edge is filed apart,
   `docs/DEFERRED.md`, Map, walk screen and motion polish).
4. **T48's Undo:** "Draft it next sweep". The next walk-screen sweep drafts an Honour line, "a memo discarded by a slip
   can be brought back until you say otherwise", and the owner confirms it then. No line is added now; the carry-over
   is in the ledger's walk-screen note.

## Consequences
- Nothing in the batch's code changes for these answers.
- The next `/tend walk-screen` drafts that expectation line in lens 0 and asks the owner to confirm it (decision 0236).
