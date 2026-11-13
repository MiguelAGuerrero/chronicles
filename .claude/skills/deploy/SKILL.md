---
name: deploy
description: Deploy the web build to GitHub Pages by pushing main (the only branch Pages accepts), after typecheck, lint, the unit tests and the slice's e2e journeys are green and STATUS.md is updated (the full e2e and an audit only if the owner asked); then check the Pages run with the GitHub MCP tools. Use only when the owner asks to deploy, ship or release.
when_to_use: The owner says deploy, ship, release, publish, or merge to main.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
---

# Deploy

`/fix` (decision 0081), `/tend` (0128) and a slice built from an approved proposal (0130) publish from a
worktree by `.claude/skills/ship.md`, "Publish to main", which holds to this file's preconditions and its
sections 3 and 4; typing those commands is the owner's go-ahead. Everything else reaches `main` here.

A push to `main` runs `.github/workflows/pages.yml`: `npm ci`, `check:docs`,
typecheck, `npm test`, lint, `expo export --platform web` with `CHRONICLES_BASE_URL=/chronicles`
(which `app.config.js` turns into `experiments.baseUrl`), `dist/index.html`
copied to `404.html` (Pages has no app-route fallback; a reload on
`/chronicles/walk` must resume the walk), then GitHub Pages at
https://miguelaguerrero.github.io/chronicles/.

## The owner's rules

- `main` is the only branch the Pages environment accepts.
- Merge to `main` only when typecheck, lint, `npm test` and the slice's e2e
  journeys pass. The full e2e and `/audit` run only when the owner asks
  (decision 0074); if they ran, their fixes must pass too.
- Never add a server, an account, or anything that leaves the device.

## 1. Preconditions (all of them)

```bash
git status --short                       # clean, on the branch to ship
npm run typecheck && npm run lint && npm test
npm run check:affected                   # names the e2e journeys for what ships
CHRONICLES_BASE_URL=/chronicles npm run export:web && E2E_BASE=/chronicles E2E_ONLY=<journey> npm run e2e:web   # those chosen as in docs/TESTING.md, "Choosing the journeys"
```

- The journeys run against the sub-path build, as Pages serves it. The full
  flow (no `E2E_ONLY`) only when the owner asks for it.
- `npm run check:test-first <slug>` passes for each slice that ships (its
  tests were committed as todos before its code), and no shipped slice's spec
  is still in `IN_PROGRESS` in `scripts/features.js`.
- `docs/STATUS.md` is updated (with the audit's counts, if one ran), through `npm run records --
  slice row set` (decision 0156), and `npm run check:records -- origin/main` passes.
- If the owner asked for an audit, its accepted findings are fixed.
- `docs/PRODUCT.md` says what shipped. Run `/docs-gc` if it was not run.

Stop if any precondition fails; say which.

## 2. Push main

```bash
git fetch origin main
git log --oneline origin/main..HEAD      # what ships
git checkout main && git merge --ff-only <branch>   # a fast-forward: the record gate replays each commit, and a merge resolved by hand in the record documents fails it
git push origin main
```

Push only what the owner agreed to ship. If a fast-forward is not possible,
show the owner the divergence before merging.

## 3. Check the run

`gh` is not available in cloud sessions; use the GitHub MCP tools:

1. `actions_list` for `miguelaguerrero/chronicles`, workflow
   `pages.yml`, newest first.
2. `actions_get` on the run until it is `completed`; `get_job_logs` on a
   failed job.
3. Open https://miguelaguerrero.github.io/chronicles/ and confirm the build
   is the new one (a changed screen, or the commit's visible change).

## 4. If the export fails

1. Read the job log: the failing step is typecheck, test or export.
2. Reproduce it locally with the same command and
   `CHRONICLES_BASE_URL=/chronicles`.
3. A worker-asset error: `scripts/copy-maplibre-worker.js` (postinstall) must
   have put `maplibre-gl-worker.mjs` in `public/`; `setWorkerUrl` prefixes
   `process.env.EXPO_BASE_URL`.
4. A route 404 after deploy: the `404.html` copy step, or a path not under
   the base URL.
5. Fix on a branch, rerun the preconditions, push `main` again. Never fix on
   the Pages artifact or by hand.

## Report

The commit deployed, the run's URL and result, and the page checked.
