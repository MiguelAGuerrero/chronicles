---
name: fix
description: Resolve one issue end to end in its own git worktree - reproduce, root-cause, minimal fix, verify at the test level the owner chose, review (adversarial by default, looped), commit, deploy to main and check the live build (reverting if red), then clean the worktree up. Invoking it is the owner's go-ahead to deploy (decision 0081); --deploy=branch stops at a pushed branch instead.
when_to_use: The owner types /fix with an issue (a bug, a regression, a small polish). Not for a new feature or anything bigger than a local fix - that is /slice.
argument-hint: <issue> [--tests=none|lean|scoped|e2e|full] [--review=none|self|adversarial] [--loops=N] [--deploy=main|branch|none]
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill, AskUserQuestion, EnterWorktree, ExitWorktree, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
---

# Fix: $ARGUMENTS

`/fix` works in a worktree of its own and, by default, deploys the fix to
`main`. Typing `/fix` is the owner's go-ahead to deploy this one issue
(decision 0081); `--deploy=branch` or `--deploy=none` withholds it. The grant
does not cover a second issue found on the way (record it in `docs/DEFERRED.md`), a
force push, or any "Hard stops" below.

**Do not stop to ask before pushing.** Running `/fix` is the authorization for
every push this skill describes: the fix branch, `main` (the default), and a
revert on a red run (the shared steps are in `.claude/skills/ship.md`; the map of the skills is `.claude/skills/README.md`). The general rule against pushing without being asked is
satisfied by the owner having typed `/fix`. The only reasons to stop short of
the push are the "Hard stops", a failed gate, open accepted findings, a
rebase conflict, or `--deploy=branch|none`; say which one if you stop.

## Flags (parse them out of the arguments; the rest is the issue)

| Flag | Values | Default |
|---|---|---|
| `--tests` | `none`, `lean`, `scoped`, `e2e`, `full` | `scoped` |
| `--review` | `none`, `self`, `adversarial` | `adversarial` |
| `--loops` | 0-4: review-and-fix rounds after the first pass | `2` |
| `--deploy` | `main` (merge to `main`, check Pages, revert if red), `branch` (push the fix branch and stop), `none` (commit locally, push nothing) | `main` |

Echo the resolved flags in your first line so the owner can see what ran.

### Test levels

The Stop hook and CI gate the repo whatever the level, so "less testing" means
less work from you, not fewer gates: the hook runs typecheck, the layer check,
the affected unit tests and `check:docs`; CI runs docs, typecheck, `npm test`
and lint before Pages deploys.

| Level | You run | New test |
|---|---|---|
| `none` | nothing beyond the hook's gates; the owner verifies by hand | none |
| `lean` | `npm run typecheck`, `npm run lint:affected` | only if the bug is in a core module (cheap, pure) |
| `scoped` | `npm run check:affected` (layers, affected tests, typecheck, lint) | a failing-first regression test, in the feature's folder (`src/lib/__tests__/<feature>/`) |
| `e2e` | `scoped`, then `npm test`, then each journey `check:affected` names, against the sub-path build as in `/deploy` | regression test, plus a journey step if a screen changed |
| `full` | `e2e`, then the full e2e flow (no `E2E_ONLY`) | as `e2e` |

If the owner gave no `--tests` and the fix touches storage, the recorder,
the walk screen or the replay, say that `scoped` is a thin bar there and
raise the level to `e2e`. An explicit `--tests` always wins.

## 0. Open the worktree

Follow `.claude/skills/ship.md`, "Open the worktree", with the branch
`fix/<short-name>`. Never work in the primary checkout and never on `main`.

## 1. Understand and reproduce

1. Read `docs/STATUS.md` and the `.claude/rules/<area>.md` files that cover the
   files you expect to touch.
2. Reproduce the issue: a failing test (`scoped` and up), a script, or the
   headless web build in a browser. If it cannot be reproduced, say what you
   tried and scrap the run (section 9); do not fix a guess.
