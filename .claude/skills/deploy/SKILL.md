---
name: deploy
description: Deploy the web build to GitHub Pages by pushing main (the only branch Pages accepts) - the ready branches ship together as one train (decision 0125) that runs typecheck, lint, the unit tests and the union of their e2e journeys once on one build and sends each failure back to its branch; STATUS.md updated (the full e2e and an audit only if the owner asked); then check the Pages run with the GitHub MCP tools. Use only when the owner asks to deploy, ship or release.
when_to_use: The owner says deploy, ship, release, publish, or merge to main.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs, mcp__claude-code-remote__list_sessions, mcp__claude-code-remote__get_session, mcp__claude-code-remote__send_message
---

# Deploy

`/fix` (decision 0081) deploys itself from its worktree, a train of one; typing it is the owner's go-ahead.

A push to `main` runs `.github/workflows/pages.yml`: `npm ci`, `check:docs`,
typecheck, `npm test`, lint, `expo export --platform web` with `CHRONICLES_BASE_URL=/chronicles`
(which `app.config.js` turns into `experiments.baseUrl`), `dist/index.html`
copied to `404.html` (Pages has no app-route fallback; a reload on
`/chronicles/walk` must resume the walk), then GitHub Pages at
https://miguelaguerrero.github.io/chronicles/.

## The owner's rules

- `main` is the only branch the Pages environment accepts.
- Merge to `main` only when typecheck, lint, `npm test` and the e2e journeys
  of what ships pass together, on the merged tree: the train (decision 0125).
  The full e2e and `/audit` run only when the owner asks (decision 0074); if
  they ran, their fixes must pass too.
- Never add a server, an account, or anything that leaves the device.

## 1. Preconditions, per branch that ships

The branches that ship are the ones marked ready (decision 0126: a slice ends
with `npm run ready`, which commits `.ready/<branch>.json`; a commit after it
makes it stale). See them, local and on origin, whichever copy is ahead:

```bash
npm run e2e:train -- --list      # every candidate: ready, stale (commits after its marker), diverged, not marked
```

Ship every ready branch in one train rather than one deploy each. A branch the
owner names by hand can ride too; the report says it was not marked. Ask the
owner only when the list and their words disagree.

- `npm run check:test-first <slug>` passes for each slice that ships (its
  tests were committed as todos before its code), and no shipped slice's spec
  is still in `IN_PROGRESS` in `scripts/features.js`.
- `docs/STATUS.md` is updated (with the audit's counts, if one ran).
- If the owner asked for an audit, its accepted findings are fixed.
- `docs/PRODUCT.md` says what shipped. Run `/docs-gc` if it was not run.

Stop if any precondition fails; say which.

## 2. The train (decision 0125)

```bash
npm run e2e:train -- --ready                 # every branch marked ready
npm run e2e:train -- <branch> [<branch> ...] # or the branches the owner named
```

One run for everything that ships, instead of each session running the journeys its
shared files reach: it merges the branches onto `origin/main` in a scratch worktree
(branch `train/<stamp>`), runs typecheck, lint and `npm test` once on the merged tree,
exports the `/chronicles` build once (as Pages serves it), and runs the union of the
journeys the branches name once each (a journey green in an earlier train with its files
unchanged is not rerun). A failure two or more branches could have caused is isolated:
the journey reruns on `main` with each of them alone, and goes to the branch whose run
alone fails, or to all of them as "only together" when none does (`--no-isolate` skips it;
it costs an export per branch, only when something is red). The ready markers are removed
in the train's last commit, so none reaches `main`. The report (`.e2e-train/<stamp>/report.md`)
gives each branch its verdict: green, cleared by isolation, red with the failed checks and
what isolation found, or left out for a conflict. The full flow (no `E2E_ONLY`) runs only
when the owner asks.

- **All green:** go to step 3.
- **Red:** send each red branch its section of the report. Find the session working on
  it (STATUS.md's "In flight" row names it; `list_sessions` with `mine`, `get_session`
  to match the branch) and `send_message` it the section, with the reproduce line; if
  no session matches, give the owner each section to paste. A failure isolation could
  not pin to one branch goes to each. A known flake is labelled and still red. The red
  branch's marker is stale once its session commits the fix; it marks it again. Then, with the owner's
  word, run the train again without the red branches (only the journeys whose files
  changed rerun) and ship the green ones; delete the red train's branch
  (`git branch -D train/<stamp>`).
- **The merged tree fails typecheck, lint or tests:** the branches break each other.
  Tell the owner which branches the log names; nothing ships until one is rebased.

## 3. Push main

```bash
git fetch origin main
git log --oneline origin/main..train/<stamp>     # what ships
git push origin train/<stamp>:main               # the tested commit; a fast-forward
git branch -D train/<stamp>
```

Push only what the owner agreed to ship. If `main` moved since the train (the push is
not a fast-forward), run the train again: journeys whose files did not change are not
rerun. Never force-push `main`.

## 4. Check the run

`gh` is not available in cloud sessions; use the GitHub MCP tools:

1. `actions_list` for `miguelaguerrero/chronicles`, workflow
   `pages.yml`, newest first.
2. `actions_get` on the run until it is `completed`; `get_job_logs` on a
   failed job.
3. Open https://miguelaguerrero.github.io/chronicles/ and confirm the build
   is the new one (a changed screen, or the commit's visible change).

## 5. If the export fails

1. Read the job log: the failing step is typecheck, test or export.
2. Reproduce it locally with the same command and
   `CHRONICLES_BASE_URL=/chronicles`.
3. A worker-asset error: `scripts/copy-maplibre-worker.js` (postinstall) must
   have put `maplibre-gl-worker.mjs` in `public/`; `setWorkerUrl` prefixes
   `process.env.EXPO_BASE_URL`.
4. A route 404 after deploy: the `404.html` copy step, or a path not under
   the base URL.
5. Fix on a branch, run the train again, push `main` again. Never fix on
   the Pages artifact or by hand.

## Report

The branches shipped and the commit deployed; the train's journeys (ran,
already green) and each red branch's verdict and whether its session was sent
it; the run's URL and result, and the page checked.
