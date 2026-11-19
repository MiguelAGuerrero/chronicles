---
name: tend-orchestrator
description: Run /tend again and again as the owner's proxy (decision 0157) - one subagent per run, the auditor, steward and ux-reviewer spawned by the orchestrator at each run's review points, the inbox answered yes only within 0157's limits and after /vision again, every no, reshape and identity question batched to the owner. It keeps running notes and ends with an insights file and a list of its proxy answers for the owner to keep or revert.
when_to_use: The owner asks to "run the loop", "orchestrate /tend", "act as my proxy for /tend" or "keep tending until it stalls". Not for one /tend run (type /tend), one bug (/fix) or one feature (/slice).
argument-hint: "[--runs=N] [--deploy=main|branch]"
disable-model-invocation: true
allowed-tools: Agent, SendMessage, Bash, Read, Write, Edit, Grep, Glob, AskUserQuestion, ToolSearch, mcp__github__actions_list, mcp__github__actions_get
---

# Tend orchestrator: $ARGUMENTS

You do not tend; you run `/tend` (`.claude/skills/tend/SKILL.md`) through subagents, have their work
reviewed by other subagents, and stand in for the owner on the answers decision 0157 lets a proxy
give. Each run follows `/tend` and `.claude/skills/ship.md`; this file is only what the orchestrator
adds. The texts you send are in `briefs.md` beside this file. Edit and Write are for the scratchpad,
never the repository: every change to the repository is a run's.

Two facts shape everything here:

- **A subagent cannot spawn subagents.** A run delegated to a subagent has no Agent tool, so its
  reviews would be the author reviewing itself, which `ship.md` "Review" forbids. The run stops at
  each review point and hands back; you spawn the reviewers and resume it (section 4).
- **The reviewers are read-only** (decision 0133). They cannot save a file or run a script beyond
  tests; you save their reports, and anything to be run for them, the run writes.

A question of colour or look goes to the owner as candidates side by side (whole palettes, measured
on what a person sees, the blend included), never one swatch.

**Every question you put to the owner** has its recommended option first, and that option cites its
precedent (decision 0193): for what a person sees or does, how 2-3 adjacent apps do the job (the entry's
`Precedent:` line, from `docs/research/adjacent-apps.md`, verified or not), so the owner has a model to
judge the shape against; for the loop itself (section 0), the decision it rests on. An entry filed without
a `Precedent:` line gets one from that file before it is asked, or "none found" said in the option.

## 0. Open: the grant, the stop rule, the authority

Typing this skill grants nothing yet. Ask once, with AskUserQuestion, recommended option first, and
write the answers at the top of the notes (section 1):

1. **Deploy.** `main`, as `/tend` does (0128), or `branch`. A session's own branch rules (a
   designated branch) win until the owner says `main` here; a `--deploy=main` the owner typed with
   this skill is that yes. Under `branch` no run's record reaches `main`, so the numbers stay
   provisional and the ledger never moves: run once, then stop and report.
2. **Stop rule.** Recommended: stop when no open entry is yours to answer (section 2), or the
   balance reads "outgrowing its base" and nothing is yours to answer, or two sweeps in a row ship
   nothing; at most N runs (`--runs`, default 8).
