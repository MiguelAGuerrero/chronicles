---
name: tend-orchestrator
description: Run /tend again and again as the owner's proxy (decision 0157) - one subagent per run, the auditor, steward and ux-reviewer spawned by the orchestrator at each run's review points, the inbox answered yes only within 0157's limits and after /vision again, every no, reshape and identity question batched to the owner. It keeps running notes and ends with an insights file and a list of its proxy answers for the owner to keep or revert.
when_to_use: The owner asks to "run the loop", "orchestrate /tend", "act as my proxy for /tend" or "keep tending until it stalls". Not for one /tend run (type /tend), one bug (/fix) or one feature (/slice).
argument-hint: "[--runs=N] [--deploy=main|branch]"
disable-model-invocation: true
allowed-tools: Agent, SendMessage, Bash, Read, Write, Edit, Grep, Glob, AskUserQuestion, ToolSearch, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
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
on what a person sees, the blend included), never one swatch, each pictured at its worst case beside its best
(`.claude/skills/tend/traps.md`, "Looks, questions and claims"; `.claude/skills/mockup.md`, "What it is"). A build
whose look the owner picks takes section 4's look pauses, so the owner picks from pictures and sees the built look
before it publishes.

**A mock-up is the owner's alone** (decisions 0252, 0259, `.claude/skills/mockup.md`): the proxy never approves a
mock-up and never says yes to an entry whose look needs one ("When one is needed"), with or without its `Mock-up:`
line. Such entries go to the owner (step 3), each question linking its drawn page. A small element, a restyle within
the tokens or reworded words is no look call under 0259.

**Every question you put to the owner** has its recommended option first, and that option cites its
precedent (decision 0193): for what a person sees or does, how 2-3 adjacent apps do the job (the entry's
`Precedent:` line, from `docs/research/adjacent-apps.md`, verified or not), so the owner has a model to
judge the shape against; for the loop itself (section 0), the decision it rests on. An entry filed without
a `Precedent:` line gets one from that file before it is asked, or "none found" said in the option.

**Ask as questions arise, in batches, never held to the close** (the keep or revert of the proxy's answers stays
at the close, section 9). The owner was present through Nov 25-27 and
answered within minutes; a plan pause's Silent questions, asked at that pause, kept each build moving, where holding
them to the close would have stalled every one. Each batch goes out when its questions are ready (a pause's at the
pause, the inbox's as section 2 says), four at most a call. Check each question's premise in the code first (what
the screen draws today, by file and line: `.claude/skills/tend/traps.md`, "Looks, questions and claims"): the owner
answers what they are told.

## 0. Open: the grant, the stop rule, the authority

Typing this skill grants nothing yet. Ask once, with AskUserQuestion, recommended option first, and
write the answers at the top of the notes (section 1):

1. **Deploy.** `main`, as `/tend` does (0128), or `branch`. A session's own branch rules (a
   designated branch) win until the owner says `main` here; a `--deploy=main` the owner typed with
   this skill is that yes. Under `branch` no run's record reaches `main`, so the numbers stay
   provisional and the ledger never moves: run once, then stop and report. A build that spans a second
   repository (`chronicles-data`) pushes to its `main` only when the owner names that repository (`ship.md`'s grant
   paragraph): ask it when such a build comes up.
2. **Stop rule.** Recommended: stop when no owner's yes that can be built now waits for its build, and no open
   entry is yours to answer (section 2: each queued yes of the owner's is a run, and the loop does not stop while
   one waits, within its N runs), or the
   balance reads "outgrowing its base" (`/tend` section 8: the rough share of the areas swept twice or more,
   or more than ten unanswered `T` entries) and neither remains, or two sweeps in a row ship
   nothing; at most N runs (`--runs`, default 8). While `node scripts/tend.js next` answers `evolve <area>`
   (fourteen days with no loop-filed `G`, decision 0235), that run comes before the stop. A `balance` or `next`
   that exits non-zero on a shallow history is no reading: fetch from the date it names and ask again.
