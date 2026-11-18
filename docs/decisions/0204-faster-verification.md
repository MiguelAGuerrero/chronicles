# 0204. Faster verification: journeys side by side, the green cache trusted, one review round

Date: 2026-11-18 · Status: accepted · Area: testing, process · Amends [0074](0074-fast-iteration-scoped-checks.md)'s practice, not its rule

## Context
On Nov 18 the owner said "Background tasks are taking way too long" and, asked which, named the e2e journey runs and the
sub-agents' slices. The session behind it had run each journey alone and one after another (a 23-journey sweep took
over an hour, and container restarts kept killing it), forced reruns past the green cache with `E2E_FORCE=1`, rerun
every journey an agent had already run green on the same commit, and given one slice a review round (the cold find and
the UI review) and then an audit round (the cold find again, the steward, the auditor).

## Decision
The owner's calls, Nov 18:
- **Run 3 in parallel**: `npm run e2e:batch` runs named journeys three at a time (the harness already listens on a free
  port; measured: three journeys in 87 s, the slowest alone). The green cache is written whole, so side-by-side runs
  never lose a pass.
- **Trust the green cache**: no `E2E_FORCE` without a named reason; after a merge, rerun only what
  `check:affected -- --since` names.
- **No double verification**: a journey an agent ran green on a commit is not run again on that commit.
- **One review round**: for a slice the owner wants audited, the cold find, the UI review, the steward and the auditor
  run together, once, after the build, rather than a review round and then an audit round.

## Consequences
- `scripts/e2e-batch.js` (tests `arch/e2eBatch.test.ts`); `docs/TESTING.md`, "The e2e's economy"; `/slice` step 9 and
  `/audit` say when the rounds merge.
- The full flow and `/audit` still run only when the owner asks (0074); nothing is skipped, and a flake still fails.
