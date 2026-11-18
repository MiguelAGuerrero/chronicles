# 0181. The faster lane

Date: 2026-11-16 · Status: accepted · Area: process · Amends: 0074 (a weekly full pass), 0145 (in the loop, the replay's or VISION's words go to the steward alone) · From: the orchestrated `/tend` session's insights, section 13

## Context
Phase 3 of the orchestrated `/tend` session ran about 300k-600k tokens and one to two hours a run, and used a week's
allowance in two and a half days. The review round was the largest cost: two or three reviewers, each reading
15-36 before and after pictures, then a second build pass fixing every finding test-first (run 7 made 10
audit fixes, 8 of them low). Before pictures took about a third of a run's wall clock; `check:affected`'s
journeys ran after every rebase. Yet every high came from the auditor on a change to recording, storage,
navigation or timing.

## Decision
The owner, in person on Nov 16: "I may [prefer] a quick iteration, faster development turnaround over
comprehensive testing"; to the proposal, "Adopt it all"; to when, "Skills now, gate later". For `/tend` and
the runs `/tend-orchestrator` briefs (`.claude/skills/ship.md`, "The faster lane"); a `/fix` or a slice the
owner typed keeps its own review:

1. **Reviewers by risk.** Wording or style only: one reviewer, the `ux-reviewer`, or the `steward` when the
   words are the replay's or a `docs/VISION.md` line's. Behaviour that touches recording, storage,
   navigation, timing or data: the `auditor` always, with the `ux-reviewer` when a screen changed. Records
   only: none.
2. **Review fixes in the run: medium and above.** Lows are filed `[loop]` in their area's section of
   `docs/DEFERRED.md`, for that area's next sweep.
3. **Pictures: after only**, at 320 px (390 where width matters). Before pictures only when a reviewer cannot
   judge a visual change without them.
4. **Journeys before publishing:** those holding a new or changed check, plus `launch` as the smoke. The rest
   of `check:affected`'s set is left to CI's gates (CI runs no journey) and a weekly full pass, which a run
   makes when the run log (`.claude/skills/tend/runs.jsonl`) has no `"e2e":"full"` line in seven days, and
   records there (`docs/TESTING.md`, "Choosing the journeys", 6).
5. **Test-first stays for logic**, and a unit test must fail when its wiring is reverted. A words-only change
   needs one unit test of the words seen failing, not every journey check seen failing first.
6. **Two runs may go at once** on disjoint areas (no file and no record section in common); records conflicts
   resolve with `npm run records -- redo`.
7. **Briefs are filled from `briefs.md`'s template**, with the run's specifics only, not retyped; its review
   handoff, pictures and journeys lines follow points 1-5.

What stays, because it caught real defects: the auditor on every behaviour change; test-first for logic and
the reverted-wiring check; reviewer reports saved verbatim; the owner's questions asked during review waits
(0173); the bookkeeping commands (`landed`, `review-paths`, `next-audit`, `next-decision --check`; 0174).

Not changed: the records gate (`scripts/records.js`: the two-removals cap, the add-quote rule, `[loop]` to
`[phone]`). The proposal's point 8 waits for its own decision.

## Consequences
- A run is expected at about 150k-250k tokens and under an hour, with the highs still caught.
- Lows wait in `docs/DEFERRED.md` for an area sweep instead of being fixed where found.
- A regression in a journey no run's change holds a check for surfaces at the weekly full pass, not before
  the push that caused it.
