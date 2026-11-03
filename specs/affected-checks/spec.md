<!-- Affected checks. Written in the repo first (2026-11-03) from the owner's go-ahead in session; an engineering slice,
     not a product tab of the concept doc. Follows "Functional core, slice 1" (specs/functional-core/). -->

# Affected checks: run what a change can break (AC)

An agent's inner loop should check what its change can break, fast, and leave the whole suite to the end of a slice, the audit and CI. The functional core makes this safe for unit tests: core modules have explicit inputs and imports, so the files a change can reach are the files that import it. This slice builds that selection for unit tests, typecheck and lint, wires it into the Stop hook and the docs, and closes the CI gap where lint (and so FC3, FC5) is not run before a deploy. Splitting the long e2e flow into scenarios mapped to files is the next slice (it touches 2,000 lines of a sequential flow and deserves its own plan); this one gives every e2e scenario its declared files, so the next slice has a contract to fill.

## Criteria

1. **AC1 · Changed files.** "Changed" is every file that differs from the merge base with `origin/main`: commits on the branch, staged and unstaged edits, new untracked files, deleted and renamed files (both paths). With no `origin/main`, the merge base is `main`; with neither, everything counts as changed.
2. **AC2 · Affected unit tests.** `npm run test:affected` runs exactly the test files in `src/lib/__tests__` that import a changed file, directly or through what they import: value imports, type-only imports (a changed type can break a test's compile), `require()`, `import()`, re-exports, every platform file of a split, JSON. A changed test file runs itself. A deleted file's former importers run.
3. **AC3 · Says why.** Before running, it prints each selected test file and the shortest import chain from it to a changed file, and the number of test files skipped. With nothing selected it says so and exits 0.
4. **AC4 · Whole suite when the harness changes.** A change to shared test infrastructure (`src/lib/__tests__/fakes/`, `dbContract.ts`, `metaKeys.ts`, `mvtFixture.ts`, other non-test helpers in `__tests__`), to `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`, `eslint-suppressions.json` or `scripts/layers.js`, runs every test file, and says which file caused it.
5. **AC5 · One graph.** The import graph comes from the same reader as the layer check (`scripts/layers.js`), so a test that the layer check would follow is one the selection follows.
6. **AC6 · Affected lint.** `npm run lint:affected` lints the changed `.ts`, `.tsx` and `.js` files with the repo's config and its suppressions; with `eslint.config.js`, `eslint-suppressions.json` or `scripts/layers.js` changed, it lints everything.
7. **AC7 · One inner-loop command.** `npm run check:affected` runs the layer check, the affected unit tests, the typecheck (incremental, so a second run after a small edit is faster than the first) and the affected lint, stops at the first failure, and prints which e2e scenarios cover the changed files (AC9).
8. **AC8 · The Stop hook.** Before a turn ends with TypeScript changed, the hook runs the layer check and the affected unit tests as well as the typecheck; a failure blocks the stop with the failing output.
9. **AC9 · E2E journeys declare their files.** Each e2e journey the script runs alone (`tabs`, `marks`, `reload`, `gaps`, `qol`, and every one a slice adds) declares the source files it covers in one table, and every such journey has a row. `check:affected` names the journeys that cover a changed file (`E2E_ONLY=<name>`), and names each changed screen or component that none covers. It never sends anyone to the full flow, which runs only when the owner asks (decision 0073).
10. **AC10 · CI and deploy run everything.** CI runs lint as well as `check:docs`, the typecheck and `npm test`, so FC3 and FC5 are enforced before a deploy. The full suite stays what `/deploy`, `/audit` and the end of a slice run.
11. **AC11 · Agents use it.** `AGENTS.md`'s commands, `docs/TESTING.md` and `/slice` say: the inner loop is `check:affected`; the end of a slice is the full suite and the e2e.

## Tests

- Unit tests (`affected.test.ts`) over small throwaway git repos and over this repo's graph: AC1-AC6, AC9's lookup.
- The Stop hook (AC8) and CI (AC10) by running them on a deliberately broken change in a scratch clone, recorded in the slice's notes; the hook's script also gets a unit test of its decision (which checks run for which changes).
- The e2e itself is unchanged (no step or check moves this slice).

## Decisions

- 2026-11-03: after slice 1, the owner chose affected tests next, and "keep what's seen" for the e2e: when a rule gets a shell test, its e2e step keeps only what's on screen.
- 2026-11-03, mid-slice (decision 0073): with seven or eight agents each running the full e2e, the owner chose fast iteration. The full e2e and `/audit` run only when the owner asks; a slice that changes a screen adds its own journey and runs the journeys `check:affected` names. So the main flow is not split up front, and this slice's own audit was stopped.

## Open

- Selection by recorded coverage (V8 coverage per test file) instead of imports: only if the import graph proves too coarse.
- The full flow is not split into journeys up front (decision 0073): journeys grow with the slices that change screens.
