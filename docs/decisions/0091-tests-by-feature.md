# 0091. Tests are organized by feature; a change maps to its feature's suites, and a coverage hole is named

Date: 2026-11-04 · Status: accepted · Area: process, testing · Relates to: 0074 (scoped checks), the affected-checks slice (AC1-AC11)

## Context
The owner asked for an audit of the test suite against industry practice, with one goal: every feature, slice and journey represented in tests, and any change mapped to the suites it can break, so a change runs only what it needs. The audit (Nov 4, at `9a12b07`) found the mechanisms in place and working: selection from the import graph (`scripts/affected.js`) and journeys that declare their files (`scripts/e2e-scenarios.js`). What was missing was the layer above them: 69 test files in one flat folder, the feature taxonomy written three times (rule `paths:`, journey `covers`, spec prefixes) and disagreeing (21 test files claimed by no rule, files mixing slices, prefixes M, R, D, G shared by two specs each); 126 of 240 source files reached by no unit test and 29 of 61 screens covered by no journey row, which `check:affected` reported in the same words as "nothing to run"; 39 criteria checked only by the 15-minute full e2e flow, a 4,539-line file with eight journeys as closures and a 2,200-line sequential tail; the five slowest test files being tree-wide checks mixed in with feature tests; and spec traceability as a report that cannot tell a retired id from a missing test.

## Decision
The owner's calls (Nov 4), from the audit's options:
- **All three phases:** the feature map and commands (A), the move of the unit tests into feature folders (B), and the split of the e2e into a harness and one file per journey with the full flow cut into journeys (C). Accepted cost: every unmerged branch that touches a test file conflicts on merge (`git mv` keeps history).
- **One map:** `scripts/features.js` is the single source for feature → sources, journeys, specs, rule. Unit tests are the folder of the same name; nothing lists them twice. The rule files keep their `paths:` (that is how they load) and point at the folders.
- **Type-only imports stay followed** by the selection (AC2): the cost is small (the whole suite runs in about 13 s) and a renamed field fails a named test rather than only `tsc`.
- **Traceability stays a report by default** (`check:specs`); retired ids are declared in the map, and `--strict` exists for the day it becomes a gate.

## Why
The checks that matter for a change are the ones that can fail because of it (0074). That holds only if every feature has a place its tests live, the map from a file to its feature is one map, and the tool says plainly when a change reaches a place nothing covers.

## Consequences
- `npm run test:feature <name>`; `check:affected` reports by feature and names files covered by nothing; `check:specs` resolves shared prefixes and separates retired from missing.
- A new test goes in its feature's folder; a new feature is a folder and a row in the map (the feature test fails otherwise). A new journey is a file under `scripts/e2e/journeys/`.
- The 22 shells and the screens still covered by nothing are listed in `docs/DEFERRED.md`; the functional-core migration closes the shells one cluster at a time.
- Spec: `specs/test-organization/spec.md` (TG1-TG12).
