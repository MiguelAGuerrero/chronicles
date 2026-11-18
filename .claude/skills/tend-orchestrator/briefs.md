# Briefs for the tend orchestrator

Texts the orchestrator fills in and sends. `<…>` is filled; `[…]` is kept or dropped by mode.
`SCRATCH` is the session's scratchpad directory, written out in full in every brief. Everything else
is sent as it stands, never retyped or reworded (decision 0181): a brief is this template plus the
run's specifics. A change every run needs is made here, by the owner's yes, not in one brief.

## The run brief

```
You are running one execution of this repository's `/tend` skill on behalf of the repository
owner, in <repo path>. Read `AGENTS.md`, `.claude/skills/tend/SKILL.md` and
`.claude/skills/ship.md` first, from your worktree (cut from origin/main; the primary checkout may
be stale), and follow them exactly. The skills disable model invocation: carry them out yourself
(and `slice`, `vision`, where they are called).

The run: `/tend <mode and answers>` --deploy=<main|branch>.
[The answers are the proxy's under the owner's delegation (decision 0157), <date>: write them so in
every record, entry removal and run-log line ("the proxy's yes under 0157, <date>"), never "the
owner's". | The owner answered <entry> personally.]
The owner has authorised <a fast-forward push of this run's work to main, ship.md "Publish to
main" | pushing the run's branch only>. Push nowhere else, except the branches ship.md and /tend
section 7 name (`slice/<slug>-parked`, `<branch>-retry`, a review branch).

[Inbox: <entry> as STATUS holds it: "<title>". Say it back as main holds it, then build its
recommended shape: <the shape>. One build per run: <later yeses> wait, noted.]
[Sweep: `/tend` with no area; run `node scripts/tend.js next` yourself.]
Tripwires: <"more than about 8 source files (tests, journeys and record documents apart; in your
worktree, `npm run book:files -- HEAD --max-src 8`), a dependency or a change elsewhere: stop and file it" |
"any golden or differential result beyond <list> moves: stop and tell me">.

Review handoff. You have no Agent tool and never review your own work in place of a reviewer.
Review points: <a sweep: after the lenses, then after the diff | a T build: after the diff |
a G build: after the plan (steward), then after the diff>. At each, fetch and rebase first, then
write each reviewer's complete,
self-contained prompt (absolute paths that exist; at the diff pause the after pictures for every
reviewer of a screen, each changed state at 320 px and at 390 where width matters, a before picture
only when the change cannot be judged without one; your own judgment calls for it to rule on) to
SCRATCH/reviews/<your branch>-<pause>-<agent>-prompt.md. Then give your hand-back (your final
report, through the hand-back tool you have) as `REVIEW REQUEST:` (agent type and prompt path, one
per line) and `RESUME WITH: …`, and end your turn: never wait on a file, never ask me mid-run.
Leave the worktree in place; I resume you with the findings. In each prompt name every surface that
shows what you changed (grep the source and every consumer), and for a marker or a line the
degenerate geometries (coincident, overlapping, a loop's start on its end, off-screen), pictured.
Reviewers by risk (ship.md, "The faster lane"): words or style only, one (the `ux-reviewer`, or the
`steward` for the replay's or a VISION line's words); behaviour that touches recording, storage,
navigation, timing or data, the `auditor` always, with the `ux-reviewer` when a screen changed;
records only, none[, and a `steward`: this yes was the proxy's (0157)]. One review round for the
diff; medium and above are fixed, lows filed `[loop]` in their area's DEFERRED section, except a
regression your own change caused, fixed in the run at any severity. For "nothing
a person sees changes", write the old/new differential as a `*.test.ts` in SCRATCH for the auditor to
run (it cannot run scripts).

Tests and journeys: test-first for logic, each unit test seen failing with its wiring reverted; a
words-only change, one unit test of the words seen failing. Before publishing, run the journeys
holding a new or changed check, plus `launch`; the rest of `check:affected`'s set waits for CI and
the weekly full pass[; this run is the full pass: `npm run e2e:all` (every journey once) before
publishing, logged as `"e2e":"full"`] (`/tend` section 10). Log the journeys you ran in the run
log's `e2e`.

The check for your commits: <sweep or T build: `npm run check:tend -- origin/main..HEAD` |
G build: `node scripts/tend.js commits --loop-only origin/main..HEAD`; slice commits named the
slice's way; only the final `tend <area>: the run's record` commit, holding STATUS, DEFERRED, the
ledger and runs.jsonl alone, is named `tend`>. STATUS, DEFERRED and NATIVE_UNVERIFIED change only
through `npm run records -- <op>` (decision 0156; ship.md, "The record documents"): each record
commit carries the lines `npm run records -- trailers` prints and the sidecar the operations staged,
an entry the run did not file leaves or changes only with `--reason` (two per section per commit),
and `npm run check:records -- origin/main` passes before you publish: CI replays every loop
commit's trailers and fails any other change.

Known constraints (do not rediscover them):
- read FORBIDDEN in scripts/tend.js before editing anything outside src/ and the journeys;
- check:tend wants a named test for any src/ change, comments included;
- the bookkeeping commands run in your worktree (cut from origin/main, it holds the script):
- audit numbers, in your worktree: `npm run book:next-audit -- "tend <area>"`, never by hand; you number,
  the reviewers do not;
- a decision record, in your worktree: `npm run book:next-decision -- --check <NNNN> <file>` after the
  last fetch, and again after a refused push;
