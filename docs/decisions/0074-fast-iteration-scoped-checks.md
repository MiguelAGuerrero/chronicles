# 0074. Fast iteration: scoped checks per slice; the full e2e and the audit on request

Date: 2026-11-03 · Status: accepted · Area: process, testing · Supersedes in part: 0018 (the audit on every slice) · Amended by: 0145 (a UI review on every screen change)

## Context
Seven or eight agents at a time were each running the full e2e (one sequential flow through every screen, about 15 minutes), because `AGENTS.md`, `/slice`, `/audit` and `/deploy` all required it before work counted as done, even for a slice that touched one screen or none. Every slice also got an adversarial audit (decision 0018). The owner is iterating fast on features and wants each change checked by what it can break: unit and shell tests, regression tests, and an e2e journey scoped to the change.

## Decision
- **While building:** `npm run check:affected` (the layer check, the unit tests that import what changed, the typecheck and lint of the changed files).
- **A slice is done** when its criteria's tests pass with the typecheck, lint, `npm test` (about 11 s) and the e2e journeys that `check:affected` names for its files.
- **Screens:** a slice that changes what a screen shows adds or extends one journey for its change (an `E2E_ONLY` scenario, fresh browser) and registers its files in `scripts/e2e-scenarios.js`. A slice that changes no screen runs no e2e.
- **The full e2e** (no `E2E_ONLY`) runs only when the owner asks, `/deploy` included.
- **`/audit`** runs only when the owner asks. Regression tests for bugs found are still named and written first.

## Why
The checks that matter for a change are the ones that can fail because of it. The import graph selects the unit tests exactly; journeys do the same for screens once each change brings its own. Running the whole app for every slice spent most of the agents' time re-checking what didn't change.

## Consequences
- A regression in a screen no journey covers can reach `main` unseen until the owner asks for a full run. `check:affected` names every changed screen that no journey covers, so it is visible when it happens.
- The main flow is not split into journeys up front; journeys grow slice by slice.
- CI still runs `check:docs`, the typecheck, `npm test` and lint on every push to `main`.
