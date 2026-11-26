<!-- Repo first: from the owner's proposal G7 (docs/STATUS.md, "Next evolutions"; filed by /investigate 2026-11-19),
     answered yes on Nov 22 ("Yes, queue it (Recommended)"). The authority to edit /tend's own scripts and skills is the
     entry the owner said yes to: its Cost line names them ("Cost: M; scripts/tend.js, scripts/records.js,
     scripts/bookkeeping.js, four skill files"); beside it, on 2026-11-25 the owner set the order G14, G12, G13, G7, G8,
     G5, and on 2026-11-26 "Run G7 next". Decisions 0235 and 0269; brief docs/research/tend-process-review.md. An
     engineering slice of the tending loop, not a tab of the concept doc. -->

# Loop budget: a budget for review, rotation onto unseen areas, an answer log, and no racing (LB)

Nov 26, 2026 · @Miguel Guerrero

Decision 0235's second half. In 66 runs review fixes outnumbered the fixes they reviewed (174 against 110); `next`
sent sweeps back to the hottest areas while 26 of 36 were never swept; the owner took the recommended option almost
always and nothing recorded who answered or which option; the inbox kept every item for good; two sessions edited
process files and took decision numbers at once (`docs/research/tend-process-review.md`, F4, F5, F6, F8, S2). G6
(`specs/area-states`, decision 0250) made the states and the balance; this slice makes `scripts/tend.js` and
`scripts/records.js` hold the rest, and the skills say the same.

## Vision

```
Idea: review has a budget; sweeps rotate onto unseen ground; every answer is logged with who gave it and which option; the inbox ages and expires; a lease on process files (G7; the owner's /investigate, 2026-11-19; decision 0235)
Verb: none (the loop's own bookkeeping: nothing a walker sees changes; none of it is shown in the app, decision 0020)
Touches: none
Verdict: no surface
Shape: as asked
Criteria: none
Open: none (G7 answered yes, Nov 22; "Run G7 next", 2026-11-26)
```

## Criteria

G7's eight, in its words, numbered with the slice's prefix. "Done when" (a week of runs after it shows review fixes at
or under the runs' own fixes, at least two never-swept areas swept, every answer logged with who gave it) is read from
the run log after a week, not by this slice's tests.

1. **LB1 · Review has a budget.** `check:tend` fails a range whose `tend <area> audit N` commits outnumber its `tend
   <area> N` and `T<n>` commits, unless the extra commit's message names a regression the run caused; findings over the
   budget are filed with their severity.
2. **LB2 · Rotation.** `next` alternates: the most-reset area, then the never-swept or longest-unswept area, in VISION's
   verb order (Return, Honour, Earn), each area's verb in `scripts/features.js`.
3. **LB3 · The answer log.** Every `answers` item in the run log carries `by` (owner or proxy) and `pick` (recommended,
   other, reshape, no); `tend.js log` refuses one without them.
4. **LB4 · Take-up, read.** `balance` prints, over 30 days and by entry class, the owner's take-up of the recommended
   option and the proxy's yeses the owner has not confirmed; delegating stays the owner's call (0157).
5. **LB5 · The inbox ages.** `npm run records -- inbox age` lists items unanswered for 14 days, the orchestrator asks the
   four oldest first, and an item unanswered for 30 days moves to DEFERRED as `[owner]` with its words kept.
6. **LB6 · A lease on process files.** A session changing process files (skills, hooks, process scripts, AGENTS.md)
   holds a row in "In flight" naming them, for 24 h; another branch's commit to a held file is refused by a check, and
   the owner can clear a row.
7. **LB7 · Decision numbers at publish.** Decision numbers are taken at publish (`book:next-decision` in "Publish to
   main"), a provisional name until then.
8. **LB8 · Tested, and said the same.** Tests for each; `ship.md`, `tend/SKILL.md`, the orchestrator skill and
   `briefs.md` say the same.

States the criteria imply (slice step 2), with the plan review's and the owner's answers folded in:

- **LB1b · Revert-aware, counted once, per item.** A commit the range reverts counts on neither side, nor does its
  revert; a finding two commits name (a fix, then its trap line) counts once; a `T` build counts one fix per item it
  ships, each commit naming the entry that changes more than tests and journeys (0269).
- **LB1c · Highs are always fixed** (0269). A review fix whose message says `Severity: high` is outside the count; a run
  that files a high, or whose review accepted more than it fixed and filed with a severity, is refused by `tend:log`
  (loop-budget audit 1). A G slice's own review (`<slice> audit N`) is outside the budget (0269).
- **LB1d · A regression is the run's own** (loop-budget audit 11). `Regression: <sha> <what worked at the base>` names a
  commit of the range, of the same area, that is not itself a review fix; `tend:log` lists every regression claimed.
- **LB2b · Rotation skips what rests.** A `resting` area is not rotated onto; a due evolve (0235) is answered on either
  turn before the turn's own sweep pick. While any area is unswept, only an area's first sweep reads as a rotation
  (loop-budget audit 8). An area's verbs order sweeps only (0269).
- **LB3b · An older line reads as it was.** Only a line this script wrote carries the answer log's marker, and only
  such a line is held to `by` and `pick`; the 98 lines on main read as they are.
- **LB3c · Only the owner's words are the owner's** (loop-budget audits 2, 12). `by: owner` carries the owner's words,
  verbatim; the owner's keep of a proxy yes is logged `confirms: "<the proxy line's date>"` and counted apart from
  take-up; the proxy answers only `yes`, and never an `[arch]` or `[phone]` entry (0157).
- **LB4b · Counted once** (loop-budget audit 3). Each entry's latest answer per `by` is counted, so a yes logged by the
  run that noted it and again by the run that built it is one.
- **LB5b · What cannot age is said apart.** An item is dated by its own first date, else its section heading's
  (loop-budget audit 7); one with neither is listed as undated and never moves; a `[phone]` item waits for a device, not
  an answer, and is not aged; a word of an answer inside a struck-through sub-item does not answer the whole item
  (loop-budget audit 14).
- **LB5c · "Open before the loop" is listed, never moved** (0269, loop-budget audit 6): its items are listed with their
  age as waiting on the owner's hand, and an area's state reads the same before and after they age.
- **LB6b · A lease ends.** A lease holds nothing 24 h after its start, holds nothing against the session that took it,
  and never refuses the owner's own commit (no agent trailer). A lease row is removed by its holder, after it lapsed, or
  with the owner's words quoted in the reason (loop-budget audit 13).

## Decisions

- **The G7 entry** (the owner's yes, Nov 22; the order, 2026-11-25; "Run G7 next", 2026-11-26): its eight criteria,
  above as LB1-LB8, and decision 0235's starting numbers (one review fix per fix, 14 and 30 days, 24 h), tuned from the
  run log by the owner, never by a run.
- **Built beside decision 0236** (the entry's "Build beside"): `by` takes 0236's words, `owner` or `proxy`, and, as
  `expectations ratify --by owner --answer` does, an owner's answer carries the owner's words verbatim; the proxy's yes
  is recorded as 0157 says. LB1 reads commits as `commits --loop-only` does (a loop commit by its subject) and reverts by
  their `This reverts commit <sha>.` lines, as the record gate does.
- **The owner's answers in person, 2026-11-26** (to the steward's six Silent questions on the plan; decision 0269,
  amending 0235):
  - S1 "Listed, never moved (Recommended)": "Open before the loop" items are listed as waiting on the owner's hand with
    their age, never moved to DEFERRED, and never count toward an area reading finished (LB5c).
  - S2 "Highs always fixed (Recommended)": over the budget, highs are fixed whatever the budget (a high is never filed);
    then the rest in severity order; the remainder filed `[loop]` with their severity (LB1c).
  - S3 and S4 "Per item; sweeps and T only (Recommended)": a quick batch counts one fix per item it ships; the budget
    binds sweeps and T builds (`tend <area> audit N`); a G slice's own review (`<slice> audit N`) is outside it (LB1b,
    LB1c).
  - S5 "Sweep order only (Recommended)": the area-verb table orders sweeps only and is never a ruling a `Serves:` line
    may cite (said beside it in `scripts/features.js`); walk-screen and map keep the verbs already ruled.
  - S6 "Today's --check is enough (Recommended)": LB7 is met by decision 0174 (the Record); the five renumberings since
    Nov 19 are `--check` doing its job.
- **The plan review** (the steward, Nov 26; 2 high, 9 medium, 3 low; the orchestrator's rulings): accepted 13, settled
  by the owner 1 (finding 4, by S6), rejected 0; each test named `loop-budget audit N` by the steward's number: audit 1
  over-budget findings are filed (LB1c); 2 the owner's words behind `by: owner`, a keep logged as `confirms` (LB3c); 3
  latest answer per entry per `by` (LB4b); 5 `verbs`, an array, the first in VISION's order taken (LB2); 6 "Open before
  the loop" never moved (LB5c); 7 a heading's date (LB5b); 8 only a first sweep is a rotation while any area is unswept
  (LB2b); 9 the orchestrator's and the briefs' "medium and above are fixed" amended to the budget (LB8); 10 the edit
  grant cited from the entry's Cost line, and the brief's `Status:` line left to the owner ("Open before the loop":
  `docs/research/` is not this slice's to edit); 11 the regression is the run's own (LB1d); 12 no proxy answer on
  `[arch]` or `[phone]` (LB3c); 13 a lease cleared only with the owner's words, by its holder or after it lapsed (LB6b);
  14 a struck-through sub-item answers nothing (LB5b). The judgement calls: J1 reshaped (finding 5), J2 with finding 8,
  J3, J4 with finding 11, J5 reshaped (finding 2), J6 with the lease's Branch cell filled, J7 except "Open before the
  loop" (finding 6).

## How adjacent apps do it

The loop's own process; the precedent is how review budgets, rotation, triage logs and leases work elsewhere
(`docs/research/agentic-process-framework.md`, 2.4 and 2.7, whose sources are unverified there).

- **Shape Up (Basecamp)**: a pitch not bet on in a cycle lapses rather than waiting in a backlog; an appetite caps the
  work a pass may take. Source: https://basecamp.com/shapeup (`docs/research/agentic-process-framework.md`, SU1; host
  blocked, from summaries). **Unverified**.
- **Linear (triage)**: new issues land in a Triage inbox that a rotating owner clears; issues left untouched are
  auto-closed after a set time, with a note saying so. Source: from memory, unverified
  (`docs/research/agentic-process-framework.md`, L1). **Unverified**.
- **Git LFS (file locking)**: `git lfs lock <path>` records who holds a file on the server; a push that changes a file
  someone else holds is refused, and an administrator can `unlock --force`. Source: from memory, unverified (not yet
  recorded in `docs/research/adjacent-apps.md`, which covers the app's own jobs). **Unverified**.

Where this departs: the budget files what it does not fix rather than dropping it (the area stays rough, so the next
sweep takes it first, 0235); an expired item is kept in DEFERRED with its words, never closed; a lease lapses by itself
after 24 h, so no one waits on a dead session.

## Tests

Unit (`src/lib/__tests__/arch/tend.test.ts` for LB1-LB4, LB6 and LB8; `src/lib/__tests__/arch/records.test.ts` for LB5's
command; `src/lib/__tests__/arch/features.test.ts` for LB2's verbs), on made-up inputs to the pure functions and on a
scratch git repository for the wiring (`check:tend` over a range, `tend:log` refusing, `next` on a made-up run log).
LB7 is met by what is on main (Record). No journey: no screen changes.

## Record

Built 2026-11-26 under `/tend inbox G7 yes` on `tend/inbox-20261126-0545`, from `origin/main` 428ff3ce.

- **Already met, not rebuilt:** LB7. Decision 0174 made `book:next-decision` the one way to take a number, and
  `.claude/skills/ship.md`, "Publish to main", step 2, runs `npm run book:next-decision -- --check <NNNN> <file>`
  after the last fetch, renumbering the file, its title, the README row and what cites it when `main` took the number;
  `slice` step 7 and `/tend` section 10.3 say the same. The provisional name is the number `next-decision` gave,
  checked at publish; the five renumberings since Nov 19 (`02f41ed3`, `c44b73dd`, `54118337`, `cf23a321`,
  `41a3438d`) are `--check` doing its job (the owner, S6, decision 0269).
- **Named since the entry was filed:** `check:tend` is `node scripts/tend.js commits`, which CI runs as `commits
  --loop-only` on every push with the push's base's scripts (decisions 0133, 0156); "the orchestrator" is
  `/tend-orchestrator` (`.claude/skills/tend-orchestrator/SKILL.md`, its run brief `briefs.md` beside it, decision 0157);
  the whole inbox is read by `readInbox` since G6 (AS7).
- **Passed:** LB1-LB6, LB8 and loop-budget audit 1-3, 5-14 (`arch/tend.test.ts`, `arch/records.test.ts`,
  `arch/features.test.ts`), each a todo first (`check:test-first loop-budget`: 7 of 8, LB7 recorded in `UNTESTED`) and
  each wiring undone once to see its test fail (the budget and the lease in `commits`, the marker, the review's and the
  keep's checks and the class in `tend:log`, the take-up in `balance`, `next`'s pick, `inbox age`'s dispatch). Three
  existing tests' inputs follow the new rules (their `tend:log` runs ship no review; area-states audit 14's answer
  carries `by`, `pick` and `words`; tend 0229 reads `next(argv)`). No journey covers the files; no screen changed.
- **On main today** (428ff3ce, read by this branch's scripts): `next` turns from `walk-screen` to `gallery` (the
  rotation turn: map's sweep of Nov 20 was no rotation, and 28 areas are unswept); `balance` adds `answers` (every one of
  the 70 answers in the window logged before the marker); `inbox age` lists 7 items waiting 14 days, none to move, 14 of
  "Open before the loop" on the owner's hand, 4 undated.
- **The base it landed on:** `base --here --spec loop-budget` names `arch`, which no sweep reads: no area of the app was
  made rougher; nothing in the app changed.
- **Left to the owner:** the brief's `Status:` line ("Open before the loop", audit 10). Not reached by a criterion: the
  run log's `auditFixes` still lists a number twice when a fix and its trap line both name it (the budget counts it
  once).