3. **Authority.** Decision 0157 is the ceiling; the owner may narrow it (for example "`T` entries
   only, every `G` to me"). Read 0157 aloud in the question: yes only; `/vision` again first; the
   classes always the owner's.
4. **The skills.** Recommended: changes to `/tend`, its scripts and this skill are proposed in the
   closing insights file, never made by the runs (`check:tend` refuses them). When the owner asks
   for them to be made first (from the last insights file), make them before the first run: the
   skill files yourself in a worktree of your own, the scripts by a non-loop subagent test-first on
   a local branch, every diff read by you, one decision record, landed on `main` by you.

## 1. Notes, from the first turn

Keep `orchestration-notes.md` in the scratchpad, written after every event: the owner's answers; a
row a run (agent id, worktree, branch, base, mode, result, commits, entries filed, tokens and
minutes; the id and worktree are what let you resume it after the conversation is summarized); each
ruling and its reason; **each proxy answer** (entry, date, the `/vision` verdict you ran); each
mistake of your own; the new friction each run reports. A `reviews/` folder beside it holds every
review prompt and saved report, named `<run branch>-<pause>-<agent>`.

**Your tools worktree, `<main-tools>`** (`SCRATCH/main-tools`). You sit in the primary checkout, which may
be behind `main` and lack `scripts/bookkeeping.js`: never run the bookkeeping commands there. Once, before
the first run: `git -C <primary> worktree add --detach <main-tools> origin/main`. Before each use:
`git -C <main-tools> fetch -q origin main && git -C <main-tools> checkout -q --detach origin/main`. Never
commit there. The script needs only node, git and curl: no `npm ci`, no `node_modules`. Call it as
`node <main-tools>/scripts/bookkeeping.js <command>`; at the close, `git -C <primary> worktree remove
<main-tools>`.

**Read every skill, rule, brief and script from `<main-tools>`**, never from the primary checkout: a
stale primary once sent a run a template three decisions old. This file and `briefs.md` included: if
`<main-tools>` holds a newer copy than the one you were loaded from, follow it.

**The owner's answers** given during the session go in `owner-answers.md` beside the notes, verbatim,
with the entry and date. The next run in the answers' area writes them into one decision record (the
loop cannot edit an existing decision); name the file in its brief.

Before the first run, from `origin/main` (`git fetch origin main`): the inbox, "Next evolutions" and
"In flight" in `docs/STATUS.md`; the ledger. Write nothing to the primary checkout (git's record of
`<main-tools>` aside). List the remote
`tend/*` and `slice/*` branches: a `-parked` branch an open entry names is live state; the rest are
dead runs' leftovers, reported, never removed by you.

Also before the first run:

- **Other sessions.** `list_sessions` (mine) for live sessions; for each whose title or "In flight" row
  overlaps an area you plan to run, `send_message` it what you will touch and ask what it touches.
  Never publish into a session's files without its answer; send it each landing's sha.
- **Reds on `main`.** The last "Last tend" and the weekly pass name the checks red on `main`. A red
  new since the last phase is diagnosed (a run of its own, or a known constraint in every brief)
  before new work in its area. Confirm red at rest, k of n, before calling it anything: a red that
  comes and goes with load is a check race until shown otherwise, and a bisect needs both ends
  confirmed.

## 2. Choose the next run

1. **An entry you may answer yes to**, by 0157 and section 0's answer, in the order the entries'
   dependencies state. For each: run `/vision` on it as `main` holds it (`.claude/skills/vision/SKILL.md`,
   called, returning its block), and say yes only to **aligned** or **no surface** with `Open:` and
   `Touches:` none. A slice-sized entry while the balance reads "outgrowing its base" is held this
   session, and the hold goes to the owner as a recommendation; a `G` from `/tend`'s lens 0 is not
   held (decision 0236). One build per run (`/tend` section 7):
   give the run every yes so its record carries them; it builds the first.
2. **Everything else in the inbox goes to the owner**: every no, reshape or hold you would give (as
   a recommendation), every class 0157 keeps for the owner, and whatever `/vision` did not clear.
   One AskUserQuestion, the entry's recommended shape first with its precedent, four entries at most, asked after the
   next independent run has been launched so the owner's time to answer is not idle time. Read the
   entries with `node <main-tools>/scripts/bookkeeping.js items inbox` (and `open`, `deferred --tag
   owner`): number, tag and title as `main` holds them.
   **Proposed expectation lines** (`/tend` lens 0, decision 0236; `node <main-tools>/scripts/expectations.js
   list`, the `proposed` ones) go in the same batch: one AskUserQuestion per feature, its lines grouped,
   "Ratify as drafted" first. They are identity, never the proxy's (0157). A drafted line is answered by
   the answer commit the orchestrator makes before the next run, never `/tend inbox`: on the answer, run
   `npm run expectations -- ratify|decline <ids> --by owner --date <date> --answer "<verbatim>"` yourself,
   in a worktree of your own from `origin/main`, as one commit,
   `expectations <feature>: the owner's answer, <date>`, with your trailers, and push it to `main` before or
   between runs, never inside one (a non-loop write; `check:tend` lets only that commit change a line's status: `/tend`'s `expectations.md`).
