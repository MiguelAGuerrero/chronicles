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
revert on a red run. The general rule against pushing without being asked is
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

1. `git worktree prune`, then `git worktree list`. Report any other `fix/*`
   worktree you find (a dead run's leftover); do not remove it.
2. Create the worktree and its branch `fix/<short-name>` from `origin/main`
   with `EnterWorktree`, or `git worktree add .claude/worktrees/fix-<short-name>
   -b fix/<short-name> origin/main`. Never work in the primary checkout and
   never on `main`.
3. Note the worktree path and branch: they are the only things this run may
   remove at the end.
4. A new worktree has no `node_modules`, and the Stop hook skips the typecheck
   without one. Give it a real directory, never a symlink: Metro bakes a
   symlinked package's absolute path into the web build's asset URLs
   (`/chronicles/assets/______home/...`), so the icon font and the map's
   assets 404 and the e2e fails in ways that look like the app's bugs (the
   walker never shows, a long press reads "1995.8 km away"; fix ios-video,
   Nov 5). Either:
   - `cp -al <primary>/node_modules node_modules`: a hard-linked copy, about
     a second, no extra disk. Only when the branch's `package-lock.json`
     matches what the primary checkout installed
     (`git diff --quiet <primary's HEAD> -- package-lock.json`); or
   - `npm ci`: about 20 s, always right, and the only choice when the lock differs.

   It is gitignored; never commit it.

   A new worktree also lacks the map's worker file (`public/maplibre-gl-worker.mjs`, copied by `npm ci`'s postinstall and gitignored):
   without it the web map never loads and the e2e dies at `window.__project is not a function`. Run
   `node scripts/copy-maplibre-worker.js` in the worktree.

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
first) when the fix needs any of:

- a new dependency, a data-model or migration change, a navigation-flow change,
  a platform-strategy change (the AGENTS.md "ask before architectural decisions");
- a change to derivation rules (`SNAP_RULES`, `STREET_CODE`, `LANDING_CODE`);
- more than about 8 files or a new feature's worth of behaviour: use `/slice`;
- anything that sends data off the device;
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
- `adversarial`: spawn the `auditor` subagent. It has no spec for a fix, so
  give it the issue, the root cause, the diff and the rule files, and ask it to
  break the fix: inputs that still fail, neighbours the change could regress,
  the web/native split. Triage each finding accept, defer or reject with a
  reason (as `/audit` does); an accepted one gets a regression test named
  `fix <name> audit N` before its fix. Architectural findings are a hard stop.

Each round is: review, fix what was accepted, re-run the level's verify. Stop
at `--loops` rounds or at the first round with no new accepted finding. If the
cap is reached with accepted findings still open, do not deploy: push the
branch so the owner can look, and list the open findings in the report.

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

Follow `/deploy` steps 1-3 without asking again, with these limits:

- the worktree has only this fix's changes;
- `git fetch origin main`; if `main` moved, rebase the branch, re-run the
  level's verify, and only then continue; on a conflict, stop and keep the branch;
- `main` is checked out elsewhere, so publish with
  `git push origin fix/<short-name>:main` (a fast-forward; no force, no history
  rewrite, no empty commits), once;
- watch the Pages run with the GitHub MCP tools until it completes.

Then:

- Green run: load https://miguelaguerrero.github.io/chronicles/ (Playwright is
  installed) and check the fix's visible effect. If the page cannot be reached
  from the session, say the live check was not done.
- Red run: one fix-forward attempt following `/deploy` section 4, only when
  the log names a cause the fix plainly owns. Otherwise, or if that run is also
  red, or the live site is broken: `git revert` the fix commit in the worktree,
  push it to `main` the same way (the revert is covered by the grant), and
  confirm the Pages run for the revert is green. Never leave `main` red, and
  never revert past the commit before yours.
- After a revert, diagnose: reproduce the failure locally with the same
  command as the job, name the cause, and put a corrected fix on a new branch
  `fix/<short-name>-retry` with the failing check passing. Push that branch,
  not `main`; the grant is spent. Report the cause, the branch, and what you
  would change.

## 9. Clean up the worktree

Every run ends here, whatever happened. Remove only the worktree and branches
this run created (section 0).

1. Look first: `git -C <worktree> status --short` and
   `git -C <worktree> log --oneline origin/main..HEAD`.
2. Anything unpushed or uncommitted that is worth keeping: save it as a patch
   (`git -C <worktree> diff HEAD > <scratchpad>/fix-<short-name>.patch`, plus
   `git format-patch` for commits) before removing, and name the patch in the
   report. Never remove a worktree holding work that is neither pushed nor saved.
3. Leave the worktree directory first (`ExitWorktree`, or `cd` to the primary
   checkout), then `git worktree remove <path>`. Use `--force` only after step 2
   saved what mattered (removing a hard-linked or `npm ci` copy of
   `node_modules` does not touch the primary's).
4. By outcome:

| Outcome | Local branch | Remote branch |
|---|---|---|
| Pushed with `--deploy=branch` (or deployed work parked by an open finding) | delete (it lives on the remote; `git fetch origin fix/<name>` brings it back) | keep: it is what the owner reviews |
| Deployed, Pages green, live check done | delete | delete (`git push origin --delete fix/<name>`): it is merged and carries nothing |
| Reverted, diagnosis pushed | delete | keep `fix/<name>-retry`; delete `fix/<name>` |
| Scrapped (cannot reproduce, hard stop declined, three failures, conflict) | delete | delete if you had pushed it, after saving any patch |
| `--deploy=none` | delete after the patch is saved | none |

5. `git worktree prune`, then `git worktree list` to confirm nothing of this
   run remains, and `git branch --list 'fix/*'` the same. If a removal failed,
   say what is left and its path.

## Report

Resolved flags; the root cause in one sentence; the files changed; what each
verify step ran and its result; review findings with their triage; the branch
pushed (and how to resume it) or the commit, Pages run and live check if
deployed; any patch saved; what cleanup removed and what it kept; anything
deferred or unverified on native. State plainly what was not run because of the
chosen level.
