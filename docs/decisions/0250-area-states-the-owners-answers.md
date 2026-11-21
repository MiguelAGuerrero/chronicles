# 0250. Area states: what waits on the owner, the share's line, the alarm on T entries, and a no-surface build's lens 0

Date: 2026-11-21 · Status: accepted · Area: process, tend · Amends: 0235 (its rough rule and its inbox count, as built),
0236 (lens 0 for a build with nothing a person sees) · From: `/tend inbox G6 yes`, the steward's plan review of
`specs/area-states` (G6)

## Context
Building G6 (decision 0235), the steward read the plan before any code and found four questions the decision does not
settle: a medium the loop may not fix (walk-screen's React Compiler skips, in "Open before the loop" since Nov 19), the
share's line (0235 names none), whether the whole inbox counts toward the alarm (81 bullets at Nov 19, 49 unanswered,
which would read "outgrowing its base" whatever the states, so G6's own "Done when" could not hold), and lens 0 for a
build whose area is the loop (`tend:log` asks a build for expectation lines, and the loop has none). The owner answered
in person, 2026-11-21.

## Decision
The owner's answers, in person, 2026-11-21:

- **"Waits on you: settling"**: a medium whose fix lies outside what the loop may edit and that is filed to the owner
  ("Open before the loop", a `T` entry or `[arch]`) reads as waiting, not open: it keeps its area `settling`, and the
  state's reason names it. A DEFERRED `[loop]` item whose fix the loop may not make (it says so, or names a path the loop
  never edits) is the same.
- **"Take the proposed value"**: the balance reads "outgrowing its base" when more than half of the areas swept twice or
  more are rough and more than three of them are; an area's first sweep shows its state and counts in the share only
  from its second. One named constant, `ROUGH_SHARE` 0.5 beside `LIMITS.rough` 3, a starting value the owner tunes from
  the run log.
- **"Read and print all; alarm on T only"**: the balance reads and prints every item under "Needs the owner" ("Last
  tend", the last run's digest, apart), counted by section, answered or not, phone apart; the alarm stays on unanswered
  `[owner]` and `[arch]` `T` entries, more than ten. Not a changed criterion: AS7 reads "reads every item". Until G7's
  30-day expiry the whole count is said beside the alarm's, both numbers (at Nov 19: one unanswered entry, T11, where the
  old count was seven; 73 items, 49 of them unanswered).
- **"Allow the narrow exemption"**: `tend:log` takes `"expectations": "none: <why>"` for a build with nothing a person
  sees. The owner's words named a build whose "area is not an app feature"; `area-states` is listed under the `arch`
  feature, so the key is the faithful form of the same intent: every slice the range grew has a spec whose `Verdict:` is
  `no surface`. The reason is required and printed in the run log's line; a build with any other verdict, and every
  sweep, is held to its lines as before (0236).

## Consequences
- `scripts/tend.js` computes every swept area's state (`node scripts/tend.js state`), the balance reads the computed
  states, and `tend:log` writes a sweep's state and refuses another.
- Replayed over the run log of Nov 11-19 (`scripts/fixtures/tend-replay-1119`, main's documents verbatim at `42d3ccd8`),
  walk-screen reads `settling`, its reason naming T42-T45, T48 and the compiler skips, and the balance does not read
  "outgrowing its base".
- `next` takes decision 0229's resets first, then the evolve, then the computed states: the order `/tend`'s argument
  table and the script's comment already gave, weighed by the loop (the diff review's 7) and standing until the owner
  says otherwise.
- The diff review (Nov 21) made the reading more careful, never wider: a sweep's shipped numbers count against its
  highs and mediums only when its line can show they were them (else nothing is taken off and the area is never
  polished); a waiting medium is taken off only when filed at or after the latest sweep; an item's area is its
  section's `/tend <area>` before a citation; only the Vision block's verdict exempts a build; main's STATUS and
  ledger must read. Recording which shipped numbers were above low would be a new field of the run log: the owner's,
  filed in DEFERRED.
- G7 (the review budget, rotation, the answer log, expiry, the lease, numbers at publish) is untouched.
