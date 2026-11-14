---
paths:
  - "scripts/quality/**"
  - "scripts/quality.baseline.json"
  - "scripts/refactor-commits.js"
  - ".claude/skills/refactor/**"
---
# Refactoring: the gate and the catalog

The code-quality gate and the moves that satisfy it (decision 0178, `specs/code-quality/spec.md`, CQ1-CQ15). The
procedure is `/refactor` (`.claude/skills/refactor/SKILL.md`); this file is the catalog it applies.

## The gate

- **Facts, then a verdict.** `npm run quality` reads src through the TypeScript compiler API and git
  (`scripts/quality/`: `functions.js` sizes, branches, purity; `patterns.js` the repo's rules, errors, React;
  `graph.js` imports and exports; `clones.js` copies; `history.js` change coupling; `types.js` floating promises).
  `limits.js` turns facts into violations, each with its move. No dependency: the owner's call.
- **The limits for new code:** a file 400 lines; a non-UI function 60 lines and 15 branches; a component or hook 250
  lines, 20 hook calls, 10 props; nesting under 5; a shell or adapter function 8 branches. And none of the list
  metrics (`limits.js`). Lines are counted as an editor counts them.
- **The baseline** (`scripts/quality.baseline.json`) holds today's violations by stable id: `<metric>:<file>#<name>`,
  a name repeated in one file numbered `~2`, `~3`; never a line. Moving code within a file changes nothing.
- **Only better.** `check:quality` fails on new code past a limit, a recorded entry that got worse, and one that got
  better until `npm run quality -- --tighten`. A file over 400 lines is frozen: not one line more. `--tighten`
  refuses anything worse or new; `--baseline` writes only when there is none. Never edit the file by hand:
  `quality.test.ts` fails a baseline looser than the merge base's.
- **Where it runs:** `npm test` without the type checker; `check:affected` and CI with it (`check:quality`).
- **Refactor commits** (`refactor <feature> N: R<k> …`) never change or remove a line of an existing test
  (`check:refactor`; CI over agent commits). A test that must change means behaviour changed: not a refactor.
- **Traps.** A clone counts on both files, so a copy made in one fails the gate on the other too. A component's
  nested callbacks are measured on their own (a 300-line `useEffect` body is a long non-UI function). `--scope`
  without a feature reads the changed files from `scripts/affected.js`, so a branch with no merge base scopes
  everything.

## The catalog

Each move keeps behaviour. "Test first" means the new test is written and failing (or, for code that moves, passing
against the old place) before the move.

- **R1 Pure logic to core.** A pure function of 5+ lines in a view, shell or adapter moves to a core module beside its
  feature (`// @layer core`), unit test first; the old file imports it.
- **R2 One copy.** A clone or an identical body: keep one, in the core module the copies share, and import it. Check the
  bodies: the same name is not the same function.
- **R3 Hoist a closure.** A closure inside a component that captures nothing moves to module level; then R1 if pure.
- **R4 Split a god file or component.** One effect cluster (its state, refs and effects) into a custom hook, or one
  region of JSX into a component, per move; the screen's journey is the safety net (functional-core.md, "Moving a
  screen over"). Wide props: group what travels together into one object, or split the component by job.
- **R5 Shell into factory and instance.** `createX(p: Pick<Ports, …>)` in `shell.ts`, the app's instance in
  `index.ts` with `// @instance`; a `fakePorts()` test of the factory first.
- **R6 Dependency direction.** Code in `src/lib` that `src/components` or `src/app` holds moves into `src/lib` with its
  layer tag; types may stay imported by type.
- **R7 An export nothing imports.** Drop `export`, or the code if nothing local uses it.
- **R8 Split a long or branchy function.** At its phases, into named helpers; a table or a map over an if-chain;
  early returns over nesting. Its existing tests, unchanged, are the proof.
- **R9 Break a cycle.** Move the shared piece down a layer, or pass it in.
- **R10 Handle an error by its kind.** (Waits on the errors slice.) A failed save is shown with Try again; a platform
  refusal becomes state; cache work is marked for recompute; a read fallback is recorded; every one is written to
  the diagnostics log. `void` or `await` a floating call whose rejection is handled downstream.
- **R11 A reducer.** Setters always called together, when the reducer test in functional-core.md passes: one
  `step(state, event)` in core, unit tested first; the component dispatches.
- **R12 Platform.OS into a file pair.** `x.web.ts` and `x.native.ts` behind one interface (`x.types.ts`); the native
  side goes in `docs/NATIVE_UNVERIFIED.md`.
- **R13 A decision out of a shell.** Read, decide, write: the decision becomes a core function the shell calls, unit
  tested first, then the shell's `fakePorts()` test.
- **R14 Local time passed in.** A core function that reads `getHours`, `getDay`, `toLocale…` takes a calendar function
  or an offset as an argument, as it takes `now`; its tests fix the zone.
- **R15 A dead module.** Delete it after checking for dynamic loads (`require`, `import()`, `new URL`).
- **R16 A colour literal to a token.** (Waits on the palette slice.) The literal becomes the semantic token it means.
- **R17 Context for a call.** `readTrace` gets the walk's pauses, stills and fills, or the line before it says why not
  (`// readTrace: <reason>`). Passing what was missing changes behaviour: the owner's call, filed.
- **R18 A new value, not a mutated argument.** An exported core function returns what it changed; the caller keeps the
  state (a shell's `Store`).
- **R19 Honest hook dependencies.** A suppressed `exhaustive-deps` goes: the callback into a ref updated in an effect
  (AGENTS.md, React Compiler), or the effect split by what it reacts to.
- **R20 Derive in render.** An effect that only sets state becomes a value computed in render (`useMemo` only if
  measured); a selector returns a field or a primitive.
- **R21 A test that can fail.** A test with no assertion gets the assertion its name promises, or goes.
