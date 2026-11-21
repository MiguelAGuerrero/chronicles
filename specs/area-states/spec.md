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
- **AS1c · What waits is not open** (the owner's answer, J9): a medium the loop may not fix, filed to the owner, reads
  as waiting (`settling`, named in the reason), as an entry does.
- **AS6b · A sha that does not resolve on a whole history** (the ledger's presence `main`, 39 characters) is named,
  and the area is read from its window as before; only a shallow history refuses.

## Decisions

- **The G6 entry** (the owner's yes, in person, 2026-11-20): its nine criteria, above as AS1-AS9, and decision 0235's
  rules and starting numbers (three sweeps, 14 days).
- **Built beside decision 0236** (the entry's "Build beside"): the compass stays `tend.js compass`'s; the shares read
  beside it, never a second copy. AS1 reads the run log's `found`, `shipped`, `lenses` and `expectations`, and AS4 its
  `filed` and `compass`: no new field of the run log.
- **The owner's answers in person, 2026-11-21** (to the steward's plan review; decision 0250, amending 0235 and 0236):
  - "Waits on you: settling" (J9): a medium whose fix lies outside what the loop may edit and that is filed to the
    owner ("Open before the loop", a `T` entry or `[arch]`), or a DEFERRED `[loop]` item whose fix the loop may not make,
    reads as waiting: its area is `settling` at worst for it, and the state's reason names it (AS1c).
  - "Take the proposed value" (J3): outgrowing when more than half of the areas swept twice or more are rough and more
    than three of them are; an area's first sweep counts in the share only from its second. **`ROUGH_SHARE` = 0.5**
    beside **`LIMITS.rough` = 3** in `scripts/tend.js`, committed before the replay was computed; the owner's starting
    value, tuned from the run log, never by a run.
  - "Read and print all; alarm on T only" (J4): AS7 as written. The balance prints every item, counted by section, and
    the alarm stays on unanswered `[owner]` and `[arch]` `T` entries, more than ten. Both numbers are printed: at Nov 19
    the alarm counts one (T11), where the old count, every `T` entry but a phone's, was seven; the whole inbox holds 73
    items ("Last tend" apart), most of them unanswered.
  - "Allow the narrow exemption" (J7): `tend:log` takes `"expectations": "none: <why>"` for a build every one of whose
    grown slices has a spec reading `Verdict: no surface`; the reason is required and kept in the line; a build with any
    other verdict, and every sweep, logs its lines as before.
- **The plan review** (the steward, Nov 21; twelve findings, all accepted before any code, the orchestrator's rulings;
  each test named `area-states audit N` by the steward's number): audit 1, 2 the waiting medium and AS8's reason (T42-T45,
  T48 and the compiler skips); 3 an unrated item attributed to an area keeps it from `polished`, a fix the loop may not
  make waits, the unattributed are printed apart; 4 no "failed line" blocker (a failed line is a finding, counted by its
  severity, 0236); 5 the share's line one named constant, printed beside the shares, first sweeps listed by state; 6
  both inbox numbers printed; 7 section 8 names the fourteen-day evolve, and only the run log's `filed.G` is the loop's;
  8 a partial sweep neither counts nor breaks the backstop; 9 the shallow refusal names the date to fetch from; 10 the
  tests in `arch/tend.test.ts` and the fixture under `scripts/`, both outside what a loop commit may touch; 11 the
  fixture's documents verbatim, their blobs checked, git's facts recorded with their shas; 12 the exemption keyed on the
  spec's verdict; 13 the argument table says what a run does when `next` answers `evolve <area>`.

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

Unit (`src/lib/__tests__/arch/tend.test.ts`, beside the loop's other tests, which a loop commit may not touch): AS1-AS7 and
audits 1-13 on made-up inputs to the pure functions; AS8 and audits 2, 6 and 11 replay the fixture
`scripts/fixtures/tend-replay-1119/` (main's run log, ledger, STATUS and DEFERRED verbatim at `42d3ccd8`, the Nov 19
walk-screen record, their git blobs checked, and `git.json`, the resets, uncovered screens and slices git gave there, read
by `scripts/tend.js` as it stood at `65b9e24f`); AS9 and audits 7, 9 and 13 read the skills.

## Record

Built 2026-11-21 under `/tend inbox G6 yes` on `tend/inbox-20261121-0137`, from `origin/main` 65b9e24f.

- **Passed:** AS1-AS9, AS1b, AS1c, AS6b and area-states audit 1-13 (`arch/tend.test.ts`), each seen failing as a todo
  first (`check:test-first area-states`: 9 of 9) and its wiring reverted once to see it fail; typecheck, lint, `npm
  test`, `check:docs`. No journey covers `scripts/tend.js`; no screen changed.
- **The replay** (AS8, G6's "Done when"): over the run log of Nov 11-19 and main's documents at `42d3ccd8`, walk-screen
  reads `settling` ("waits on the owner: entries T42, T43, T44, T45, T48; Open before the loop: … "The walk screen's React
  Compiler skips, and who takes their lines out" (medium) …"), the areas read rough captures, explore, replay and tabs,
  settling the other six, unseen twenty-six; three of the seven areas swept twice or more are rough; the alarm counts
  one unanswered entry (T11; the old count seven), the whole inbox 73 items; the reading is **in step**, not
  "outgrowing its base". `node scripts/tend.js state --at 42d3ccd8` reads the same from git.
- **On main today** (65b9e24f): rough captures, explore, map, replay, tabs and walk-screen (each by a 0229 reset since its
  sweep), settling chronicle, deletion, navigation and presence; five of the eight areas swept twice or more are rough,
  so the balance reads "outgrowing its base" by the share, as it should.
- **The base it landed on** (AS5): `node scripts/tend.js base --spec area-states` names `arch`, which no sweep reads
  (the loop's own process): no area of the app was made rougher; nothing in the app changed.
- **The diff review** (the auditor, Nov 21, one round; 2 high, 3 medium, 9 low): accepted 8, fixed behind their tests
  as area-states audit 14 (a logged "none: <why>" line reads clean in the run log's test; `tend:log` end to end), 15
  (shipped numbers count against highs and mediums only when the line can show it; else never polished), 16 (a waiting
  medium taken off only when filed at or after the sweep), 17 (an item's area by its heading first, citations skipped,
  severity by its last word on it, a cited path no fix), 18 (`base --here`), 20 (`next`: resets, then the evolve), 23
  (only the Vision block's verdict exempts), 27 (main's STATUS and ledger must read); with them the tests that could not
  fail were made to (AS5 reads `base`'s printed reading; the two tests of `areasByState` hold `areaState`). Deferred 6
  as `[loop]` lows (audit 19, 21, 22, 24, 25, 26); rejected 0; one `[owner]` item filed (which shipped numbers were above
  low, a new field of the run log). Replayed again after the fixes, walk-screen still reads settling for the same
  reasons, and the balance in step.
- **Deferred:** G7's half of decision 0235; attributing DEFERRED's unattributed and unrated items (printed by the
  balance, a triage's job).
