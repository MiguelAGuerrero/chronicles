---
name: fix
description: Resolve one issue end to end without further approval - reproduce, root-cause, minimal fix, verify at the test level the owner chose, review (self or adversarial, looped), commit, deploy to main, and check the live build. Invoking it is the owner's go-ahead to deploy (decision 0081). Flags set the test level, review depth, loop cap and deploy target.
when_to_use: The owner types /fix with an issue (a bug, a regression, a small polish). Not for a new feature or anything bigger than a local fix - that is /slice.
argument-hint: <issue> [--tests=none|lean|scoped|e2e|full] [--review=none|self|adversarial] [--loops=N] [--deploy=main|none]
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, Skill, AskUserQuestion, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
---

# Fix: $ARGUMENTS

Typing `/fix` is the owner's go-ahead to deploy this change to `main`
(decision 0081). That grant covers this one issue only. It does not cover a
second issue found on the way (record it in `docs/DEFERRED.md`), a force push,
or any "Hard stops" below.

## Flags (parse them out of the arguments; the rest is the issue)

| Flag | Values | Default |
|---|---|---|
| `--tests` | `none`, `lean`, `scoped`, `e2e`, `full` | `scoped` |
| `--review` | `none`, `self`, `adversarial` | `adversarial` |
| `--loops` | 0-4: review-and-fix rounds after the first pass | `2` |
| `--deploy` | `main` (push and check Pages), `none` (stop with the commit ready) | `main` |

Echo the resolved flags in your first line so the owner can see what ran.

### Test levels

The Stop hook and CI gate the repo whatever the level, so "less testing" means
less work from you, not fewer gates: the hook runs typecheck, the layer check,
the affected unit tests and `check:docs`; CI runs docs, typecheck, `npm test`
and lint before Pages deploys.

| Level | You run | New test |
|---|---|---|
| `none` | nothing beyond the hook's gates; the owner verifies by hand on the live build | none |
| `lean` | `npm run typecheck`, `npm run lint:affected` | only if the bug is in a core module (cheap, pure) |
| `scoped` | `npm run check:affected` (layers, affected tests, typecheck, lint) | a failing-first regression test |
| `e2e` | `scoped`, then `npm test`, then each journey `check:affected` names, against the sub-path build as in `/deploy` | regression test, plus a journey step if a screen changed |
| `full` | `e2e`, then the full e2e flow (no `E2E_ONLY`) | as `e2e` |

If the owner gave no `--tests` and the fix touches storage, the recorder,
the walk screen or the replay, say that `scoped` is a thin bar there and
raise the level to `e2e`. An explicit `--tests` always wins.

## 1. Understand and reproduce

1. Read `docs/STATUS.md` and the `.claude/rules/<area>.md` files that cover the
   files you expect to touch.
2. Reproduce the issue: a failing test (`scoped` and up), a script, or the
   headless web build in a browser. If it cannot be reproduced, say what you
   tried and stop; do not fix a guess.
3. Name the root cause in one sentence before editing. A fix that hides the
   symptom (a guard, a retry, a try/catch) is not the root cause.

## 2. Size check - hard stops

Stop before editing, report, and ask with AskUserQuestion (recommended option
first) when the fix needs any of:

- a new dependency, a data-model or migration change, a navigation-flow change,
  a platform-strategy change (the AGENTS.md "ask before architectural decisions");
- a change to derivation rules (`SNAP_RULES`, `STREET_CODE`, `LANDING_CODE`);
- more than about 8 files or a new feature's worth of behaviour: use `/slice`;
- anything that sends data off the device.

## 3. Fix

1. Work on a branch (`fix/<short-name>`), never on `main`.
2. The minimal change that removes the root cause. Respect the functional-core
   layering (`.claude/rules/functional-core.md`): decisions in core, effects in
   a shell. No refactors, no drive-by cleanups.
3. Native code touched: add it to `docs/NATIVE_UNVERIFIED.md` and say in the
   report that it has never run on a device.
4. The regression test (per the level) fails before the fix and passes after.
   Never skip, loosen or quarantine a test to get green.

## 4. Verify

Run the level's commands from the table. A failure is fixed at its cause.
If the same check fails three times in a row, stop and report; do not keep
trying variations.

## 5. Review and loop

- `none`: skip.
- `self`: re-read your own diff against the covering rule files and the
  AGENTS.md invariants (truth vs cache, raw fixes, nothing is a score, local
  only); run `/simplify` on it.
- `adversarial`: spawn the `auditor` subagent. It has no spec for a fix, so
  give it the issue, the root cause, the diff and the rule files, and ask it to
  break the fix: inputs that still fail, neighbours the change could regress,
  the web/native split. Triage each finding accept, defer or reject with a
  reason (as `/audit` does); an accepted one gets a regression test named
  `fix <name> audit N` before its fix. Architectural findings are a hard stop.

Each round is: review, fix what was accepted, re-run the level's verify. Stop
at `--loops` rounds or at the first round with no new accepted finding. If the
cap is reached with accepted findings still open, do not deploy; report them.

## 6. Docs

- `npm run check:docs` must pass (the hook and CI require it).
- Run `/docs-gc` only if behaviour, a rule or a file location changed. A fix
  that changes how something works updates the rule file or `docs/ARCHITECTURE.md`
  in the same commit, and `docs/STATUS.md` if a slice's state moved.
- A fix that settles a trap goes in `.claude/rules/<area>.md`.

## 7. Commit and deploy

1. Commit with a message that names the issue and the tests that cover it, ending
   with the attribution lines the session gives.
2. `--deploy=none`: stop here and report the commit.
3. `--deploy=main`: follow `/deploy` steps 1-3 without asking again, with these
   limits:
   - the tree has only this fix's changes;
   - `git fetch origin main`; if `main` moved, rebase the branch, re-run the
     level's verify, and only then `git merge --ff-only`; on a conflict, stop;
   - push `main` once; no force push, no history rewrite, no empty commits;
   - watch the Pages run with the GitHub MCP tools until it completes.

## 8. After the push

- Green run: load https://miguelaguerrero.github.io/chronicles/ (Playwright is
  installed) and check the fix's visible effect. If the page cannot be reached
  from the session, say the live check was not done.
- Red run: one fix-forward attempt following `/deploy` section 4, only when
  the log names a cause the fix plainly owns. Otherwise, or if that run is also
  red, or the live site is broken: `git revert` the fix commit, push `main`
  (the revert is covered by the grant), and confirm the Pages run for the
  revert is green. Never leave `main` red, and never revert past the commit
  before yours.
- After a revert, diagnose: reproduce the failure locally with the same
  command as the job, name the cause, and put a corrected fix on a new branch
  with the failing check passing. Do not push it to `main`; the grant is spent.
  Report the cause, the branch, and what you would change.

## Report

Resolved flags; the root cause in one sentence; the files changed; what each
verify step ran and its result; review findings with their triage; the commit,
the Pages run and the live check; anything deferred or unverified on native.
State plainly what was not run because of the chosen level.