3. Name the root cause in one sentence before editing. A fix that hides the
   symptom (a guard, a retry, a try/catch) is not the root cause.

## 2. Size check - hard stops

Stop before editing, report, and ask with AskUserQuestion (recommended option
first) on any of `.claude/skills/ship.md`, "Hard stops" (architecture, a
derivation rule, data off the device, more than about 8 files or a new
feature's worth of behaviour: that is `/slice`), and on:

- a fix that adds a control or changes what a screen shows or says, when `/vision`
  on it says **out** or **aligned if reshaped** and the issue asked for the
  unreshaped version (decision 0094). Run `/vision` on any such fix first; a
  reshaped version the issue allows is the fix.

While the question is open the worktree stays; if the answer is no, scrap it.

## 3. Fix

1. The minimal change that removes the root cause. Respect the functional-core
   layering (`.claude/rules/functional-core.md`): decisions in core, effects in
   a shell. No refactors, no drive-by cleanups.
2. Native code touched: add an item for it to `docs/NATIVE_UNVERIFIED.md`, the
   device acceptance suite (`- [ ] **Do:** … **Expect:** …`), and say in the
   report that it has never run on a device.
3. The regression test (per the level) fails before the fix and passes after.
   Never skip, loosen or quarantine a test to get green.

## 4. Verify

Run the level's commands from the table. A failure is fixed at its cause.
If the same check fails three times in a row, stop, report, and scrap the run;
do not keep trying variations.

## 5. Review and loop

- `none`: skip.
- `self`: re-read your own diff against the covering rule files and the
  AGENTS.md invariants (truth vs cache, raw fixes, nothing is a score, local
  only); run `/simplify` on it.
- `adversarial`: `.claude/skills/ship.md`, "Review". The auditor has no spec
  for a fix, so give it the issue, the root cause, the diff and the rule
  files. Regression tests are named `fix <name> audit N`; the round limit is
  `--loops`.

Whatever the mode, each round is: review, fix what was accepted, re-run the
level's verify. Stop at `--loops` rounds or at the first round with no new
accepted finding. If the limit is reached with accepted findings still open,
do not deploy: push the branch so the owner can look, and list the open
findings in the report.

## 6. Docs

- `npm run check:docs` must pass (the hook and CI require it).
- Run `/docs-gc` only if behaviour, a rule or a file location changed. A fix
  that changes how something works updates the rule file or `docs/ARCHITECTURE.md`
  in the same commit, and `docs/STATUS.md` if a slice's state moved.
- A fix that settles a trap goes in `.claude/rules/<area>.md`.

## 7. Commit and push the branch

1. Commit with a message that names the issue and the tests that cover it, ending
   with the attribution lines the session gives.
2. `--deploy=none`: stop here; the commit exists only in the worktree, so save
   it as a patch before cleanup (section 9) and say where.
3. `--deploy=branch`: `git push -u origin fix/<short-name>` (retry network
   failures up to four times with backoff). Stop. Do not open a pull request
   unless the owner asked. Go to section 9.
4. `--deploy=main` (the default): go on to section 8.

## 8. Deploy to main (the default)

`.claude/skills/ship.md`, "Publish to main", from `fix/<short-name>`, without
asking again: the rebase, the one fast-forward push, the Pages run, the live
check of the fix's visible effect, and on a red run one fix-forward at most,
else the revert and a diagnosis on `fix/<short-name>-retry`.

## 9. Clean up the worktree

Every run ends with `.claude/skills/ship.md`, "Clean up", whatever happened.
`--deploy=branch` is "pushed for review"; `--deploy=none` is "nothing pushed
by choice".

## Report

Resolved flags; the root cause in one sentence; the files changed; what each
verify step ran and its result; review findings with their triage; the branch
pushed (and how to resume it) or the commit, Pages run and live check if
deployed; any patch saved; what cleanup removed and what it kept; anything
deferred or unverified on native. State plainly what was not run because of the
chosen level.
End with the result block (`.claude/skills/ship.md`).