3. **An owner's yes the loop cannot build** (a rule file to split, a rule line to reword, a VISION
   edit, a decision to supersede): a non-loop run, briefed from `briefs.md` "The non-loop run", one
   job, its own decision record when the owner's answer is a call, reviewed by you before it lands.
4. **A sweep**: brief `/tend` with no area; the run asks `node scripts/tend.js next` itself. When
   `next` names none, the run is `/tend evolve` (`/tend`'s table), which files and builds nothing.
5. **Stop** by section 0's rule.

Before a `G` build (a slice), look at what is moving on `main` ("In flight", the day's
`git log origin/main`): a slice that refactors modules another session is changing will be parked
by a source conflict. Build it when `main` is quiet there.

**Pacing.** A run costs about 200-460 thousand tokens and each review 50-180 thousand; the account's
usage window is shared by every run and reviewer. Late in a window, prefer an inbox build to a
sweep, and never start a `G` build or a second run.

## 3. Brief the run

One `general-purpose` subagent per run, in the background, with the run brief from `briefs.md`:
its fixed text as it stands, never retyped or reworded, with only this run's specifics filled in
(decision 0181): the grant, the entry and its answer **marked as the proxy's or the owner's**, the
tripwires, the kind of run, a constraint the notes learned since the template last changed, the
attribution lines. A constraint every run needs belongs in the template: propose it in the
insights file (section 9); a run that rediscovers one spends a review round on it.

Never poll a run: no `sleep`, no reading its transcript, no status loops. You act when its hand-back
or its completion notice arrives.

## 4. The review relay

A run hands back `REVIEW REQUEST:`, one line per reviewer: its agent type and the path of the
prompt the run wrote. The pauses are:

| Run | Pauses |
|---|---|
| a sweep | after the lenses (`ux-reviewer` and `steward` on the pictures, `auditor` on the area's code); after the diff |
| a `T` build | after the diff |
| a `G` build | after the plan (`steward`, slice step 3); after the diff |
| `evolve` | before it files (`steward`, on its expectation lines) |

At a run's first pause the `steward` also checks the run's drafted expectation lines and amendments
(`/tend` lens 0) against VISION's Never lines and the persona, whoever else the pause calls for; at the
diff pause the `auditor` checks each `met` line's evidence (decision 0236).

At the diff pause the reviewers are chosen by risk (`ship.md`, "The faster lane"; decision 0181):
words or style only, one (the `ux-reviewer`, or the `steward` for the replay's or a VISION line's
words); behaviour that touches recording, storage, navigation, timing or data, **the `auditor`
always**, with the `ux-reviewer` when a screen changed; records only, none and no pause. Every
reviewer of a screen gets the after pictures (the auditor too), and **a screen the proxy said yes to
gets the `steward`** (0157).

1. **Check the paths** a prompt names: `node <main-tools>/scripts/bookkeeping.js review-paths
   <prompt>...` (every absolute path, spaces, `:12` references and `<placeholders>` read); fix each one
   it names missing before forwarding.
2. **Spawn every reviewer of the pause in one message**, in the background, each with the relay text
   from `briefs.md`.
3. **Save each report** to `reviews/<run branch>-<pause>-<agent>.md` as it arrives: each finding in
   substance (failing input, file and line, change, test name), the steward's quoted lines and its
   Silent questions verbatim, the commands and counts, the verdict.
4. **Wait for every reviewer of the pause**, then send one resume message (section 5).

The diff review is one round (`/tend` section 10, step 2).

## 5. Rulings

The resume gives the report paths and a ruling per finding with its reason. `/tend` section 1 is the
classification; these are what the session learned:

- **Look before you rule.** Grep that a rule line exists before naming it as a `Source:`. Read
  `FORBIDDEN` in `scripts/tend.js` itself before ruling an edit (it refuses far more than specs,
  decisions and existing rule lines; any list in a brief is a reminder, not the rule). Read the
  decision an entry says it amends.
- **The owner's, whatever the ruling would be:** a steward's Silent question; a finding that quotes a
  Never or Always line against a decision; a challenge to an owner's decision or a shipped criterion.
  They go in the owner's next batch with both lines quoted. Only an engineering or UI-pattern
  challenge to something the owner did not decide becomes an added rule line, worded "weighed by the
  loop; stands until the owner says otherwise".
- **Keep the inbox for real questions:** an oddity of existing behaviour mentioned in passing goes to
  `docs/DEFERRED.md`, tagged.
- **Medium and above are fixed in the run; a low is deferred**, filed `[loop]` in its area's section
  of `docs/DEFERRED.md` for the area's next sweep (0181). **Except what the run's own change broke:**
  a regression the change caused is fixed in the run, low or not, and a high in the run's own change
  lifts the size tripwire rather than shipping and filing it.
- **Say which constraint wins** when two of yours could collide.
- **Give tripwires**: "if any golden or differential result moves, stop and tell me"; "if the fix
  grows beyond these files, drop the commit and file the finding". A conditional ruling ("if
  `tend.js` allows it, else file it") is fine; the run checks.
- **When reviewers disagree**, rule the fix both can accept inside the answer; when none exists, the
  question goes to the owner with both views quoted. A reviewer's dissent from a pick the owner made
  on your recommendation is shown to the owner, not argued away.
- **A source conflict ship.md stops on** is yours to rule: one confined to imports and comments
  (independent meaning) is ruled through with a test proving the two changes independent and a
  tripwire for a behavioural clash, and reported to the owner as a stop ruled through; anything
  else stops.
- **Owner questions are folded**: related findings become one entry, and the owner's answer may
  widen it ("for all moment captures"): rule the pattern, not the one case.
- **A wrong loop commit on the unpushed run branch is dropped**, not patched in the one round:
  rebuild the branch without it (cherry-pick), correct every record line that claims it shipped,
  file the finding with the reviewer's analysis.

In a build of an approved entry only:

- **When a reviewer calls something the owner's, look first for a shape inside the entry's approved
  criteria**; if one exists and what a person sees still matches the entry, rule it; else escalate.
- **When a reviewer patches one example of a class, rule the fix for the class** if it stays inside
  the entry; a change to what a person sees is gated again (0157).
- **Say less inside the answer**: when a shape needs words the entry did not approve, drop the
  words (a time, a count) rather than invent them, and send the new words to the owner.
- **Keep to the owner's scope**: an answer that named some screens covers those; the others keep
  their behaviour without asking again.
- **Settle by honest wording of the record** (the decision, the rule line the run added) when the
  behaviour is acceptable and no screen's words change; list every record narrowed this way in the
  closing report. New words on a screen go to `/vision`.

What to ask reviewers for:

- **"Nothing a person sees changes"**: an old/new differential over real data that the run writes as
  a `*.test.ts` in the scratchpad (both trees' word lists, every difference printed) and the auditor
  runs and reviews; the run keeps it for the next build.
- **A timed thing made persistent**: every way its subject can disappear (deleted, failed, stopped,
  navigated away).
- **Every surface that shows it**: a change to a message, a notice or a type is pictured and judged
  wherever it appears (grep the source and every consumer); a fix to one of three left two red.
- **The degenerate geometries** for a change to a marker or a line: coincident, overlapping, a loop
  walk's start on its end, off-screen.
- **The tests that cannot fail** (from the auditor): green checks hid a high and three mediums in one
  sweep, where a test asserted a helper's return and not the end effect.

## 6. Main moves; two runs at once

The owner's other sessions push to `main`. Each run fetches and rebases at every pause (the brief
says so); STATUS, DEFERRED and the ledger follow `/tend` section 10.3.

- **Two runs may go at once** on disjoint areas (decision 0181): no file in common
  (`scripts/features.js` owners) and no record section in common (a `docs/DEFERRED.md` or
  `docs/NATIVE_UNVERIFIED.md` section, a "From <skill>" section). The inbox, "Last tend" and the
  ledger are shared; a conflict there resolves with `npm run records -- redo` (`/tend` section
  10.3). Never two `G` builds, and never a second run late in a usage window.
- When one lands, send the other one line: "main moved to <sha>; lastT is now N".
- **Two runs in one area** clash on finding numbers (`tend <area> N`, `audit N`): give each a range in
  its brief, or the second to publish renumbers at its rebase.
- **The weekly full pass** is a run's (`/tend` section 10, recorded in the run log as
  `"e2e":"full"`): when `node <main-tools>/scripts/tend.js e2e-due` says it is due (no such line
  in seven days of `main`'s log), say so in the next code run's brief. The pass is `npm run e2e:all`;
  made on its own, it logs mode `e2e` with the line the script prints.

## 7. When a run completes

1. Verify, after refreshing `<main-tools>`: `node <main-tools>/scripts/bookkeeping.js landed
   <base>..<pushed sha> --branch <run branch> --live https://miguelaguerrero.github.io/chronicles/`, the
   head the run reports as pushed (a range ending at `origin/main` holds whatever landed and is refused):
   the run's commits on `main`, no worktree or local branch left, the live bundle (compared with nothing:
   `<main-tools>` has no export). Pages with the GitHub tools. Take commit hashes from `origin/main`, not
   the run's report (a rebase or amend renames them).
2. Update the notes.
3. Tell the owner in a few lines: what landed and its Pages run, the compass's reading (`node
   <main-tools>/scripts/tend.js compass`, its last line; decision 0236), what you answered (as the proxy) and
   why, what needs them, with the one action named. An item that blocks the loop and waits only on
   the owner (a rule file to split, a rule line to reword) is put to them as a question with
   AskUserQuestion at this report, not merely listed (decision 0173).
4. Choose the next run (section 2).

## 8. When a run stops early

**After a container or worker restart**, before resuming anything: fetch `main`, read Pages, and list
the worktrees with each one's `git status --short -uall` and `git log --oneline origin/main..HEAD`.
Background journeys and exports are gone; a hand-back lost in the restart is in the agent's transcript
(its `SubagentHandback` call), recovered with a short script, never read whole. A run that finished
before the restart may have left its last steps (Pages, the live check, cleanup) undone: they are yours.

- **A usage limit or an API error** ends a run mid-step; its worktree and commits survive. After the
  reset, resume **the same agent** (its id is in the notes) with the resume text from `briefs.md`.
  Never start a fresh agent over a live worktree.
- **"Stopped on"** is the run's to file (`/tend` section 7's parked path, a pushed `-parked` branch);
  the question arrives in the inbox, and section 2 routes it.
- **Pages unconfirmed** after 30 minutes: check that run once when the next run's report arrives. If
  it is red, before anything else start a run whose only job is `ship.md` "A red run" for that
  range, under the same grant; if that is not clearly covered, ask the owner. Never publish over a
  red `main`.

## 9. Close

Stop by section 0's rule. Then:

- Write `orchestration-insights.md` in the scratchpad from the notes: a row a run, the rules learned,
  the problems met, the `/tend` friction (grouped, each a proposal), and changes this skill should
  take. Send it to the owner.
- Report, and ask the owner about the proxy answers: each one (entry, what landed, the `/vision`
  verdict) for them to keep or revert; every record narrowed by wording; what waits on them (open
  entries, phone checks, "Open before the loop", remote branches to delete); what the next session
  would run.

## Report

The owner's four answers; the runs (mode, result, commits, entries); the proxy answers and the
owner's answers; what waits on the owner; the path of the insights file.
