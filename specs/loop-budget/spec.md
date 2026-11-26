<!-- Repo first: from the owner's proposal G7 (docs/STATUS.md, "Next evolutions"; filed by /investigate 2026-11-19),
     answered yes on Nov 22 ("Yes, queue it (Recommended)"); on 2026-11-25 the owner set the order G14, G12, G13, G7,
     G8, G5 and said G7's and G8's slice commits may edit /tend's own scripts and skills, having approved them as
     slices; on 2026-11-26 "Run G7 next". Decision 0235; brief docs/research/tend-process-review.md. An engineering
     slice of the tending loop, not a tab of the concept doc. -->

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

States the criteria imply (slice step 2):

- **LB1b · Revert-aware, and counted once.** A commit the range reverts counts on neither side, nor does its revert;
  a finding two commits name (a fix, then its trap line) counts once.
- **LB2b · Rotation skips what rests.** A `resting` area is not rotated onto; a due evolve (0235) is answered on either
  turn before the turn's own sweep pick.
- **LB3b · An older line reads as it was.** Only a line this script wrote carries the answer log's marker, and only
  such a line is held to `by` and `pick`; the 98 lines on main read as they are.
- **LB5b · What cannot age is said apart.** An item with no date is listed as undated and never expires; a `[phone]`
  item waits for a device, not an answer, and is not aged.
- **LB6b · A lease ends.** A lease holds nothing 24 h after its start, holds nothing against the session that took it,
  and never refuses the owner's own commit (no agent trailer).

## Decisions

- **The G7 entry** (the owner's yes, Nov 22; the order and the widened grant, 2026-11-25; "Run G7 next", 2026-11-26):
  its eight criteria, above as LB1-LB8, and decision 0235's starting numbers (one review fix per fix, 14 and 30 days,
  24 h), tuned from the run log by the owner, never by a run.
- **Built beside decision 0236** (the entry's "Build beside"): `by` takes 0236's words, `owner` or `proxy`, and the
  proxy's yes is recorded as 0157 says ("the proxy's yes under the owner's delegation"); LB1 reads commits as `commits
  --loop-only` does (a loop commit by its subject; the record gate's agent commits by their trailers) and reverts by
  their `This reverts commit <sha>.` lines, as the record gate does.
- **Defaults this plan takes, each the owner's to overrule** (the plan's judgement calls J1-J7, ruled on by the steward):
  each area's verb (the plan's table); the alternation read from the run log alone; the budget counted by findings
  named, per area; the regression named by a `Regression: <sha>` line; the lease keyed on the session's
  `Claude-Session:` id; the expired item's bullet and its section.

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
  checked at publish.
- **Named since the entry was filed:** `check:tend` is `node scripts/tend.js commits`, which CI runs as `commits
  --loop-only` on every push with the push's base's scripts (decisions 0133, 0156); "the orchestrator" is
  `/tend-orchestrator` (`.claude/skills/tend-orchestrator/SKILL.md`, its run brief `briefs.md` beside it, decision 0157);
  the whole inbox is read by `readInbox` since G6 (AS7).
