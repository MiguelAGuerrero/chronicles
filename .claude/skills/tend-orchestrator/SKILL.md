---
name: tend-orchestrator
description: Run /tend again and again as the owner's proxy - one subagent per run, the auditor, steward and ux-reviewer spawned by the orchestrator at each run's review points, the inbox answered within an authority the owner set at the start, and only architecture, phone checks and changes to the owner's own decisions brought back to the owner. It keeps running notes and ends with an insights file. Learned from the orchestrated session of Nov 11-12.
when_to_use: The owner asks to "run the loop", "orchestrate /tend", "act as my proxy for /tend" or "keep tending until it stalls". Not for one /tend run (type /tend), one bug (/fix) or one feature (/slice).
argument-hint: "[--cap=N] [--parallel] [--deploy=main|branch]"
disable-model-invocation: true
allowed-tools: Agent, SendMessage, Bash, Read, Write, Edit, Grep, Glob, AskUserQuestion, ToolSearch, mcp__github__actions_list, mcp__github__actions_get
---

# Tend orchestrator: $ARGUMENTS

You do not tend; you run `/tend` (`.claude/skills/tend/SKILL.md`) through subagents, review their
work through other subagents, and stand in for the owner on the answers the owner delegated. The
procedure each run follows is `/tend`'s and `.claude/skills/ship.md`'s; this file is only what the
orchestrator adds. The brief and relay texts are in `briefs.md` beside this file.

Two facts shape everything here:

- **A subagent cannot spawn subagents.** A run delegated to a subagent has no Agent tool, so its
  `auditor`, `steward` and `ux-reviewer` passes would become the author reviewing itself, which
  `ship.md` "Review" forbids. The run therefore stops at each review point and hands back; you spawn
  the reviewers and resume it (section 4).
- **The reviewers are read-only** (decision 0133: no Write, and `.claude/hooks/readonly-bash.sh`).
  They cannot save their own reports; you save them.

## 0. Open: the grant, the stop rule, the authority

The owner typing this skill grants nothing yet. Ask once, with AskUserQuestion, recommended option
first, and write the answers at the top of the notes file (section 1):

1. **Deploy.** `main`, as `/tend` does (decision 0128), or `branch` / per-run review branches. A
   session's own branch rules (a designated branch, "never push elsewhere") win until the owner says
   `main` here, in this session.
2. **Stop rule.** Recommended: stop when every open entry needs the owner, when the balance reads
   "outgrowing its base" and nothing in the inbox is yours to answer, or when two sweeps in a row ship
   nothing; with a run cap (8).
3. **Proxy authority.** Recommended: you answer `[owner]` T and G entries; you bring to the owner
   every `[arch]` entry, every `[phone]` entry, any edit to `docs/VISION.md`, and any entry that
   **amends or reverses** an owner's decision (read the decision; an entry's own "amends X" can name a
   finding where the decision is another number). An entry that only extends a decision is yours.
4. **The skills.** Recommended: you propose changes to `/tend` and its scripts in the closing insights
   file and edit none (`check:tend` forbids the loop's commits from touching them anyway).

With `--parallel` absent, runs go one at a time (section 6). With `--cap`, the run cap.

## 1. Notes, from the first turn

Keep `orchestration-notes.md` in the scratchpad: the owner's answers, a table of runs (mode, result,
commits, entries filed, tokens and minutes), each ruling and its reason, each mistake of your own,
and the skill friction each run reports. Write after every event, not at the end: the conversation
may be summarized, and the notes become the closing insights file (section 9). A
`reviews/` folder beside it holds every brief, review prompt and saved report.

Before the first run:

- `git fetch origin main`; read `docs/STATUS.md` ("Needs the owner", "Next evolutions", "In flight")
  and `.claude/skills/tend/ledger.json` from `origin/main`.
- Give the primary checkout `node_modules` (`npm ci` once) so every run's worktree can hard-link it
  (`ship.md`, "Open the worktree", step 4).
- List remote `tend/*` and `slice/*` branches: a dead run's leftovers, reported, never removed by you.

## 2. Choose the next run

In this order:

1. **Inbox entries you may answer**, by section 0's authority, one build per run (`/tend` section 7).
   Order by the dependencies the entries state ("G4 first is better"). Answer several in one run's
   arguments ("T9 yes, T12 yes") so the record carries every yes; the run builds the first.
2. **Entries for the owner**: batch them into one AskUserQuestion, the entry's recommended shape
   first, four at most, asked **after** the next independent run has been launched, so the owner's
   time to answer is not idle time.
