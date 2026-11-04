# 0081. `/fix` resolves one issue end to end in a worktree and deploys it; typing it is the grant

Date: 2026-11-04 · Status: accepted · Area: process, deploy · Relates to: 0074

## Context
`/deploy` and `/audit` run only when the owner asks. For a small bug the owner wants an agent to work alone from the issue to a live fix, choosing only how much testing it gets.

## Decision
- `/fix <issue>` works in a worktree of its own (`fix/<name>` from `origin/main`), deploys it. Only the owner can invoke it (`disable-model-invocation`).
- Typing `/fix` is the owner's ask to deploy that one issue to `main` (default `--deploy=main`, published with `git push origin fix/<name>:main`, since `main` is checked out elsewhere). `--deploy=branch` pushes the branch and stops; `--deploy=none` pushes nothing.
- Every run ends by removing its own worktree and local branch, after looking at what it holds and saving any unpushed work as a patch. A pushed review branch is kept on the remote; a merged or scrapped one is deleted there too.
- Flags: `--tests=none|lean|scoped|e2e|full` (default `scoped`; storage, recorder, walk screen and replay fixes rise to `e2e` unless the flag is given), `--review=none|self|adversarial` (default `adversarial`, the `auditor` subagent), `--loops=N` (default 2), `--deploy=branch|main|none` (default `main`).
- The agent stops and asks for the architectural cases in AGENTS.md, a derivation-rule bump, more than about 8 files, or anything that leaves the device.
- No force push, no history rewrite, no skipped or quarantined test. Accepted review findings must be fixed before the deploy.
- A red Pages run gets one fix-forward attempt at most; otherwise the agent reverts its commit on `main`, confirms the revert is green, then diagnoses on a branch without redeploying.

## Why
The hook and CI gate every push whatever the level, so the flags change the agent's own work, not the repo's floor. Auto-revert keeps `main` working when a granted deploy goes wrong.

## Consequences
- A `none` or `lean` fix can reach `main` with only the hook's and CI's gates; the report says what was not run.
- The grant covers one issue; anything else found goes to `docs/DEFERRED.md`.
