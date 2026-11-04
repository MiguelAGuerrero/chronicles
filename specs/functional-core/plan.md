# Functional core, slice 1: plan

For the owner's review before any code. Spec: `specs/functional-core/spec.md` (FC1-FC10). Branch: `claude/functional-core-slice1`, from main `efc6136`.

## What it adds, in one picture

| Layer | What it holds | May import (values) | Tested by |
|---|---|---|---|
| `core` | decisions, models, rules, reducers | core, pure packages (`fflate`, `pbf`, `@mapbox/vector-tile`), JSON | unit tests |
| `shell` | one feature's effects: db writes, reads, timers, the store | anything except screens and components | shell tests with `fakePorts()` (from slice 2 on) |
| `adapter` | a platform implementation behind an interface (`db/*`, `recorder/*`, `notify/transport*`, `media/*`, `locate/*`, `motionSource/*`, `audioMode*`, `haptics`, `id`) | anything | the contract suite where one exists; otherwise e2e and the device |
| `view` | React hooks in `src/lib` (`use*.ts`, ...) | anything except the singletons (FC5) | e2e |

`src/app` and `src/components` are views by folder; they are not tagged.

## Files

**New**
- `scripts/layers.js` (CommonJS, no dependencies but `typescript`, already a dev dependency): reads each `src/lib` file's layer from its first line (`// @layer core`), and its value imports with the TypeScript parser. Shared by the test and `eslint.config.js`, so the two can't disagree about which files are core.
- `src/lib/__tests__/layers.test.ts`: FC1, FC2, FC4 over the real tree; FC3 and FC5 by running the lint rules (ESLint's Node API, only this repo's rules, not the whole Expo config) over small sources.
- `src/lib/__tests__/layers.baseline.json`: FC2's recorded violations (expected empty or close to it, see Tagging).
- `eslint-suppressions.json` (repo root, written by `eslint --suppress-rule`, ESLint 9.39.5 is installed): FC3 and FC5's existing violations, per file and rule, with counts.
- `.claude/rules/functional-core.md` (`paths: src/**`): the convention, in under a page, so it loads whenever an agent opens code. Includes the "two of five" test for when a flow becomes a reducer, and "assert the end state; the call log only for order the spec states".
- `docs/decisions/0073-functional-core-checked.md`: the Nov 1 call, the Nov 3 restatement, and what the research changed.

**Cherry-picked from `561b439`** (the Nov 1 foundations; the AGENTS.md commit `570b68a` is not taken, the rule file replaces it)
- `src/lib/ports/{types,index}.ts`, `src/lib/store.ts`, `src/lib/useStore.ts`, `src/lib/meta.ts`.
- `src/lib/__tests__/fakes/{index,failable,memoryDb}.ts`, `dbContract.ts`, `db.contract.test.ts`, `fakes.test.ts`, `meta.test.ts`, `store.test.ts`.
- `fake-indexeddb` as a dev dependency (test-only; the contract suite runs the web store over it).
- Its `eslint.config.js` hunk is dropped (it conflicts, and its `LEGACY_*` lists are replaced by FC4/FC5).

**Brought up to main** (the branch is two days behind)
- `memoryDb`: the 16 `Db` methods added since Nov 1 (`addFind`, `capturesBetween`, `checklistItemsIn`, `deleteCaptures`, `deleteWalk`, `endStill`, `getGapDecisions`, `getStills`, `listAtlasAreas`, `listChecklistAreas`, `listExploreReads`, `listFinds`, `putAtlasAreas`, `putGapDecision`, `saveChecklists`, `startStill`) and any changed signatures (the typecheck lists them), each with a contract case (FC7).
- `meta.ts`: the keys added since (`explore_*`, `notify_off`, `day_watched:*`, `nav`, ...), found by `meta.test.ts` itself (FC8).
- Test names gain their criterion ids.