3. **Authority.** Decision 0157 is the ceiling; the owner may narrow it (for example "`T` entries
   only, every `G` to me"). Read 0157 aloud in the question: yes only; `/vision` again first; the
   classes always the owner's.
4. **The skills.** Recommended: changes to `/tend`, its scripts and this skill are proposed in the
   closing insights file, never made by the runs (`check:tend` refuses them). When the owner asks
   for them to be made first (from the last insights file), make them before the first run: the
   skill files yourself in a worktree of your own, the scripts by a non-loop subagent test-first on
   a local branch, every diff read by you, one decision record, landed on `main` by you under `ship.md`'s lease
   ("Open the worktree", step 6).

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
  Never publish into a session's files without its answer; send it each landing's sha. Before a brief guards
  against another branch, check it holds work (`git fetch -q origin <branch> && git log --oneline origin/main..FETCH_HEAD`): a
  collision warned of for G13 named a branch already merged.
- **Reds on `main`.** The last "Last tend" and the weekly pass name the checks red on `main`. A red
  new since the last phase is diagnosed (a run of its own, or a known constraint in every brief)
  before new work in its area. Confirm red at rest, k of n, before calling it anything: a red that
  comes and goes with load is a check race until shown otherwise, and a bisect needs both ends
  confirmed. A red with nothing landed may be the calendar's (`.claude/skills/tend/traps.md`, "Tests":
  `IN_PROGRESS`'s dates); renewing them is the owner's.

## 2. Choose the next run

1. **An owner's yes waiting for its build**: an entry `main` holds with the owner's yes noted on it, or one the
   owner answered yes to in this session (`owner-answers.md`), in the order the owner gave, else the order the
   entries' dependencies state. It is the owner's answer, not yours (the brief marks it so), and a run like any
   other: section 0's stop rule waits for it; one build per run, as in step 2. Step 2's outgrowing hold is the
   proxy's and does not hold an owner's yes. One whose look needs a mock-up it lacks, or with an `Open:` line other
   than a look the owner picks from candidates, is not built (`.claude/skills/tend/inbox.md`); its open call goes to
   the owner (step 3). Such a look is answered at section 4's look pause.
2. **An entry you may answer yes to**, by 0157 and section 0's answer, in the order the entries'
   dependencies state. For each: run `/vision` on it as `main` holds it (`.claude/skills/vision/SKILL.md`,
   called, returning its block), and say yes only to **aligned** or **no surface** with `Open:` and
   `Touches:` none, and only to an entry whose look needs no mock-up (decisions 0252, 0259). A slice-sized entry while the balance reads "outgrowing its base" is held this
   session, and the hold goes to the owner as a recommendation; a `G` from `/tend`'s lens 0 is not
   held (decision 0236). One build per run (`/tend` section 7):
   give the run every yes so its record carries them; it builds the first.
3. **Everything else in the inbox goes to the owner**: every no, reshape or hold you would give (as
   a recommendation), every class 0157 keeps for the owner, an entry filed "against the keep of <day> (<area>)" (a
   finding against the owner's walk note, the owner's alone: `.claude/skills/tend/walks.md`), and whatever `/vision` did
   not clear.
   One AskUserQuestion, the entry's recommended shape first with its precedent, four entries at most, asked after the
   next independent run has been launched so the owner's time to answer is not idle time. Read the
   entries with `node <main-tools>/scripts/bookkeeping.js items inbox` (and `open`, `deferred --tag
   owner`): number, tag and title as `main` holds them. Ask the four oldest first: `node <main-tools>/scripts/records.js
   inbox age --main` lists every item waiting 14 days unanswered, oldest first (decision 0235); an entry with a `T` or
   `G` number is asked by it, an untagged item by its title.
   **Proposed expectation lines** (`/tend` lens 0, decision 0236; `node <main-tools>/scripts/expectations.js
   list`, the `proposed` ones) go in the same batch: one AskUserQuestion per feature, its lines grouped,
   "Ratify as drafted" first. They are identity, never the proxy's (0157), and a drafted line is answered by
   the answer commit, never `/tend inbox`, and the session that asked the owner makes the answer commit, outside
   any run and after its run has landed (here, you; a plain `/tend` session asks at its step 5 and then commits
   the answer the same way, never inside the run's own commits). On the answer, run
   `npm run expectations -- ratify|decline <ids> --by owner --date <date> --answer "<verbatim>"` yourself,
   in a worktree of your own from `origin/main`, as one commit,
   `expectations <feature>: the owner's answer, <date>`, with your trailers, and push it to `main` before or
   between runs, never inside one (a non-loop write; `check:tend` lets only that commit change a line's status: `/tend`'s `expectations.md`).
4. **An owner's yes the loop cannot build** (a rule file to split, a rule line to reword, a VISION
   edit, a decision to supersede): a non-loop run, briefed from `briefs.md` "The non-loop run", one
   job, its own decision record when the owner's answer is a call, reviewed by you before it lands.
5. **A sweep**: brief `/tend` with no area; the run asks `node scripts/tend.js next` itself. When
   `next` answers `evolve <area>`, the run is `/tend evolve <area>`; when it names none, the run is `/tend evolve`
   (`/tend`'s table), which files and builds nothing.
6. **Stop** by section 0's rule.

Before a `G` build (a slice), look at what is moving on `main` ("In flight", the day's
`git log origin/main`): a slice that refactors modules another session is changing will be parked
by a source conflict. Build it when `main` is quiet there.

**Pacing.** Measured on Nov 25-27 (no sweep ran then), each run alone and then its reviewers: a `T` build
0.3-0.5 million tokens and under an hour, its reviewer about 0.1 million more; a `/fix` about 0.6 million and an
hour, its reviewers about 0.15 million more; a `G` build 1.1-2.5 million and 1.5-6 hours, its reviewers 0.2-0.6
million more, most of it the two review pauses and their fixes; a reviewer 50-180 thousand. Count a run's pauses and their reviewers before starting it:
the account's usage window is shared by every run and reviewer. Late in a window, prefer an inbox build to a
sweep, and never start a `G` build or a second run.

## 3. Brief the run

One `general-purpose` subagent per run, in the background, with the run brief from `briefs.md`:
its fixed text as it stands, never retyped or reworded, with only this run's specifics filled in
(decision 0181): the grant, the entry and its answer **marked as the proxy's or the owner's** (the run log's `"by"` and
`"pick"`, with the owner's words verbatim; decision 0235), the
tripwires, the kind of run, a constraint the notes learned since the template last changed, the
attribution lines. A constraint every run needs belongs in the template: propose it in the
insights file (section 9); a run that rediscovers one spends a review round on it. The brief points to
`.claude/skills/tend/traps.md`, the maintained list of what the gates and tools misread: a trap already there is
never repeated in a brief.

Before sending, check every repository path the brief names on `<main-tools>`, and every fact it carries from another run's report in the file it names (section 5).

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
| a `/fix` (section 6) | after the diff |
| a build whose `Open:` is a look the owner picks | also a look pause before building (before the plan, in a `G` build) and a look check of the built pictures before it publishes: no reviewer; the run hands back `LOOK PAUSE:` with the pictures' paths, you ask the owner (each candidate with its worst case), and resume it with the pick verbatim |

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
4. **Wait for every reviewer of the pause**, then send one resume message (section 5), except for a
   reviewer lost to a restart: one that ends with no report (a transcript of tool calls is no report) is rerun
   with the same prompt pinned to the committed range it reviews (the relay's range line). At the diff pause,
   resume the run with the other reports and the resume's hold line, so it fixes them but does not publish; send
   the rerun's rulings when it arrives, in the same round. A plan pause waits for it
   (`.claude/skills/tend/traps.md`, "The session: restarts and refusals").

The diff review is one round (`/tend` section 10, step 2).

## 5. Rulings

The resume gives the report paths and a ruling per finding with its reason. `/tend` section 1 is the
classification; these are what the session learned:

- **Look before you rule.** Grep that a rule line exists before naming it as a `Source:`. Read
  `FORBIDDEN` in `scripts/tend.js` itself before ruling an edit (it refuses far more than specs,
  decisions and existing rule lines; any list in a brief is a reminder, not the rule). Read the
  decision an entry says it amends. A fact a run's report claims that you will relay, to the owner or to
  the next run, is checked in the file it names first: run 3 was sent a "44 pt" in two lines that named no
  size, taken from run 2's report.
- **The owner's, whatever the ruling would be:** a steward's Silent question; a finding that quotes a
  Never or Always line against a decision; a challenge to an owner's decision or a shipped criterion.
  They go in the owner's next batch with both lines quoted. Only an engineering or UI-pattern
  challenge to something the owner did not decide becomes an added rule line, worded "weighed by the
  loop; stands until the owner says otherwise".
- **Keep the inbox for real questions:** an oddity of existing behaviour mentioned in passing goes to
  `docs/DEFERRED.md`, tagged.
- **The budget: one review fix per fix** (decisions 0235, 0269): a high (`Severity: high`) and the run's own regression
  (`Regression: <sha> <what worked at the base>`) are fixed in the run whatever the budget, the rest in severity order
  up to it; **a low, and what is over, is deferred** with its severity, filed `[loop]` in its area's section
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

- **Two runs may go at once** on disjoint areas (decision 0181), each run's lease on process files its own
  (`Lease: <id>`, ship.md "Open the worktree"): no file in common
  (`scripts/features.js` owners) and no record section in common (a `docs/DEFERRED.md` or
  `docs/NATIVE_UNVERIFIED.md` section, a "From <skill>" section). The inbox, "Last tend" and the
  ledger are shared; a conflict there resolves with `npm run records -- redo` (`/tend` section
  10.3). Never two `G` builds, and never a second run late in a usage window.
- **A bug the owner reports mid-session** may run as a `/fix` beside the running build when its files are
  disjoint from the build's, by the same test, and the owner says so (recommended: in parallel). It is one of
  the session's runs, briefed with the run brief's `/fix` choices (`.claude/skills/fix/SKILL.md`; its grant is
  `/fix`'s, one issue, decision 0081), reviewed through the relay (one round: the faster lane binds the runs this
  skill briefs, 0181).
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
   the run's report (a rebase or amend renames them). List the remote branches the run pushed, in each repository it
   pushed to (`git ls-remote --heads origin '<run branch>*'`): one that `ship.md` "Clean up", step 4, does not call
   for is a leftover reported to the owner, as the session's network proxy refuses its deletion.
2. Update the notes.
3. Tell the owner in a few lines: what landed and its Pages run, the compass's reading (`node
   <main-tools>/scripts/tend.js compass`, its last line; decision 0236), what you answered (as the proxy) and
   why, what needs them, with the one action named. An item that blocks the loop and waits only on
   the owner (a rule file to split, a rule line to reword) is put to them as a question with
   AskUserQuestion at this report, not merely listed (decision 0173).
4. Choose the next run (section 2).

**A build that waits on a data build** (`chronicles-data`'s manual workflow, `.claude/skills/data-build/SKILL.md`):
the dispatch is the owner's click and a green run is no published pack (`.claude/skills/tend/traps.md`, "Data and
second repositories"). Ask for it when the data change has landed, naming only the sources it needs. When it
completes, read its log lines (`get_job_logs`, loaded with ToolSearch; it answers 404 while the job runs) before
calling the pack published or starting the run that waits on it. Set yourself a reminder for when it should be
done; never poll it.

## 8. When a run stops early

**After a container or worker restart**, before resuming anything: fetch `main`, read Pages, and list
the worktrees with each one's `git status --short -uall` and `git log --oneline origin/main..HEAD`.
Background journeys and exports are gone; a hand-back lost in the restart is in the agent's transcript
(its `SubagentHandback` call), recovered with a short script, never read whole. A run that finished
before the restart may have left its last steps (Pages, the live check, cleanup) undone: they are yours.
A reviewer running at the restart: section 4, step 4. Keep the scratchpad path the notes and briefs name, even
when the session names a new one.

- **A usage limit or an API error** ends a run mid-step; its worktree and commits survive. After the
  reset, resume **the same agent** (its id is in the notes) with the resume text from `briefs.md`.
  Never start a fresh agent over a live worktree.
- **"Stopped on"** is the run's to file (`/tend` section 7's parked path, a pushed `-parked` branch);
  the question arrives in the inbox, and section 2 routes it.
- **Pages unconfirmed** after 30 minutes: check that run once when the next run's report arrives. If
  it is red, before anything else start a run whose only job is `ship.md` "A red run" for that
  range, under the same grant; if that is not clearly covered, ask the owner. Never publish over a
  red `main`.
- **A refusal by the auto-mode classifier** (relaying "the owner approved" to a run, fetching a signed URL) is
  asked of the owner, never routed around (`.claude/skills/tend/traps.md`, "The session: restarts and refusals").

## 9. Close

Stop by section 0's rule. Then:

- Write `orchestration-insights.md` in the scratchpad from the notes: a row a run, the rules learned, the balance's
  walk silence once when a run's balance said it ("no walk note has come in since <day>"; decision 0238),
  the problems met, the `/tend` friction (grouped, each a proposal), and changes this skill should
  take. Send it to the owner.
- Report, and ask the owner about the proxy answers: each one (entry, what landed, the `/vision`
  verdict) for them to keep or revert (a keep goes in the next run's brief, logged as an answer by the owner with
  their words and `"confirms": "<the proxy line's date>"`, decision 0235); every record narrowed by wording; what waits on them (open
  entries, phone checks, "Open before the loop", remote branches to delete); what the next session
  would run.

## Report

The owner's four answers; the runs (mode, result, commits, entries); the proxy answers and the
owner's answers; what waits on the owner; the path of the insights file.
