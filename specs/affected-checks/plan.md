# Affected checks: plan

For the owner's review before any code. Spec: `specs/affected-checks/spec.md` (AC1-AC11). Branch: `claude/affected-checks`, from `claude/functional-core-slice1` (it reuses `scripts/layers.js`); it merges after slice 1.

## Why this shape

Measured on Nov 3: `npm test` is 695 tests in about 10 s, the typecheck about 25 s warm, lint about 40 s cold and 2 s cached, the e2e about 15 minutes. Selecting unit tests saves seconds; the minutes are in the e2e, and in rules that only the e2e can reach because they live in screens. So this slice makes the cheap checks targeted and wires them in, and gives the e2e a file map; the next slice splits the e2e by that map, and the shell slices (fog refresh onward) move rules out of it.

## Files

**New**
- `scripts/affected.js` (CommonJS, Node built-ins, `typescript`, and `scripts/layers.js`): `changedFiles(root, base)` (AC1, from `git merge-base`, `git diff --name-status -M`, `git ls-files --others --exclude-standard`), `importGraph(root)` (every `src` file and test, all imports incl. type-only, AC2, AC5), `affectedTests(root, changed)` with the chain for each (AC3), `HARNESS` (AC4), `e2eScenarios(changed)` (AC9). A CLI: `node scripts/affected.js test|lint|check`.
- `scripts/e2e-scenarios.js`: the table of scenarios and the files each covers (AC9), read by `affected.js` and named in `scripts/e2e-web.js`'s header.
- `src/lib/__tests__/affected.test.ts`: throwaway git repos in the OS temp dir for AC1-AC4 (a commit, an edit, a new file, a rename, a delete, a harness change); this repo's graph for AC5 (a known transitive pair, e.g. `geo.ts` reaching `rides.test.ts`); AC6's file list; AC9's lookup.

**Changed**
- `scripts/layers.js`: the import reader takes `{ types: true }` to include type-only imports, so both callers share it (AC5).
- `package.json`: `test:affected`, `lint:affected`, `check:affected` (AC2, AC6, AC7).
- `tsconfig.json`: `"incremental": true` with `tsBuildInfoFile` under `node_modules/.cache` (AC7; ignored by git).
- `.claude/hooks/check-done.sh`: with TypeScript changed, also `node scripts/affected.js test` and the layer check (AC8).
- `.github/workflows/pages.yml`: `npm run lint` before the export (AC10).
- `AGENTS.md` (the Commands block, one line), `docs/TESTING.md` (a section on the inner loop), `.claude/skills/slice/SKILL.md` (steps 5-6 use `check:affected`; step 9 stays the full suite), `docs/STATUS.md`.

## Data

None.

## Tests per criterion

| Id | Test |
|---|---|
| AC1 | `AC1 changed files: commits, edits, new, renamed and deleted files since the merge base` (temp repo) |
| AC2 | `AC2 a change selects the tests that import it, through value, type-only, dynamic and platform imports`; `AC2 a changed test runs itself; a deleted file's importers run` |
| AC3 | `AC3 each selected test prints its shortest chain; nothing selected says so` |
| AC4 | `AC4 a harness change runs everything and names the file` |
| AC5 | `AC5 the graph follows what the layer reader follows` (this repo) |
| AC6 | `AC6 lint:affected lists the changed sources, or everything when the lint config changed` |
| AC7 | `AC7 check:affected runs its steps in order and stops at the first failure` (steps injected, no real tsc) |
| AC8 | `AC8 the Stop hook runs the layer check and affected tests when TypeScript changed` (the script's decision, over a fake change list) |
| AC9 | `AC9 a changed file names the scenarios that cover it; an uncovered screen is named` |
| AC10 | `AC10 CI runs lint` (reads `pages.yml`) |
| AC11 | docs, checked by `npm run check:docs` and `/docs-gc` |

## Deferred, and why

- Splitting the e2e's main flow up front: dropped by decision 0074; journeys grow with the slices that change screens.
- Coverage-based selection: the import graph is exact for core; coarse only where a test reaches a shell through fakes, which the harness rule (AC4) covers.
- Running the e2e in CI: it needs a browser in the runner and takes 15 minutes; revisit once the e2e is split.

## Native

None: scripts, config and docs only. Nothing here runs on a phone.

## Done when

The slice's tests pass with typecheck, lint and the full `npm test`; it changes no screen, so no e2e journey (decision 0074); no audit unless the owner asks; `/docs-gc` is clean.
