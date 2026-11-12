# Briefs for the tend orchestrator

Texts the orchestrator fills in and sends. `<…>` is filled; `[…]` is kept or dropped by mode.
`SCRATCH` is the session's scratchpad directory, written out in full in every brief.

## The run brief

```
You are running one execution of this repository's `/tend` skill on behalf of the repository
owner, in <repo path>. Read `AGENTS.md`, `.claude/skills/tend/SKILL.md` and
`.claude/skills/ship.md` first and follow them exactly. The skills disable model invocation:
carry them out yourself (and `slice`, `vision`, where they are called).

The run: `/tend <mode and answers>` --deploy=<main|branch>. [The answers come from the
orchestrator, who holds the owner's delegated authority. | The owner answered <entry> personally.]
The owner has explicitly authorised <a fast-forward push of this run's work to main, ship.md
"Publish to main" | pushing the run's branch only>. Push nowhere else.

[Inbox: <entry> as STATUS holds it: "<title>". Say it back as main holds it, then build its
recommended shape: <the shape, concretely>. One build per run: <later yeses> wait, noted.]
[Sweep: `node scripts/tend.js next` names <area>.]
Tripwires: <"if it needs more than ~8 files, a dependency or a change elsewhere, stop and file it"
| "if any golden or differential result moves beyond <list>, stop and tell me">.

Review handoff. You have no Agent tool and never review your own work in place of a reviewer.
At each review point (a sweep: after the lenses, then after the diff; a build: after the diff),
write each reviewer's complete, self-contained prompt, with absolute paths that exist and your own
judgment calls for it to rule on, to SCRATCH/reviews/<run>-<pause>-<agent>-prompt.md. End your
turn with `REVIEW REQUEST:` (agent type and prompt path, one per line) and `RESUME WITH: …`.
Leave the worktree in place. A screen change gets a `ux-reviewer` beside the `auditor`
(decision 0145). I send findings as report paths plus rulings; one review round for the diff.

The check for your commits: <sweep or T build: `npm run check:tend -- origin/main..HEAD` |
G build: `node scripts/tend.js commits --loop-only origin/main..HEAD`; slice commits are named the
slice's way, only the final record commit `tend <area>: the run's record`, holding STATUS,
DEFERRED, the ledger and runs.jsonl alone>.

Known constraints (do not rediscover them): <from the notes, e.g.
- scripts/tend.js FORBIDDEN refuses: skills, scripts, specs, existing decision records, existing
  rule lines, .claude/rules/ui-patterns.md; you may add lines to other rule files;
- check:tend wants a named test for any src/ change, comments included;
- audit numbering is not per run: number on from the highest on main;
- the largest text size cannot be pictured on web: a [phone] entry;
- the balance reads <reading>: <no G entry | …>;
- grep a rule line before citing it as a Source;
- the session's proxy refuses remote branch deletion: never push your run branch by name.>

Main moves under you: fetch at each pause and before publishing; if it moved, rebase; rerun the
journeys only if the new commits touch files they cover, else typecheck, lint and npm test, and
say which. A source conflict is ship.md's stop; STATUS, DEFERRED and the ledger follow 10.3.

Economy: commit as soon as each piece works; export once per pause after the last code change.
A usage limit saves your work; you will be resumed.

Never use AskUserQuestion. Commit trailers: <the session's attribution lines>. No model name
anywhere else in the repo. Temp files in SCRATCH. node_modules: `cp -al` from the primary if the
lockfile matches, else `npm ci`; then `node scripts/copy-maplibre-worker.js`; use the worktree's
`node_modules/.bin/tsx`. Playwright: NODE_PATH=$(npm root -g). Pages: load
mcp__github__actions_list and mcp__github__actions_get with ToolSearch; report a run that has not
started 30 minutes after the push as unconfirmed. `git worktree remove --force` only once status
is clean and nothing is unpushed.

Return, concisely: 1. the Report and the result block; 2. the commits on main, Pages and the live
check; 3. every entry filed, in full; 4. new skill friction, facts only, editing no skill.
```

## The reviewer relay

```
Read <prompt path> and do exactly what it asks: report-only, edit nothing in the worktree, scratch
work only under SCRATCH/<run>/review/. [Also judge <the orchestrator's own question>.] Return
the full report as your answer (you cannot write files): every finding with a failing input or a
file and line, its severity, the fix and a test name `<scope> audit N`; the commands you ran with
their counts; the tests that cannot fail; a verdict.
```

## The resume

```
The reviews are back; read them: <agent>: SCRATCH/reviews/<run>-<agent>.md (<one-line verdict>).
My rulings:
- <id> accept as `<scope> audit N`: <the shape>. <Tripwire.>
- <id> defer: file it as [<tag>] <severity> in DEFERRED's <section>.
- <id> reject: <the rule or call it rests on>.
Review counts for the log: accepted <n>, deferred <n>, rejected <n>. One round.
Then: rerun only the journeys the fixes touch, the record, fetch and rebase (10.3), publish, Pages,
the live check, cleanup, and the final report in the shape I asked for.
```

## The resume after a stop

```
You were stopped by <a usage limit | an API error>; it has reset. Your worktree is intact
(HEAD <sha>, <uncommitted state>). Your last step was "<step>". The worker restarted, so background
processes and exports are gone: check `git status` and `git log --oneline origin/main..HEAD`, then
carry on from there with the rulings you have.
```
