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
| `docs/research/tend-process-review.md` | its `Status:` line: G7 built in loop-budget |

Three source files under `scripts/`, no `src/` file. `tend/SKILL.md` is at 498 of its 500 lines: the new words go into
the lines that hold the rules they amend, not new paragraphs.

## What each criterion builds

**LB1, the budget** (`reviewBudget(commits)`, pure; `commits` holds every range problem it returns, in both modes, so CI
reads it on every push with the base's scripts once this is on `main`). Over the range's loop commits (subject `tend `,
as `--loop-only` reads them) and their reverts, per area (the subject's second word):

- *fixes* = the distinct numbers `findingsOf` reads as shipped, with the distinct `T<n>` it reads as built;
- *review fixes* = the distinct numbers it reads as `audit`;
- a commit the range reverts (`Revert "tend …"`, by its `This reverts commit <sha>.` lines, a commit of the range) is
  left out of both, and so is the revert (LB1b);
- an audit number named by a commit whose message has a line `Regression: <sha>`, `<sha>` a commit of the range, is the
  run's own regression and is not counted (the criterion's "unless");
- review fixes greater than fixes: one problem for the area, naming both lists and the fix ("file the rest `[loop]` with
  their severity, or name the regression: `Regression: <sha>`").

Counted by findings, not commits (J3), so `audit 26-28` in one subject is three and a fix's later trap-line commit
naming the same `audit 3` is one (the known double count in `tend:log`'s `auditFixes` is not this count's).

**LB2, rotation** (`next`). The verb order is VISION's "Return, Honour, Earn" (Chronicle first). From the run log alone:

- `lastWasRotation(runs)`: the latest sweep line was a rotation when its area had no earlier sweep, or its previous
  sweep was the oldest latest-sweep of the areas swept before it (ties count). No sweep at all: a rotation.
- **After a rotation, the reset turn:** `next` as it is today (decision 0229's resets, then 0235's evolve, then the
  computed rough, then settling).
- **After any other sweep, the rotation turn:** a due evolve first (LB2b), else `rotationArea`: the never-swept areas
  by verb then name; when none, the area whose latest sweep is oldest, ties by verb then name; `resting` areas skipped.
- stdout stays the one area (the skills read it); the reason goes to stderr ("rotation: never swept, Return").

On today's `main` the latest sweep (map, Nov 20) was not a rotation, so `next` turns from `walk-screen` (its resets) to
the first never-swept Return area by name, `gallery` (J1's table).

**LB3, the answer log.** `runLine` stamps `answerLog: "0235"` (the script's, like `date` and `lens`: a run's JSON may not
give it). A line with the marker holds each answer to `{ entry, answer, by, pick }`: `by` `owner` or `proxy` (0236's
words); `pick` `recommended`, `other`, `reshape` or `no`, agreeing with `answer` (`yes` with `recommended` or `other`,
`no` with `no`, `reshape` with `reshape`); a proxy answers only `yes` (0157: never no, never a reshape). `tend.js log`
refuses a line that breaks them (LB3b: no marker, read as it was). `appendLog` adds each answer's `class` from the
range base's `docs/STATUS.md`: `T [owner]`, `T [arch]`, `T [phone]` by the entry's tag, `G` for a proposal, the bare
letter when the base no longer holds it.

**LB4, take-up** (`answerTakeUp(runs, today, 30)`, pure; `balance` prints it as `answers`): over the window's lines,
per class, the owner's answers and how many took the recommended option (and the other picks); the proxy's yeses, and
those with no later answer `by: owner` for the same entry (unconfirmed: the owner's keep, 0157's closing list, is logged
by the next run as an answer by the owner, J5); the answers logged before the marker, counted apart as `unlogged`.
Nothing acts on it (delegating stays the owner's call, 0157).

**LB5, the inbox ages** (`inboxAge(status, today)`, pure, read by `records.js`). Every item `readInbox` reads (every
bullet under "Needs the owner", "Last tend" apart), unanswered by its `ANSWERED` words, dated by its first date: 14 days
or more is listed oldest first, 30 or more marked to move; undated and `[phone]` items listed apart (LB5b). `npm run
records -- inbox age [--main] [--json]` prints it (`--main`: `origin/main`'s STATUS); `--write <dir>` writes, for each
item to move, its DEFERRED bullet (`- [owner] ` and the item's text, every line kept, then one line: `Moved from the
inbox ("<section>") on <today>, unanswered since <date> (decision 0235).`) and prints the two operations that move it:
its removal (`inbox remove <id>`, `open remove "<match>"` or `section item remove "<section>" "<match>"`, each with
`--reason "unanswered for 30 days (decision 0235)"`) and `deferred item add "From the inbox, unanswered for 30 days"
--file <dir>/<n>.md` (`--new` the first time). Nothing moves today: the oldest item is from Nov 11.

**LB6, the lease.** A lease is an "In flight" row whose Session cell starts `Lease:`, whose Doing cell names the held
files in backticks, `from <YYYY-MM-DDTHH:MMZ>` and `session <id>` (the `session_…` of the holder's `Claude-Session:`
trailer). `leaseRows(status)` reads them; `leaseProblems({ files, date, session, rows })` refuses a commit that changes a
held process file while the lease is live (`from` ≤ the commit's date < `from` + 24 h) unless the commit carries the
holder's session. `commits` (both modes) reads the leases at each agent commit's parent, for the commits that touch a
process file: `.claude/skills/**` (the ledger and the run log apart), `.claude/hooks/**`, `.claude/agents/**`,
`AGENTS.md`, `CLAUDE.md`, `.github/**`, and `scripts/{tend,records,bookkeeping,expectations}.js`. The owner's own
commits carry no trailer and are never read (LB6b). The owner clears a row by hand, or a session does with
`inflight remove "<match>" --reason "the owner cleared the lease, <date>"`. The holder publishes its row alone (`npm run
records -- inflight add`, a records-only commit pushed to `main` as it opens), and removes it in its last record commit.

**LB7**: met (the spec's Record); nothing built.

**LB8, the skills say the same.**

- `tend/SKILL.md`: the table's first row (`next` alternates); section 10.1 (`answers` carry `by` and `pick`), 10.2 (the
  budget, a regression line, the rest filed `[loop]` with their severity; amends 0181's "medium and above"), and the
  close (`inbox age`: what has waited 30 days moves).
- `ship.md`: "The faster lane"'s fixes line (the budget); "Open the worktree" (the lease for process files); "Publish to
  main" unchanged (LB7).
- `tend-orchestrator/SKILL.md`: section 2.2 (`inbox age`, the four oldest asked first); section 9 (each proxy yes the
  owner keeps is logged by the next run as `by: owner`); the briefs' answers marked `by` and `pick`.
- `briefs.md`: the run brief's answer line names `by` and `pick`; the non-loop run takes a lease for process files.

## Tests (one per criterion, each a todo first)

| Id | Test (`arch/`) | Seen failing because |
|---|---|---|
| LB1 | `tend.test.ts` `LB1: …`: `reviewBudget` over made-up ranges (under, over, a regression line, a revert); `commits` on a scratch repository refuses a range over budget | no `reviewBudget` |
| LB2 | `tend.test.ts` `LB2: …`: `lastWasRotation`, `rotationArea` by verb; `features.test.ts`: every feature but `arch` has a verb | no functions, no verbs |
| LB3 | `tend.test.ts` `LB3: …`: `logProblems` on a marked line without `by`/`pick`, with a proxy no; `tend:log` refuses one | the marker is not read |
| LB4 | `tend.test.ts` `LB4: …`: `answerTakeUp` on made-up lines (take-up by class, an unconfirmed proxy yes, unlogged) | no function |
| LB5 | `records.test.ts` `LB5: …`: `inbox age` lists 14 days, marks 30, writes the bullet with every line kept and prints the two operations; undated and phone apart; no sidecar written | no command |
| LB6 | `tend.test.ts` `LB6: …`: `leaseRows`, `leaseProblems` (live, lapsed, the holder, a file not held); `commits` on a scratch repository refuses another session's commit | no lease read |
| LB8 | `tend.test.ts` `LB8: …`: the four skill files name `Regression:`, `inbox age`, `by` and `pick`, the rotation and the lease | the words are not there |

Each test's wiring is reverted once after it passes, to see it fail.

**The testing's size** (`docs/TESTING.md`, decision 0223): small. No journey covers `scripts/tend.js`, `scripts/records.js`
or the skills; `launch` once at the end as the smoke. `npm test` whole at step 9.

**Cost.** `commits` reads one more `git show` per agent commit that touches a process file (a handful per push);
`next` and `balance` read the run log they already read (about a hundred lines, growing by a few a day); `inbox age`
reads one document. No harness: none of it is per frame or per fix.

**Native**: none. **Deferred**: none planned.

## Judgement calls (the steward rules on these; none changes a criterion's words)

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
