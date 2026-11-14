<!-- Code quality. Written in the repo first (2026-11-14) from the owner's calls in session; an engineering slice,
     not a product tab of the concept doc. Follows "Functional core" (specs/functional-core/) and "Affected checks"
     (specs/affected-checks/). The findings it starts from: https://claude.ai/artifact/Sys3voC6LZ3jGFgxPTo49w -->

# Code quality: facts, a ratchet, and a refactor step per slice (CQ)

The functional core holds: 99.7% of core functions read as pure. The drift is elsewhere: six screen components hold 45% of
the app's hook calls and have grown every week, 1,921 lines of pure logic sit in views and shells, 248 errors are swallowed
without a word, and a rule written in prose ("don't add more" local-time reads in core) went from 4 files to 12 because
nothing checked it. This slice turns the facts `npm run quality` already reports into a gate that only lets the code get
better, and adds `/refactor`: a step at the end of every slice, and in every `/tend` sweep, that applies a fixed catalog of
behaviour-preserving moves to the files in scope. A rule a script can hold is held by a script.

## Vision

Idea: a ratchet on code-quality facts and a /refactor step per slice, so the code base gets only better slice by slice.
Verb: none (engineering: nothing a user sees or does changes)
Touches: none
Verdict: no surface
Shape: as asked
Criteria: none
Open: none

## Criteria

### The facts

1. **CQ1 · Deterministic.** `npm run quality -- --json <file>` over the same tree and history writes the same bytes twice;
   nothing in it depends on the clock, the machine or the order files are read in.
2. **CQ2 · Size and shape.** Per file: lines and code lines. Per function: lines, branches (cyclomatic), deepest nesting,
   parameters, hook calls by name; a component's props. Each is checked on a fixture with a known answer.
3. **CQ3 · The functional core.** A function is judged pure or not, with its reasons (a hidden input, an await, a hook, JSX,
   a write outside itself, a reach into a non-core import); class members get no verdict. Pure functions of 5+ lines outside
   core are listed; so are core functions that read local time, exported core functions that mutate an argument, shell and
   adapter functions over 8 branches, shells that import `db`, `ports`, `recorder` or `notifier`, and `src/lib` files that
   import `src/components` or `src/app`. Each has a fixture that holds it and a look-alike that doesn't.
4. **CQ4 · Errors.** `.catch` with an empty handler (or one returning nothing) and an empty `catch` block are listed as
   swallowed; with `--types`, a call whose value is a promise that nothing awaits, returns, voids or catches is listed as
   floating. Each with a fixture and a look-alike (`.catch(handle)`, `void p`, `await p`, `.then(a, b)`).
5. **CQ5 · React.** Listed, each with a fixture and a look-alike: an effect whose own body only sets state; three or more
   setters called together in three or more callbacks; a component over 10 props; `Platform.OS` in a file that has no
   `.web`/`.native` sibling; a `useStore` selector that builds a new object or array; `react-hooks/exhaustive-deps` turned
   off; a hard-coded colour.
6. **CQ6 · The graph and copies.** Import cycles; exports no production file imports (Expo Router's route exports and
   modules loaded by `new URL('./x', import.meta.url)` count as used); modules nothing imports; copies of 70+ normalised
   tokens across files (renamed copies included); the same function body in two files; files in different features that
   change together in 6+ commits with no import between them.
7. **CQ7 · Repo invariants.** A `readTrace` call that leaves out `pauses`, `stills` or `fills` is listed, unless the same
   function passes its result to `withFilled`, or the line before the call says why in a `// readTrace: <reason>` comment.

### The gate

8. **CQ8 · Limits.** New code meets: a file at most 400 lines; a non-UI function at most 60 lines and 15 branches; a
   component at most 250 lines, 20 hook calls and 10 props; nesting below 5; a shell function at most 8 branches; and none
   of: a pure function of 5+ lines outside core, a swallowed error, a floating promise, a new clone, an unused value export,
   an import cycle, a shell on a singleton, `src/lib` importing views, local time read in core, a `readTrace` call missing
   context, a dead module, a derived-state effect, a fresh selector, a test with no assertion, a new `Platform.OS`,
   colour literal or hook-deps suppression in a file.
