# Loop budget: the plan (LB1-LB8)

Built under `/tend inbox G7 yes` (`/slice loop-budget --from=G7`): read by the steward, not held for the owner. No
screen, no stored field of the app, no dependency, no native code. Nothing here is shown in the app (decision 0020).

**The base it lands on** (slice step 1.5): `node scripts/tend.js base --spec loop-budget` names `arch`, which no sweep
reads: no area of the app is touched.

## Files

| File | What changes |
|---|---|
| `scripts/tend.js` | LB1 `reviewBudget` (pure) and its wiring in `commits`; LB2 `lastWasRotation`, `rotationArea` (pure) and `next`; LB3 the answer log's marker, `logProblems`, `runLine`, `appendLog` (each answer's class); LB4 `answerTakeUp` (pure) and `balance`; LB5 `inboxAge` (pure, beside `readInbox` and `dateOf`); LB6 `leaseRows`, `leaseProblems` (pure) and their wiring in `commits` |
| `scripts/records.js` | LB5 `inbox age` (a read, never an operation: no sidecar, no trailer) and its `--write <dir>` |
| `scripts/features.js` | LB2 a `verb` on every feature but `arch`, and `VERBS` (Return, Honour, Earn) |
| `src/lib/__tests__/arch/tend.test.ts` | LB1-LB4, LB6, LB8 and the implied states |
| `src/lib/__tests__/arch/records.test.ts` | LB5's command |
| `src/lib/__tests__/arch/features.test.ts` | LB2: every feature but `arch` has one of the three verbs |
| `.claude/skills/tend/SKILL.md`, `.claude/skills/ship.md`, `.claude/skills/tend-orchestrator/SKILL.md`, `.claude/skills/tend-orchestrator/briefs.md` | LB8 (below) |
| `docs/decisions/0269-…` | the owner's answers to the plan review |

Three source files under `scripts/`, no `src/` file. `tend/SKILL.md` is at 498 of its 500 lines: the new words go into
the lines that hold the rules they amend, not new paragraphs.

## What each criterion builds (after the plan review and decision 0269)