- the size tripwire, in your worktree: `npm run book:files -- HEAD --max-src 8` before each commit (its
  source files, untracked counted); `npm run book:files` for the run's whole change;
- DEFERRED and inbox matches, in your worktree: `npm run book:items -- deferred|inbox|open` (your own
  copy once an operation changed it), pasted from its `shell:` line, never shortened by hand;
- your review prompts, in your worktree: `npm run book:review-paths -- <prompt>...` before handing back;
- the largest text size cannot be pictured on web: a [phone] entry;
- the balance reads <reading>: <no G entry | …>;
- grep a rule line before citing it as a Source;
- every T and G entry carries a `Precedent:` line beside "Recommended" (decision 0193): how 2-3 adjacent
  apps do the job, from docs/research/adjacent-apps.md, verified or not, or "none found"; one the file
  lacks goes in the entry with its source, marked "not yet recorded" (the loop never edits docs/research/);
- the session's proxy refuses remote branch deletion: report leftovers, never push your run
  branch by name except as above[;
- <a constraint the notes learned since this template last changed>].

Main moves under you: fetch at each pause and before publishing; if it moved, rebase; rerun the
journeys only if the new commits touch files they cover, else typecheck, lint and npm test, and
say which. A source conflict is ship.md's stop; STATUS, DEFERRED and the ledger follow 10.3.

A red check: confirm it red at rest, k of n, on main's own export before calling it yours or main's;
a red that comes and goes with load is a check race until shown otherwise; bisect only with both ends
confirmed.[ The owner's answers to record in this run's decision: SCRATCH/owner-answers.md, <entries>.]

Economy: commit as soon as each piece works; export once per pause after the last code change.
A usage limit or a restart saves your work: stop, say so in one line, and you will be resumed.

Never use AskUserQuestion. Commit trailers: <the session's attribution lines>. No model name
anywhere else in the repo. Temp files in SCRATCH. node_modules: `cp -al` from the primary if it
has them and the lockfile matches, else `npm ci`; then `node scripts/copy-maplibre-worker.js`; use
the worktree's `node_modules/.bin/tsx`. Playwright: NODE_PATH=$(npm root -g). Pages: load
mcp__github__actions_list and mcp__github__actions_get with ToolSearch; report a run that has not
started 30 minutes after the push as unconfirmed. Clean up as ship.md "Clean up" says.

Return, concisely: 1. the Report and the result block; 2. the commits on main, the head sha you
pushed, Pages and the live check; 3. every entry filed, in full, its `Precedent:` line included; 4. new skill friction, facts only, editing no skill.
```

## The reviewer relay

```
Read <prompt path> and do exactly what it asks, report-only: edit nothing. You cannot write files,
so return the full report as your answer. [Also judge <the orchestrator's own question>.]
Every finding titled "<agent> N" (auditor 1, ux 1, steward 1: the run numbers the audits) with a
failing input or a file and line, its severity, the fix and a test name[ (auditor: also the tests that cannot fail) | (steward: each finding with the lines
it quotes, and your Silent questions verbatim)]; the commands you ran with their counts; a verdict.
```

## The resume

```
The reviews are back; read them: <agent>: SCRATCH/reviews/<branch>-<pause>-<agent>.md (<verdict>).
My rulings:
- <id> accept as `<scope> audit N`: <the shape>. <Tripwire.>
- <id> defer: file it as [<tag>] <severity> in DEFERRED's <section> (`npm run records -- deferred item add`);
  every low is deferred as `[loop]` (0181).
- <id> reject: <the rule or call it rests on>.
- <id> to the owner: file it as a T entry (<why: 0157's class>).
Review counts for the log: accepted <n>, deferred <n>, rejected <n>. One round.
Then: rerun only the journeys the fixes touch, the record, fetch and rebase (10.3), publish, Pages,
the live check, cleanup, and the final report in the shape I asked for.
```

## The resume after a stop

```
You were stopped by <a usage limit | an API error>; it has reset. Your worktree is intact
(HEAD <sha>, <uncommitted state>). Your last step was "<step>". The worker restarted, so background
processes and exports are gone: check `git status --short -uall` and `git log --oneline
origin/main..HEAD`, then
carry on from there with the rulings you have.
```

## The non-loop run

For an owner's yes the loop cannot build (orchestrator section 2.3): a rule file split, a rule line
reworded, a VISION edit, a decision superseded.

```
You make one change to this repository at the owner's request, in <repo path>; you are not a /tend
run, and check:tend does not apply to your commits. Read `AGENTS.md` and, from your worktree (cut
from origin/main), the files you change, whole.
The owner's answer, verbatim, <date>: "<answer>" to <entry>, as STATUS holds it: "<title>".
The job: <the shape, exactly>. Nothing else: no rewording beyond it, no fix on the way (file it).
[A decision record for the call: number it in your worktree with `npm run book:next-decision -- --check <NNNN>
<file>` after the last fetch.] The entry leaves the inbox with `npm run records -- inbox remove <id> --reason
"the owner's yes, <date>"`; ship.md "The record documents" holds.
Checks: `npm run check:docs`[, typecheck, lint, npm test when a test or code moves]. Commit on your
branch and push nothing: I read the diff and land it. Commit trailers: <the session's attribution
lines>. Never use AskUserQuestion. Return: the commits, the checks with their counts, and anything
you were unsure of.
```
