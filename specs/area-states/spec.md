<!-- Repo first: from the owner's proposal G6 (docs/STATUS.md, "Next evolutions"; filed by /investigate 2026-11-19), answered yes
     in person 2026-11-20 ("Allow a run to build G6 only"; /tend inbox G6 yes), with the session's rule that runs never change
     /tend, its scripts or its skills widened for G6 alone. Decision 0235; brief docs/research/tend-process-review.md. An
     engineering slice of the tending loop, not a tab of the concept doc. -->

# Area states: an area leaves rough when what is open allows it, and the balance acts both ways (AS)

Nov 21, 2026 · @Miguel Guerrero

In 66 runs (Nov 11-19) no area ever left `rough`: the state recorded what a sweep *found*, and a reviewer always finds a
medium; the one whole sweep (walk-screen, Nov 19) shipped all seven of its mediums and stayed rough. The balance has read
"outgrowing its base" since Nov 12 and its only effect is to stop the loop's own proposals, while slices grew every day;
every first sweep of new ground raised the alarm; on a shallow clone `balance` and `next` answer wrongly; the inbox the
script counts is a fraction of what waits on the owner (`docs/research/tend-process-review.md`, F1-F3, S1). Decision
0235 settles the rules. This slice makes `scripts/tend.js` compute them, and the skills say the same.

## Vision

```
Idea: an area's state is what is left open, with a three-sweep backstop; the balance reads shares and acts both ways; the whole inbox is read (G6; the owner's /investigate, 2026-11-19; decision 0235)
Verb: none (the loop's own bookkeeping: nothing a walker sees changes; none of it is shown in the app, decision 0020)
Touches: none
Verdict: no surface
Shape: as asked
Criteria: none
Open: none (G6 answered yes in person, 2026-11-20)
```

## Criteria

G6's nine, in its words, numbered with the slice's prefix; "Done when" is AS8's replay.

1. **AS1 · The state is computed from what is open.** `scripts/tend.js` computes an area's state after a run from what
   is open: an open high or medium (not shipped, deferred by review, or a `[loop]` item in `docs/DEFERRED.md`) is
   `rough`; only lows open, or the area's `[owner]` or `[arch]` entries waiting, is `settling`; a whole sweep leaving
   nothing above low open, with a journey per screen, is `polished`. A decision 0229 reset still makes it `rough`. The
   run writes the script's state, never its own judgement.
2. **AS2 · The backstop.** Three whole sweeps of an area with no reset between them make it `settling` at least, its
   lows going to `docs/DEFERRED.md` instead of being found again.
3. **AS3 · Shares, and unseen apart.** The balance reads rough as a share of swept areas and shows never-swept areas
   apart as "unseen"; a first sweep no longer raises the alarm by itself.
4. **AS4 · Growth's actuator.** Fourteen days with no loop-filed `G` while an area is `settling` or `polished`: the
   reading says so and the next run is `evolve` for that area.
5. **AS5 · Refinement's actuator.** `/slice` step 1 says "lands on a rough base" with the area's open medium and high
   items, and the slice's record says whether it left the area no rougher; a warning, never a block.
6. **AS6 · No answer from a short history.** `balance` and `next` exit non-zero, saying why, when the window's commits
   are missing (a shallow clone), instead of a wrong reading.
7. **AS7 · The whole inbox is read.** The balance reads every item under "Needs the owner", not only `T` and `G`
   entries.
8. **AS8 · Tested, and replayed.** Tests for each, the run log of Nov 11-19 replayed as a fixture: replayed, the script
   reads walk-screen as `settling` after its whole sweep (all seven mediums shipped), and the balance reads other than
   "outgrowing its base" (G6's "Done when").
9. **AS9 · The skills say the same.** `tend/SKILL.md` sections 0, 8 and 9, and the orchestrator's stop rule, say the
   same.

States the criteria imply (slice step 2):

- **AS1b · Nothing to read is said.** An area the run log has never seen swept reads `unseen`, never `rough`; an area
  the ledger holds as `resting` stays resting until a reset.
- **AS6b · A sha that does not resolve on a whole history** (the ledger's presence `main`, 39 characters) is named,
  and the area is read from its window as before; only a shallow history refuses.

## Decisions

- **The G6 entry** (the owner's yes, in person, 2026-11-20): its nine criteria, above as AS1-AS9, and decision 0235's
  rules and starting numbers (three sweeps, 14 days).
- **Built beside decision 0236** (the entry's "Build beside"): the compass stays `tend.js compass`'s; the shares read
  beside it, never a second copy. AS1 reads the run log's `found`, `shipped`, `lenses` and `expectations`, and AS4 its
  `filed` and `compass`: no new field of the run log.
- **The calls this plan makes for the steward to rule on** are in `plan.md`, "Judgement calls", J1-J8.

## How adjacent apps do it

The loop's own process; the precedent is how quality budgets and done-enough rules work elsewhere
(`docs/research/agentic-process-framework.md`, 1.2 and 2.4-2.5, whose sources are unverified there).

- **Google SRE (error budget policy)**: a service's state is judged by what is open against its budget, not by what a
  review found; while the budget is spent, feature releases stop until it recovers, and tiered variants warn at 50% and
  75%. Source: from memory, unverified (`docs/research/agentic-process-framework.md`, SRE1). **Unverified**.
- **Shape Up (Basecamp)**: an appetite caps a pass; a cool-down takes the small fixes; ideas not bet on are not kept as a
  backlog. Source: https://basecamp.com/shapeup (`docs/research/agentic-process-framework.md`, SU1; host blocked, from
  summaries). **Unverified**.
- **Linear (zero-bug policy)**: open high-priority bugs are fixed within a set time, and stale issues are closed by
  themselves, so the open list stays what is really open. Source: from memory, unverified
  (`docs/research/agentic-process-framework.md`, L1). **Unverified**.

Where this departs: no budget stops the owner's work (decision 0235: "a warning, never a block", AS5), and no state is
ever shown in the app.

## Tests

Unit (`src/lib/__tests__/arch/areaStates.test.ts`): AS1-AS7 on made-up inputs to the pure functions; AS8 replays the
fixture `src/lib/__tests__/arch/areaStates.replay-1119.json` (main's run log, DEFERRED and "Needs the owner" at
`42d3ccd8`, the Nov 19 walk-screen record, with the resets and journeys the script read from git there); AS9 reads the
three skills.

## Record

To come.