**LB1, the budget** (`reviewBudget(commits)`, pure; `commits` holds every range problem it returns, in both modes, so CI
reads it on every push with the base's scripts once this is on `main`). Over the range's loop commits (subject `tend `,
as `--loop-only` reads them) and their reverts, per area (the subject's second word):

- *fixes* = the distinct numbers `findingsOf` reads as shipped, plus, for each `T<n>` it reads as built, one per commit
  naming it that changes more than tests and journeys (an item it ships, 0269);
- *review fixes* = the distinct numbers it reads as `audit`, less those a commit says are high (`Severity: high`, 0269)
  and those a commit names as the run's own regression (`Regression: <sha> <what worked at the base>`, `<sha>` a commit
  of the range of the same area that is no review fix; audit 11);
- a commit the range reverts (by its `This reverts commit <sha>.` lines) is left out of both, and so is the revert;
- review fixes greater than fixes: one problem for the area, naming both lists and the fix ("fix highs and the run's own
  regressions whatever the budget; file the rest `[loop]` with their severity").

**`tend:log` holds the other half** (audit 1, 0269): on a sweep or a `T` build with a `review`, `review.accepted` may not
exceed the distinct audit numbers the range ships plus the `[loop]` items the run adds to `docs/DEFERRED.md` (each item
whose first line the base lacks); each added `[loop]` item names its severity, and none is a high. The line gets
`regressions` (each `{ audit, sha }` claimed), the script's to write.

**LB2, rotation** (`next`). Each feature in `scripts/features.js` has `verbs` (audit 5), ordering sweeps only and never
a ruling a `Serves:` line may cite (0269, said in a comment there). An area's rank is its first verb in VISION's order,
Return, then Honour, then Earn.

- `lastWasRotation(runs, areas)`: the latest sweep was a rotation when it was its area's first; otherwise, only when
  every area had been swept before it, when its previous sweep was the oldest latest-sweep then (ties count; audit 8).
  No sweep at all: a rotation.
- **After a rotation, the reset turn:** `next` as it is today (decision 0229's resets, then 0235's evolve, then the
  computed rough, then settling).
- **After any other sweep, the rotation turn:** a due evolve first (LB2b), else `rotationArea`: the never-swept areas by
  rank then name; when none, the area whose latest sweep is oldest, ties by rank then name; `resting` areas skipped.
- stdout stays the one area (the skills read it); the reason goes to stderr.

On today's `main` the latest sweep (map, Nov 20) was not its first and 28 areas are unswept, so `next` turns from
`walk-screen` (its resets) to the first never-swept Return area by name, `gallery`.

**LB3, the answer log.** `runLine` stamps `answerLog: "0235"` (the script's, like `date` and `lens`). A line with the
marker holds each answer to `{ entry, answer, by, pick }` (audits 2, 12):

- `by` `owner` or `proxy`; `pick` `recommended`, `other`, `reshape` or `no`, agreeing with `answer` (`yes` with
  `recommended` or `other`, `no` with `no`, `reshape` with `reshape`);
- `by: owner` carries `words`, the owner's words verbatim, one line, not empty;
- the proxy answers only `yes`, and never an entry of class `T [arch]` or `T [phone]` (0157);
- `confirms: "<YYYY-MM-DD>"` marks the owner's keep of a proxy yes: `by: owner`, `answer: yes`, and `tend:log` refuses it
  unless a line of that date holds an answer for the entry.

`appendLog` adds each answer's `class` from the base's `docs/STATUS.md` (`T [owner]`, `T [arch]`, `T [phone]` by the
entry's tag, `G`, else the bare letter) before the line is checked.

**LB4, take-up** (`answerTakeUp(runs, today, 30)`, pure; `balance` prints it as `answers`): each entry's latest answer
per `by` in the window (audit 3); per class, the owner's answers and their picks (a `confirms` apart, never take-up);
the proxy's yeses, and those with no later `confirms` (or other owner's answer) for the entry; the answers in the window
logged before the marker, as `unlogged`. Nothing acts on it (0157).

**LB5, the inbox ages** (`inboxAge(status, today)`, pure, read by `records.js`). Every item `readInbox` reads, dated by
its first date, else its section heading's (audit 7), unanswered by `ANSWERED` read outside struck-through text (audit
14; `readInbox` itself is unchanged, so the balance reads as before):

- `wait` (14 days or more) oldest first, `move` (30 or more), but "Open before the loop" items go to `hand`, waiting on
  the owner's hand, with their age, never moved (0269, audit 6);
- `undated` and `phone` apart.

`npm run records -- inbox age [--main] [--json]` prints it (`--main`: `origin/main`'s STATUS); it is a read, never an
operation. `--write <dir>` writes, for each item to move, its DEFERRED bullet (`- [owner] ` and the item's text, every
line kept, then `Moved from the inbox ("<section>") on <today>, unanswered since <date> (decision 0235).`) and prints the
two operations that move it (its `inbox remove <id>` or `section item remove "<section>" "<match>"`, `--reason
"unanswered for 30 days (decision 0235)"`, and `deferred item add "From the inbox, unanswered for 30 days" --file
<dir>/<n>.md`, `--new` the first time). Nothing moves today: the oldest dated question is from Nov 11.

**LB6, the lease.** A lease is an "In flight" row whose Session cell starts `Lease:`, its Branch cell the holder's branch,
its Doing cell the held files in backticks, `from <YYYY-MM-DDTHH:MMZ>` and `session <id>` (the `session_…` of the
holder's `Claude-Session:` trailer). `leaseRows(status)` reads them; `leaseProblems({ files, date, session, rows })`
refuses an agent commit that changes a held process file while the lease is live (`from` ≤ the commit's date < `from` +
24 h) unless the commit carries the holder's session. `commits` (both modes) reads the leases at each agent commit's
parent for the commits that touch a process file (`.claude/skills/**` but the ledger and the run log, `.claude/hooks/**`,
`.claude/agents/**`, `AGENTS.md`, `CLAUDE.md`, `.github/**`, `scripts/{tend,records,bookkeeping,expectations}.js`), and
refuses an agent commit that removes a lease row unless it carries the holder's session, the lease has lapsed at its
date, or its message quotes the owner's words (`the owner … "…"`; audit 13). The owner's own commits are never read. The
holder publishes its row alone (`npm run records -- inflight add`, a records-only commit pushed to `main` as it opens) and
removes it in its last record commit.

**LB7**: met (the spec's Record, 0269); nothing built.

**LB8, the skills say the same.**

- `tend/SKILL.md`: the table's first row (`next` alternates); section 10.1 (`answers` carry `by`, `pick`, the owner's
  `words`), 10.2 (the budget, highs and the run's own regressions outside it, the rest filed `[loop]` with their
  severity; amends 0181's "medium and above"), and section 7 (`inbox age` at an inbox run's close: what waited 30 days
  moves; "Open before the loop" is listed).
- `ship.md`: "The faster lane"'s fixes line (the budget); "Open the worktree" (the lease for process files); "Publish to
  main" unchanged (LB7).
- `tend-orchestrator/SKILL.md`: section 2.2 (`inbox age`, the four oldest asked first); section 5's "Medium and above are
  fixed in the run" amended to the budget (audit 9); section 9 (each proxy yes the owner keeps is logged by the next run
  as `confirms`, with the owner's words).
- `briefs.md`: the run brief's answer line names `by`, `pick` and the owner's words; its "medium and above are fixed"
  amended to the budget (audit 9); the non-loop run takes a lease for process files.

The brief's `Status:` line (`docs/research/tend-process-review.md`) is not this slice's to edit (audit 10): it goes to
"Open before the loop".

## Tests (one per criterion, each a todo first)

| Id | Test (`arch/`) | Seen failing because |
|---|---|---|
| LB1 | `tend.test.ts` `LB1: …`: `reviewBudget` over made-up ranges (under, over, a regression line, a revert); `commits` on a scratch repository refuses a range over budget | no `reviewBudget` |
| LB2 | `tend.test.ts` `LB2: …`: `lastWasRotation`, `rotationArea` by verb; `features.test.ts`: every feature but `arch` has a verb | no functions, no verbs |
| LB3 | `tend.test.ts` `LB3: …`: `logProblems` on a marked line without `by`/`pick`, with a proxy no; `tend:log` refuses one | the marker is not read |
| LB4 | `tend.test.ts` `LB4: …`: `answerTakeUp` on made-up lines (take-up by class, an unconfirmed proxy yes, unlogged) | no function |
| LB5 | `records.test.ts` `LB5: …`: `inbox age` lists 14 days, marks 30, writes the bullet with every line kept and prints the two operations; undated and phone apart; no sidecar written | no command |
| LB6 | `tend.test.ts` `LB6: …`: `leaseRows`, `leaseProblems` (live, lapsed, the holder, a file not held); `commits` on a scratch repository refuses another session's commit | no lease read |
| audits 1-3, 5-14 | `tend.test.ts` and `records.test.ts`, `loop-budget audit N: …`, each the steward's failing input | the rule is not there |
| LB8 | `tend.test.ts` `LB8: …`: the four skill files name `Regression:`, `inbox age`, `by` and `pick`, the rotation and the lease | the words are not there |

Each test's wiring is reverted once after it passes, to see it fail.

**The testing's size** (`docs/TESTING.md`, decision 0223): small. No journey covers `scripts/tend.js`, `scripts/records.js`
or the skills; `launch` once at the end as the smoke. `npm test` whole at step 9.

**Cost.** `commits` reads one more `git show` per agent commit that touches a process file (a handful per push);
`next` and `balance` read the run log they already read (about a hundred lines, growing by a few a day); `inbox age`
reads one document. No harness: none of it is per frame or per fix.

**Native**: none. **Deferred**: none planned.

## Judgement calls (ruled by the steward, Nov 26: J1 reshaped by audit 5 and 0269, J2 with audit 8, J3 accepted, J4 with audit 11, J5 reshaped by audit 2, J6 with the Branch cell, J7 but "Open before the loop"; kept as written for the record)

- **J1. Each area's verb.** VISION's table puts Earn on Explore and Navigate, Honour on capture and the walk, Return on
  Chronicle, the replay, revisit and recall. The infrastructure areas take the verb of what they keep:

  | Verb | Areas |
  |---|---|
  | Return | replay, moments, chronicle, resurface, reactions, journal, gallery, threads, deletion, memories, tabs |
  | Honour | storage, backup, recording, rides, gaps, walk-screen, places, captures, transcript, notes, motion, web |
  | Earn | streets, navigation, presence, complexes, explore, kind-walk, walk-planner, roads, outing, fixtures, layers, walkability, landing, map, notify |

  Open to the steward: `tabs` (the launch opens on Chronicle, "Chronicle first", 0209) and `walk-screen` (Navigate's
  screen, but its job is the walk and its capture stack) are the two that could go either way; `web` and `motion` take
  Honour as the walk's own feel.
- **J2. The alternation from the run log alone.** No new field: a sweep is read as a rotation by what the log already
  says (its area's first sweep, or its oldest). A sweep the owner named (`/tend <area>`) is read the same way.
- **J3. Counted by findings, per area.** "Commits" in LB1 read as the findings they name (one commit per finding is
  section 4's rule), so a commit naming several cannot hide review fixes, and a run of one area is judged on that area.
- **J4. The regression named.** `Regression: <sha>` of a commit of the range: the run's own regression is the one it
  can name. A regression of something already on `main` is a finding of its own (`tend <area> N`), not a review fix.
- **J5. Confirming a proxy yes.** An answer `by: owner` for the same entry in a later line confirms it; the
  orchestrator's closing keep-or-revert list (0157) reaches the log through the next run's brief.
- **J6. The lease by session.** The commit carries its session's `Claude-Session:` trailer, never its branch, so the
  lease names the session. Two runs of one orchestrator share a session and so a lease; the orchestrator never runs two
  on the same files (its section 6).
- **J7. Where an expired item goes.** One DEFERRED section, "From the inbox, unanswered for 30 days", made the first
  time, each bullet the item's own words under `[owner]` and a line saying where it came from and when.
