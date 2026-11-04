<!-- Test organization. Written in the repo first (2026-11-04) from the owner's call in session (decision 0091); an
     engineering slice, not a product tab of the concept doc. Follows "Affected checks" (specs/affected-checks/). -->

# Test organization: tests by feature, and what a change maps to (TG)

The affected checks select the unit tests a change can break from the import graph and name the e2e journeys that cover a changed file. What was missing above them was one map from a feature (a slice, a journey, a rule area) to its tests, so a feature's tests could be run by name, the three partial maps (rule `paths:`, journey `covers`, spec prefixes in test names) stopped disagreeing, and `check:affected` could tell "nothing can break" from "nothing covers this". The audit behind this is summarized in `docs/TESTING.md`'s first section and decision 0091.

## Criteria

1. **TG1 · One feature map.** `scripts/features.js` lists every feature with the source files it owns (globs), the e2e journeys that walk it, the specs whose criteria it answers and its rule file. Every source file under `src/` belongs to at least one feature; every journey belongs to exactly one; every spec with criterion ids is listed by at least one; every rule a feature names exists. `arch/features.test.ts` holds the map to the tree and names what is missing.
2. **TG2 · Tests live by feature.** Unit tests are `src/lib/__tests__/<feature>/*.test.ts`, one folder per feature of the map, and every test folder is a feature. `npm test` runs every folder. Helpers, fakes and fixtures shared across features stay at the root of `__tests__/` and count as harness (a change runs everything, AC4); a fixture inside a feature folder selects only the tests that import it.
3. **TG3 · The architecture group.** Tests of the tree itself (the layers, the meta keys, the functional-core audit, the affected checks, the feature map, the fakes and the store) are `arch/`; the Db contract is `storage/`. A feature run never needs them, and the inner loop runs the tree-wide ones once, by their marker.
4. **TG4 · A feature's tests by name.** `npm run test:feature <name> [<name> ...]` runs those folders; an unknown name fails and lists the names.
5. **TG5 · The inner loop reports by feature.** `check:affected` and `test:affected` group the selected test files under their feature, and name the journeys per feature.
6. **TG6 · Coverage holes are named.** For each changed source file that no unit test reaches and no journey covers, `check:affected` says so, with its layer and its features, in words distinct from "nothing to run". A changed file that belongs to no feature is named with the fix (add it to the map).
7. **TG7 · Traceability per feature.** `check:specs` resolves a prefix two specs share (M, R, D, G) to the test folders of the features that list each spec. Ids a spec still lists that the app retired are declared in the map (`RETIRED`) and reported apart from live ids. `--feature <name>` reports one feature's specs; `--strict` exits non-zero when a live id has no test. The default stays a report.
8. **TG8 · Rules point at folders.** Each `.claude/rules/<area>.md` that owns tests names its feature's folder in `paths:`, so the rule loads when its tests are edited; `check:docs` holds the globs.
9. **TG9 · One file per e2e journey.** `scripts/e2e/journeys/<name>.js` exports `{ name, covers, run }`; the registry (`scripts/e2e-scenarios.js`) is the folder; the harness (the server, the fake world, the helpers) is `scripts/e2e/harness.js`. `npm run e2e:web` and `E2E_ONLY=<name>` are unchanged; the full flow is `journeys/full.js` and has no row.
10. **TG10 · The full flow becomes journeys.** The screens that only the full flow checked (the walk and its replay, Chronicle, the day screen, memories, notifications, deletion) each get a journey of their own with a row, so every `src/app` and `src/components` file is covered by a row or listed in `docs/DEFERRED.md` with why.
11. **TG11 · The docs say so.** `AGENTS.md`'s commands, `docs/TESTING.md`, `/slice`, `/e2e`, `/audit` and the auditor name the layout and the commands; `check:docs` holds every path.
12. **TG12 · Type-only edges stay.** The selection keeps following `import type` (AC2, the owner's call, Nov 4): a renamed field fails a named test rather than only `tsc`. `docs/TESTING.md` says so and what it costs.

13. **TG13 · The Stop hook checks script changes.** A change under `scripts/` with no TypeScript change still runs the layer check and the tests that read the whole tree before a turn ends, so another session's edit to the feature map, a journey's files or a check is held before it is pushed.
14. **TG14 · A prefix is one spec's.** A criterion prefix that a new spec shares with another fails the docs check, naming both specs; D, M and R, shared before this check, are allowed.
15. **TG15 · A decision number is one decision's.** Two decision records with one number fail the docs check, naming both files.
16. **TG16 · Moving a test.** `npm run move-test <file> <feature>` moves a test file into its feature's folder and rewrites every relative path it holds (imports, dynamic imports, requires and `__dirname` joins) so each resolves to the same file as before; an unknown feature is refused, with the list.
17. **TG17 · The typecheck reads the app.** Build output (`dist/`) and agent worktrees (`.claude/worktrees/`) are outside the typecheck, so an export running beside it never fails it.
18. **TG18 · Procedures name the feature.** `/slice`'s plan gives each criterion's feature folder and any new feature or journey, and its done step runs `test:feature` and treats "Covered by nothing" for its files as a gap to close or defer; `/fix` writes its regression test in the feature's folder; the auditor reports the coverage of the slice's files, as a report.
19. **TG19 · No misleading lines.** The `/e2e` skill says each journey run by name ends with the nothing-leaves and the console-errors checks; AGENTS.md's "nothing is a score" rule says it is about the app.

## Out of scope

Coverage measurement (`--experimental-test-coverage`), splitting the walk screen's own journey, and tests for the 22 shells no test reaches (they are the functional-core migration's work, listed in `docs/DEFERRED.md`).

## Decisions

- 2026-11-04: the owner chose all three phases (decision 0091) and kept type-only edges (TG12).
- 2026-11-04: the owner asked for the procedures to hold other agents to the feature-based testing (TG13-TG19), after a review of the skills, the hooks and CI.
