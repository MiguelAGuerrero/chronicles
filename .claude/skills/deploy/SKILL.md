---
name: deploy
description: Deploy the web build to GitHub Pages by pushing main (the only branch Pages accepts), after typecheck, lint, the unit tests and the slice's e2e journeys are green and STATUS.md is updated (the full e2e and an audit only if the owner asked); then check the Pages run with the GitHub MCP tools. Use only when the owner asks to deploy, ship or release.
when_to_use: The owner says deploy, ship, release, publish, or merge to main.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, mcp__github__actions_list, mcp__github__actions_get, mcp__github__get_job_logs
---

# Deploy

`/fix` (decision 0081) runs steps 1-3 itself from its worktree; typing it is the owner's go-ahead.

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
CHRONICLES_BASE_URL=/chronicles npm run export:web && E2E_BASE=/chronicles E2E_ONLY=<journey> npm run e2e:web   # each journey it names
```

- The journeys run against the sub-path build, as Pages serves it. The full
  flow (no `E2E_ONLY`) only when the owner asks for it.
- `npm run check:test-first <slug>` passes for each slice that ships: the specs
  whose criteria the branch changed, `git diff --name-only origin/main..HEAD -- 'specs/*/spec.md'`.
  Ids a real test already named on `main` (an earlier round) are skipped; the
  rest must have been committed as todos before their code. No shipped slice's
  spec is still in `IN_PROGRESS` in `scripts/features.js`.
- `docs/STATUS.md` is updated (with the audit's counts, if one ran).
- If the owner asked for an audit, its accepted findings are fixed.
- `docs/PRODUCT.md` says what shipped. Run `/docs-gc` if it was not run.

Stop if any precondition fails; say which.

## 2. Push main

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD && echo fast-forward   # else main moved: see below
git log --oneline origin/main..HEAD      # what ships: show it to the owner
git push origin HEAD:main                # a fast-forward from the branch; never a force
```

- Validate before the push: every commit in that list must be work the owner's
  request covers. If it holds anything else (another session's branch merged in,
  older unshipped work), ask with AskUserQuestion, the list in the question,
  before pushing.
- Not a fast-forward (`main` moved): show the divergence and ask (recommended:
  merge `main` in, resolve, rerun step 1 for what the merge touched, then push).
  `main` can move again while the checks run; fetch once more right before the push.
- Push from the branch (`HEAD:main`), not `git checkout main`: a stale local
  `main` or one checked out in a worktree makes the checkout fail or ship the wrong thing.

## 3. Check the run

Use the GitHub MCP tools (`gh` in a cloud session serves search only):

1. `actions_list` for `miguelaguerrero/chronicles`, workflow
   `pages.yml`, newest first.
2. `actions_get` on the run until it is `completed`; `get_job_logs` on a
   failed job.
3. The run's success is the evidence that the build deployed. If what ships
   changes a screen, open https://miguelaguerrero.github.io/chronicles/ and look
   for that change; with nothing visible, there is no live check beyond the run.
   If the page can't be reached from the session (github.io is blocked in some),
   say the live check was not done, never that it passed.

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
