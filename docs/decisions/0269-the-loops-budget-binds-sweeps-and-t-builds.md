# 0269. The loop's budget binds sweeps and T builds, highs are always fixed, and what waits on the owner's hand never expires

Date: 2026-11-26 · Status: accepted · Area: process, tend · Amends: [0235](0235-areas-leave-rough-and-the-balance-acts.md) (the budget's reach, the expiry's reach) · From: the owner, in person, Nov 26, on the steward's review of G7's plan (`specs/loop-budget/plan.md`)

## Context
G7 (`specs/loop-budget`) builds decision 0235's review budget, rotation, answer log, inbox expiry and lease. The
steward's plan review (Nov 26) found six questions 0235 left open, each a rule the plan would otherwise have decided by
itself: whether the edits left for the owner's hand age and move like an unanswered question; what is fixed when review
findings exceed the budget; how a T entry built as a quick batch counts (T63, T64 and T65 each drew three to five review
fixes); whether the budget reaches a G slice's own review; whether the area-verb table is a ruling; and whether today's
renumbering at publish is what "decision numbers at publish" meant.

## Decision
The owner's answers, Nov 26, each the recommended option:
- **"Open before the loop" is listed, never moved** ("Listed, never moved (Recommended)"): its items are listed with
  their age as waiting on the owner's hand, never moved to `docs/DEFERRED.md`, and never count toward an area reading
  finished. Every other item under "Needs the owner" unanswered for 30 days moves to DEFERRED as `[owner]` (0235).
- **Highs are always fixed** ("Highs always fixed (Recommended)"): over the budget, a high is fixed whatever the budget and
  is never filed; then the rest in severity order up to the budget; the remainder filed `[loop]` with their severity.
- **Per item; sweeps and T builds only** ("Per item; sweeps and T only (Recommended)"): a quick batch counts one fix per
  item it ships; the budget binds sweeps and T builds (`tend <area> audit N`); a G slice's own review (`<slice> audit
  N`) is outside it.
- **The verb table orders sweeps only** ("Sweep order only (Recommended)"): each area's verbs in `scripts/features.js`
  order `next`'s rotation and are never a ruling a `Serves:` line may cite; walk-screen and map keep the verbs already
  ruled (0261; the proxy's ruling of Nov 20 for map, unconfirmed).
- **Today's `--check` is enough** ("Today's --check is enough (Recommended)"): decision numbers are taken by
  `book:next-decision` and checked at publish (0174); the renumberings since Nov 19 are `--check` doing its job.

## Consequences
- `check:tend` counts review fixes against items shipped per area for `tend` commits only; a high review fix says so
  (`Severity: high`) and is outside the count; `tend:log` refuses a run whose review accepted more than it fixed and
  filed, or that filed a high.
- `npm run records -- inbox age` lists "Open before the loop" apart, as waiting on the owner's hand, with its age.
- All five answers were the recommended options, as 0235's were; G7's answer log is what measures that rate.