**Changed**
- Every non-test file in `src/lib` (150) gains a first line `// @layer <name>`. No other change to them.
- `eslint.config.js`: a block for core files (from `scripts/layers.js`) with `no-restricted-syntax` / `no-restricted-properties` / `no-restricted-globals` (FC3); a block for views adding the singletons to `no-restricted-imports` with `allowTypeImports` (FC5). Each message names the fix, as the four existing ones do.
- `AGENTS.md`: one line under "Rules that hold everywhere" and `functional-core` in the rule areas. It stays under 200 lines.
- `docs/ARCHITECTURE.md`: the `(pure)` definition becomes the layers table; the 65 `(pure)` marks go (the file's tag is the one source). Two rule files and `docs/TESTING.md` say `(pure)` in prose; they get the word "core".
- `docs/TESTING.md`: the layer check, `fakePorts()`, the contract suite, and the baselines (how to shrink one: `npx eslint --prune-suppressions`; delete the line from `layers.baseline.json`).
- `docs/STATUS.md`: the In flight row now; the slice row and the `claude/functional-core-foundations` disposition ("taken by cherry-pick") at the end.

## Tagging

Measured on main: 81 of 150 modules already reach nothing impure, directly or through what they import. They become `core`, except the 9 with a hidden input, which are judged one by one: `id.ts` (an adapter: ids and time are its job), `lastFix.ts`, `units.ts` and `recorder/emitter.ts` (small stores: shell or adapter), and `areas/boundaries.ts`, `places.ts`, `openWalkLoad.ts`, `settleWithin.ts`, `tileBuild.ts` (a timer or a module-level cache: tagged by what the file is for, and if that is core, the line goes in the baseline to fix later). The other 69 are `adapter`, `shell` or `view` by what they do. A module that mixes decisions and effects (`summary.ts`: formatters beside `loadReplay`) is tagged `shell` now; splitting it is later work, not this slice.

## Data

None. No new truth or cache, no SQLite migration, no IndexedDB version.

## Tests per criterion

| Id | File | Test |
|---|---|---|
| FC1 | `layers.test.ts` | `FC1 every src/lib module declares one known layer`; `FC1 a missing or unknown layer is named` (fixture) |
| FC2 | `layers.test.ts` | `FC2 core imports only core, pure packages and types`; `FC2 the message names the import, its layer and the fix` (fixture) |
| FC3 | `layers.test.ts` | `FC3 lint flags the clock, randomness, timers and module state in core` (each form, plus allowed `new Date(t)`); `FC3 the same code passes in a shell` |
| FC4 | `layers.test.ts` | `FC4 a new violation fails and a stale baseline entry fails` (fixture baseline); the real baseline passes |
| FC5 | `layers.test.ts` | `FC5 a view importing db, recorder or notifier is flagged; a type import is not` |
| FC6 | `fakes.test.ts` | the branch's tests, renamed `FC6 ...` (shared log order, `failNext`, clock, ids) |
| FC7 | `db.contract.test.ts` | the suite over `memoryDb` and IndexedDB, `FC7 <method> ...`; `FC7 every Db method has a contract case` |
| FC8 | `meta.test.ts` | `FC8 every meta key in use is declared` |
| FC9 | `store.test.ts` | `FC9 subscribers hear real changes only` |
| FC10 | e2e | the full `npm run e2e:web`, unchanged |

Each new test is run first and seen to fail for the right reason (for FC1: before the tags are added).

## Deferred, and why

- **Rules for shells** (a shell takes `Ports` and never imports the singletons): there is no shell yet to hold them to; they land with the first one (fog refresh, slice 2).
- **`useStore`** has no Node test (it is a React hook); its first user, in slice 2, is checked by the e2e and the render budget.
- **The native SQLite adapter** is not in the contract suite: it can't load in Node. Listed in `docs/NATIVE_UNVERIFIED.md`.
- **Splitting mixed modules** (`summary.ts` and the like), and moving any screen: later slices, one at a time.
- **A file-name suffix (`*.core.ts`)** in place of the header tag: only if deriving ESLint's file list from the tags proves slow or flaky.

## Native

No native behaviour changes. `ports/index.ts` builds the real ports from the native db, recorder and notifier at load, but nothing in the app imports it yet. Neither it nor the SQLite adapter's match to the contract has run on a device; both go in `docs/NATIVE_UNVERIFIED.md`.

## Done when

`npm run typecheck`, `npm run lint`, `npm test` and `npm run export:web && npm run e2e:web` are green; `/audit functional-core` has run and its accepted findings are fixed behind `functional-core audit N` tests; `/docs-gc` is clean.
