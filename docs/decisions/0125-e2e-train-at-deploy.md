# 0125. A branch runs only the journeys it added or edited; the rest run once, in the deploy's train

Date: 2026-11-10 · Status: accepted · Area: process, testing · Amends: 0074 (which journeys a slice runs, and where)

## Context
Seven or eight sessions build at once, each in its own container on its own branch, each with its own build and its own green cache. Under 0074 each ran every journey `check:affected` names for its files, and a shared file names many: `src/app/walk.tsx` is in the `covers` of twelve journeys, `explore.tsx` of seven, `MomentBar`, `AtlasCard` and `WalkMap.web` of six. Storage awareness ran thirteen journeys for a line beside the captures, moment stacks twenty-nine, the Explore carousel twelve, and seven sessions touching the walk screen ran the same twelve seven times. `/deploy` then ran them all again on the `/chronicles` build, whose flags and bundle never match a slice's cache. The `covers` lists were checked on the way (Nov 10): each journey asserts on something its hub files wire up (the walk screen's gap card, Layers control, held-captures line, edit offer; Explore's Layers and walkability; the drive's Walk callbacks), so trimming them would have hidden real regressions. The cost is in who runs them, not in what they cover.

## Decision
- **A branch runs only the journeys it added or edited**, which hold its screen criteria (`npm run check:e2e` lists them as "yours to run"). Every other journey the plan names, reached only through a file it covers, is **deferred to the train**: the session does not run it, and writes the list in its report and its STATUS.md row. `/slice`, `/audit` and `/fix --deploy=branch|none` follow this.
- **The train is the deploy's batch** (`npm run e2e:train -- <branches>`, run by `/deploy`): the ready branches merged onto `origin/main` in a scratch worktree, typecheck, lint and `npm test` once on the merged tree, one `/chronicles` export, the union of the branches' journeys once each. A failure goes to every branch whose files the failing journey covers; `/deploy` sends each red branch its section through the session working on it, or gives it to the owner. Green ships the tested commit (`train/<stamp>` pushed to `main` as a fast-forward); the red are dropped and the train runs again, rerunning only journeys whose files changed.
- **`/fix` that deploys itself ships alone**, so it is its own train: `check:e2e -- --train` names every journey to run.
- **`covers` stays as it is**: a journey lists the files whose behaviour it checks, pass-throughs included only where it asserts on what they wire up.
- The end of a slice and an audit run each check once: `check:e2e` (the plan and what covers nothing) instead of `check:affected`, which reran the typecheck, lint and unit tests after `npm test`; no `test:feature` after `npm test`.

## Why
A journey reached through a shared file checks the integration of several branches' work, so the merged tree is where it means something, and one run there serves every branch. The branch keeps the journeys that are its own failing tests, so test-first on screens is unchanged.

## Consequences
- A neighbour journey's failure is found at deploy, not while the slice is built; it comes back to the branch with its failed checks and a reproduce line, possibly after the session moved on.
- A shared failure (two branches name the journey) goes to both, the one that edited the journey marked; no bisection is automatic.
- `main` gets one merge commit per branch shipped, the commit the train tested.
- CI still runs `check:docs`, the typecheck, `npm test` and lint on every push to `main`; the full e2e still runs only when the owner asks.