3. **A sweep** of the area `node scripts/tend.js next` names (run it in a scratch worktree of
   `origin/main`; the primary checkout's copy of the ledger is stale).
4. **Hold** an addition the balance says to hold: a slice-sized entry while the balance reads
   "outgrowing its base" waits, and says why in the notes.

Before a `G` build (a slice), look at what else is moving on `main`: the "In flight" rows, the last
day's `git log origin/main`, the owner's other sessions' branches. A slice that refactors modules
another session is changing will be parked by a source conflict (`/tend` section 7); build it when
`main` is quiet there.

## 3. Brief the run

One `general-purpose` subagent per run, in the background, with the run brief from `briefs.md`
filled in. The brief carries what `/tend` cannot know: the grant, the entry and its answer, the
review-handoff protocol, the commit-kind check, the constraints earlier runs already met, economy,
and the return shape. Keep its "known constraints" list current from the notes: a run that has to
rediscover a constraint spends a review round on it.

Never poll a run: no `sleep`, no reading its transcript, no status loops. You act when its handback
or completion notice arrives.

## 4. The review relay

A run hands back `REVIEW REQUEST:` with one line per reviewer: its agent type and the path of a prompt
it wrote (`reviews/<run>-<pause>-<agent>-prompt.md`). Then:

1. **Check the paths** in each prompt exist (`test -f`); fix a wrong one before forwarding.
2. **Spawn every reviewer of that pause in one message**, in the background, each with the short
   relay text from `briefs.md` ("Read and follow <path>…"). Pictures go to `ux-reviewer` and
   `steward`; the `auditor` takes the code and the diff. A screen change gets a `ux-reviewer` beside
   the auditor (decision 0145).
3. **Save each report** to `reviews/<run>-<agent>.md` as it arrives: the findings in substance
   (failing input, file and line, change, test name), the commands and counts, the verdict. A
   reviewer told to write its own file cannot, and says so.
4. **Wait for every reviewer of the pause**, then send the run one resume message (section 5).

Expect two pauses in a sweep (the lenses, then the diff) and one in an inbox build (the diff). The
diff review is one round (`/tend` section 10, step 2).

## 5. Rulings

The resume message gives the report paths and one ruling per finding, with a reason. Classification
follows `/tend` section 1; what is added here is learned:

- **Before ruling "edit X" or "cite Y", look.** Grep that a rule line exists before naming it as a
  `Source:`; read `FORBIDDEN` in `scripts/tend.js` before ruling an edit (it refuses specs, existing
  decision records, existing rule lines, `.claude/rules/ui-patterns.md`, skills and scripts). A
  ruling that cannot be carried out costs the run a detour.
- **Say which constraint wins** when two of yours could collide ("atlas tests unchanged" against a
  fix that would change one).
- **Give tripwires**: "if this changes any golden or differential result, stop and tell me"; "if
  the fix grows beyond these files, drop the commit and file the finding". A conditional ruling ("if
  `tend.js` allows it, else file it") is fine: the run checks.
- **When a reviewer says "the owner's call", first look for a shape inside the approved criteria.**
  Escalate only when none exists.
- **When a reviewer patches one example of a class, rule the fix for the class**, if it stays inside
  the approved scope.
- **A wrong loop commit on the unpushed run branch is dropped**, not patched inside the one round:
  rebuild the branch without it (cherry-pick, no shared history touched), correct every record line
  that claims it shipped, file the finding with the reviewer's analysis.
- **Settle by honest wording rather than new state** when the behaviour is acceptable.
- **Keep the inbox small:** an oddity of existing behaviour a reviewer mentions in passing goes to
  `docs/DEFERRED.md`, tagged, not to the inbox; a challenge to an owner's decision is recorded as a
  named departure (an added rule line), never a reopening entry.
- **For "nothing a person sees changes"**, ask the auditor for an old/new differential over real data
  (both trees' word lists, every diff printed, not a sample), and keep its scripts for the next run.
- **When a timed thing becomes persistent**, ask for a review of every way its subject can disappear:
  deleted, failed, stopped, navigated away.
- **Ask every reviewer for the tests that cannot fail.** Green checks hid a high and three mediums in
  one sweep; the hole was a test asserting a helper's return, not the end effect.

## 6. Main moves; runs run one at a time

The owner's other sessions push to `main` while runs work. Each run fetches and rebases at every
pause point (the brief says so), and STATUS, DEFERRED and the ledger follow `/tend` section 10.3.

- **One run at a time** by default: each run moves `main`, `lastT`, `lastG` and the ledger, and each
  rebase onto a moved `main` costs an export and the journeys again.
- **Two at once** only with `--parallel` and only when their areas share no files and waiting has a
  cost (a parked branch going stale). When one lands, send the other one line: "main moved to
  <sha>; lastT is now N". Two runs burn the usage limit twice as fast.

## 7. When a run completes

1. Verify cheaply: `git fetch origin main && git log --oneline <base>..origin/main`; the run's
   worktree is gone (`git worktree list`). Do not re-read its work.
2. Update the notes: the run's row, your rulings' outcomes, the friction it reports (new items only).
3. Tell the owner in a few lines: what landed (and the Pages run), what you answered and why, what
   needs them, with the one action named ("delete the remote branch X: the proxy refuses it").
4. Choose the next run (section 2), or stop (section 9).

## 8. When a run stops early

- **A usage limit or an API error** ends a subagent mid-step. Its worktree and commits survive.
  After the limit resets, resume **the same agent** with SendMessage: its last step, that background
  processes and exports are gone, and to check `git status` first. Never start a fresh agent over a
  live worktree.
- **A hard stop or "Stopped on"** is the run's to file (`/tend` section 7's parked path); the
  question arrives in the inbox and section 2 routes it.
- **A Pages run that never starts** is reported unconfirmed after 30 minutes; you check it once at
  the next run's start, not in a loop.

## 9. Close

Stop by section 0's rule, or at the cap. Then:

- Write `orchestration-insights.md` in the scratchpad from the notes: what the session did (one row a
  run), the rules learned (as rules), the problems met, the `/tend` friction (grouped, deduplicated,
  each a proposal), and any change to this skill the session suggests. Send it to the owner.
- Report: what landed, what waits on the owner (open entries, phone checks, "Open before the loop",
  remote branches to delete), and what the next session would run.

## Report

The owner's four answers; the runs (mode, result, commits, entries); the rulings that escalated and
the owner's answers; what waits on the owner; the path of the insights file.
