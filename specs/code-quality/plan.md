# Code quality: the plan

The analyzers exist on this branch (`scripts/quality/`, report-only, commits `567483e`, `16d6543`, `25b3163`). This slice
adds what turns them into a gate and a step: fixtures that pin each analyzer, the baseline and its ratchet, the wiring, the
behaviour guard on refactor commits, and the `/refactor` skill. It changes no screen and no app data.

## Files

| File | What |
|---|---|
| `scripts/quality/functions.js`, `clones.js`, `graph.js`, `patterns.js`, `history.js`, `types.js` | stay; fixes only where a fixture shows a miss. `patterns.js` learns the `// readTrace: <reason>` comment (CQ7) and the `.web`/`.native` sibling rule for `Platform.OS` (CQ5) |
| `scripts/quality/index.js` | `--scope [<feature>]`, `--baseline`, `--tighten`, the queue (CQ13); stable ids (CQ9) |
| `scripts/quality/limits.js` (new) | the limits of CQ8 as one table, each with its catalog move; read by the gate, the skill and the rule file |
| `scripts/quality/baseline.js` (new) | build, compare and tighten the baseline (CQ9-CQ11); plain functions over facts, no I/O, so the fixtures test it directly |
| `scripts/quality.baseline.json` (new) | written once by `--baseline` |
| `scripts/refactor-commits.js` (new) | `check:refactor` (CQ14): reads `git log` and the diffs of `refactor ` commits |
| `package.json` | `check:quality`, `check:refactor` |
| `scripts/affected.js` | `check` runs `check:quality` after the layer check; `hook` runs the gate without `--types` when `src/` or `scripts/quality/` changed |
| `.github/workflows/pages.yml` | `npm run check:quality` and `npm run check:refactor` beside `check:vision` |
| `.claude/skills/refactor/SKILL.md` (new) | the step (CQ15) |
| `.claude/skills/slice/SKILL.md`, `tend/SKILL.md`, `README.md` | the step's place: after green, before `/docs-gc`; in a sweep, up to 3 moves from the area's queue; the table row |
| `.claude/rules/refactoring.md` (new) | the catalog R1-R16, each move's recipe and safety net; `paths: scripts/quality/**, .claude/skills/refactor/**` |
| `.claude/rules/functional-core.md` | "Known limits" points at the baseline's list of local-time reads instead of naming four files (it names 4; 12 do) |
| `AGENTS.md` | the two commands in Commands; `/refactor` in Procedures (inside the 200-line, 12 KB budget) |
| `docs/TESTING.md` | the gate and how to tighten |
| `docs/decisions/NNNN-*.md` (new, numbered by `book:next-decision`) | the ratchet and the step (limits, frozen files, 3 per slice, `/tend`); errors handled by kind with a local log; the palette; the `map/types.ts` move; Walk me back over filled stretches (aligned at the gate) |
| `scripts/features.js` | `code-quality` in `arch`'s specs; `IN_PROGRESS` while building |

The catalog, as the rule file will hold it: R1 pure logic to core; R2 one copy; R3 hoist a closure; R4 one effect cluster
out of a god component; R5 a shell into factory and instance; R6 dependency direction; R7 an unused export; R8 split a
branchy core function; R9 a cycle; R10 a swallowed error handled by its kind; R11 setters into a reducer; R12 `Platform.OS`
into a file pair; R13 a decision out of a shell; R14 local time passed in; R15 a dead module; R16 a colour literal to a
palette token. R10 and R16 wait on their slices (below): until then the gate stops new swallows and new literals, and the
queue doesn't offer the moves.

## Data

None. No truth, cache, migration or IndexedDB version: the baseline is a file in `scripts/`.

## Tests per criterion

All in `src/lib/__tests__/arch/` (the `arch` feature), over fixture trees in a temp folder.

| Criterion | File | Test name |
|---|---|---|
| CQ1 | `quality.test.ts` | `CQ1 the facts are the same bytes on two runs` |
| CQ2 | `qualityFacts.test.ts` | `CQ2 lines, branches, nesting, parameters, hooks and props have known answers` |
| CQ3 | `qualityFacts.test.ts` | `CQ3 purity and the layer findings: each with a look-alike that passes` |
| CQ4 | `qualityFacts.test.ts` | `CQ4 swallowed errors and floating promises: each with a look-alike that passes` |
| CQ5 | `qualityFacts.test.ts` | `CQ5 the React findings: each with a look-alike that passes` |
| CQ6 | `qualityFacts.test.ts` | `CQ6 cycles, unused exports, dead modules, copies and change coupling` |
| CQ7 | `qualityFacts.test.ts` | `CQ7 readTrace without context, with withFilled, and with a written reason` |
| CQ8 | `quality.test.ts` | `CQ8 new code past each limit fails, naming its move` |
| CQ9 | `quality.test.ts` | `CQ9 the baseline keys by name, so moving code within a file changes nothing` |
| CQ10 | `quality.test.ts` | `CQ10 a recorded file or function that got worse fails; a frozen file may not grow by a line` |
| CQ11 | `quality.test.ts` | `CQ11 an improvement fails until tightened; tighten refuses to raise or add` |
| CQ12 | `quality.test.ts` | `CQ12 the repo passes its gate, check:affected runs it, and it costs at most 6 s` |
| CQ13 | `quality.test.ts` | `CQ13 the scope follows the changed files' features and the queue is ranked by commits times branches` |
| CQ14 | `refactorCommits.test.ts` | `CQ14 a refactor commit may add to a test, never change one` |
| CQ15 | `procedures.test.ts` | `CQ15 /refactor sits after green and before /docs-gc in /slice, in /tend's sweep, and in the skills' table` |

They go in as todos first, in one commit (`Code quality: tests first (CQ1-CQ15, failing)`), then each turns real with its code.

## Follow-ups this slice files (not built here)

Filed through `npm run records` in a new "Code quality" section of `docs/DEFERRED.md` (deferred by decision, each the owner's):

- **Errors handled by kind**, its own slice: a local diagnostics log (new truth: a SQLite migration and an IndexedDB version),
  shareable from a walk's options like the GPS log; failed saves shown with Try again; platform refusals as state; cache work
  marked for recompute; the 248 swallows and 26 floating promises moved over by R10.
- **A palette of semantic tokens**, its own slice: `lib/palette` beside `motionTokens`, its tokens named for what they mean;
  the 297 colour literals moved over by R16; a screen change, so a journey and the UI review.
- **Decomposition slices** for `src/app/walk.tsx` and `src/components/map/WalkMap.web.tsx`.
- **`components/map/types.ts` into `src/lib/map/`**: the first queue item (R6 with R1), done by the first `/refactor` run.
- **Walk me back over kept and self-filled stretches**: a `/fix`, aligned at the gate; closes "Walk me back ignores filled
  stretches" in the Filling gaps section.

## Deferred, and why

- A coverage ratchet for core and mutation testing (`npm run test:coverage` exists; mutation testing needs a dependency).
- Floating promises in `npm test`: the type checker costs about 5 s, so `npm test` runs the gate without it and
  `check:affected` and CI run it whole.

## Native

None: the slice touches scripts, tests and docs only.

## Screens

None. No journey, no UI review, no steward (the gate's verdict is no surface).