9. **CQ9 · The baseline.** `scripts/quality.baseline.json` records today's violations by stable ids (file, then function or
   component name, never a line number), so moving code within a file changes nothing. It is written once, by
   `npm run quality -- --baseline` on a tree with no baseline, and never by hand.
10. **CQ10 · Only better.** `npm run check:quality` fails when a recorded file or function got worse on a recorded
    metric, or new code breaks a limit. Its message names the file, the function, the metric, the ceiling or limit, and the
    catalog move that fixes it (R1-R16). A file over 400 lines may not grow at all (the owner, 2026-11-14).
11. **CQ11 · Tighten, never loosen.** An improvement leaves a stale entry, and the gate fails until
    `npm run quality -- --tighten` lowers it. `--tighten` only lowers values and removes entries; asked to raise one or add
    one, it refuses and says why. A ceiling test in `arch/` holds each list's length and each total, like
    `functional-core audit 7`.
12. **CQ12 · Enforced.** `npm test` runs the gate without `--types`; `npm run check:affected` runs `check:quality`
    (with `--types`) after the layer check; CI runs `check:quality`. `npm test` grows by at most 6 seconds.

### The step

13. **CQ13 · Scope and queue.** `npm run quality -- --scope` takes the files `check:affected` calls changed plus the other
    source files of their features (`scripts/features.js`); `--scope <feature>` takes one feature. It prints the gate's
    result for the scope, then a queue of catalog moves found in it, ranked by the file's commits times its branches, ties
    by path, each with its move, file, line and evidence.
14. **CQ14 · Behaviour kept.** A commit whose subject starts `refactor ` changes no line of an existing test file except to
    add, and `npm run check:refactor` (and CI, over agent commits) fails one that does, naming the file and line.
15. **CQ15 · The skill.** `/refactor` runs after a slice's tests are green and before `/docs-gc`, and in each `/tend`
    sweep over the area it sweeps: it fixes what the slice made worse, applies up to 3 moves from the queue, one commit each
    named `refactor <feature> N: R<k> <what>`, tightens the baseline, and files anything architectural or behavioural
    for the owner. It never pushes on its own grant and never changes behaviour. `/slice`, `/tend`, `.claude/skills/README.md`
    and `.claude/rules/refactoring.md` (the catalog's recipes) say so, and `procedures.test.ts` holds the wiring.

## Tests

- Fixture trees in a temp folder, as `functionalCoreAudit.test.ts` builds them: CQ2-CQ7 (one finding and one look-alike
  per analyzer), CQ8-CQ11 (a baseline, a regression, an improvement, `--tighten`'s refusals), CQ13 (a scope and a queue on a
  tiny git repo).
- CQ1: two runs over this repo compared byte for byte.
- CQ12: the arch test runs the gate over the repo and times it; `affected.test.ts` holds that `check` runs `check:quality`.
- CQ14: a throwaway git repo with a refactor commit that adds a test and one that edits an assertion.
- CQ15: `procedures.test.ts` reads the skill files.

## Decisions

- 2026-11-14 (the owner): report first, then build; the TypeScript compiler API and git only, no new dependency; ratchet
  baselines; a refactor step at the end of each slice that commits on the slice's branch and never pushes.
- 2026-11-14 (the owner): a file over the limit is frozen; up to 3 moves per slice plus dedicated decomposition slices for
  `walk.tsx` and `WalkMap.web.tsx`; `/tend` sweeps use the same queue.
- 2026-11-14 (the owner): no swallowed errors: a caught error is handled by its kind (a failed save shown with Try again, a
  platform refusal turned into state, cache work marked for recompute, a read fallback recorded) and written to a local
  diagnostics log the walker can share. Its own slice; this one only stops new swallows.
- 2026-11-14 (the owner): a colour palette module of semantic tokens; its own slice. `components/map/types.ts` moves into
  `src/lib/map/`; the first queue item.
- 2026-11-14 (the owner, by the gate): Walk me back follows kept and self-filled stretches (aligned); a `/fix`.

## Open

- None for this slice. The follow-ups are filed in `docs/STATUS.md` by the plan.
