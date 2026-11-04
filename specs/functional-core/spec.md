<!-- Functional core, slice 1: the convention and its checks. Written in the repo first (2026-11-03) from the owner's
     go-ahead in session; an engineering slice, not a product tab of the concept doc. Grounded in the research report
     "Functional style in stateful UI apps" (2026-11-03) and the owner's Nov 1 call (claude/functional-core-foundations). -->

# Functional core, slice 1: the convention and its checks (FC)

Decisions are data and pure functions; effects live in a thin shell. Today that holds for about 80 modules in `src/lib`, but only by habit: "pure" is a label in `docs/ARCHITECTURE.md` that nothing checks, and every screen reads and writes the db itself. This slice makes the line explicit and checked, and lands the pieces a shell needs to be tested without a browser (ports, fakes, a contract suite for the fake db, typed meta, a store). It changes no behaviour: no screen moves over yet. The walk screen follows, one effect cluster per slice, starting with the fog refresh.

## Criteria

1. **FC1 · Every module says what it is.** Every non-test `.ts`/`.tsx` file under `src/lib` declares one layer in a header line: `core` (decisions and data), `shell` (carries out effects for a feature), `adapter` (a platform implementation behind an interface), or `view` (a React hook). A file with no layer, two, or an unknown one fails `npm test`, naming the file and the four layers.
2. **FC2 · Core imports only core.** A core module that imports a value from a non-core module, or from a package outside the short list of pure packages, fails `npm test`. The message names the file, the import, the layer it reaches and the fix (pass the value in, or move the code to a shell). Type-only imports pass. Because core may only import core, the rule holds transitively.
3. **FC3 · Core has no hidden inputs.** In a core module, reading the clock (`Date.now()`, `new Date()` with no argument, `performance.now()`), `Math.random()`, scheduling (`setTimeout`, `setInterval`, `requestAnimationFrame`), and module-level `let` or `var` fail `npm run lint` at the line, with a message naming the fix (take `now` or the id as an argument; keep state in a shell).
4. **FC4 · Old violations can only shrink.** Violations that exist when a rule lands are recorded in a baseline. A new violation fails. A recorded violation that no longer occurs also fails until it is removed from the baseline, so the baseline never holds stale entries.
5. **FC5 · Views don't reach the singletons.** Screens (`src/app`), components and view hooks that import the real `db`, `recorder` or `notifier` fail `npm run lint`, with a message naming the fix (a feature shell given `ports`). Imports that exist today are recorded as suppressions that can only shrink (FC4).
6. **FC6 · Ports and fakes.** A shell can be handed everything it reaches outside itself (db, recorder, notifier, clock, new ids) as one argument. `fakePorts()` gives in-memory versions that share one call log, can fail a named call on cue, and have a clock that moves only when told and ids that count up.
7. **FC7 · The fake db behaves like the real one.** One contract suite runs the same cases against the in-memory db and the web (IndexedDB) store. Every method of the `Db` interface has at least one contract case; a method without one fails `npm test`.
8. **FC8 · Meta keys are declared once.** Every meta key the app reads or writes is declared once, with its type, in one module. A key used in the code but not declared fails `npm test`.
9. **FC9 · A shell's state.** A store can be read, replaced and subscribed to; subscribers are told only when the state actually changed.
10. **FC10 · Nothing changes for the walker.** The e2e passes unchanged, with the render budget it already checks.

## Tests

- Unit tests (`npm test`): `layers.test.ts` (FC1, FC2, FC4, and FC3/FC5 by running the lint rules over small sources), `fakes.test.ts` (FC6), `db.contract.test.ts` (FC7), `meta.test.ts` (FC8), `store.test.ts` (FC9).
- E2E: unchanged, and green (FC10).
- Native: the real `ports` (built from the native db, recorder and notifier) and the native SQLite adapter are outside the contract suite; neither has run on a device.

## Decisions

- 2026-11-01: functional core, imperative shell for new code; ports, fakes, a Db contract, typed meta, a store (the owner's call; branch `claude/functional-core-foundations`, never merged).
- 2026-11-03: the owner restated the goal (clear separation of behaviour and state, not 100% purity) and chose: a layer tag per module plus a check in `npm test`; the convention first, then `walk.tsx`. After the research report, the owner approved slice 1 as recommended: the convention, the Nov 1 foundations cherry-picked onto main, the tags and check, and a small lint set for core. The research changed four things from Nov 1: an `adapter` layer; shrink-only baselines (ESLint bulk suppressions and a JSON baseline) in place of hand-kept `LEGACY_*` lists; shell tests assert the end state by default, the call log only where order is the requirement; `walk.tsx` moves one effect cluster per slice, not in one rewrite.

## Open

- Rules for shells (take `Ports`, never import the singletons) land with the first shell, in the fog-refresh slice.
- The Db contract found the web and native stores disagreeing in five places (`docs/DEFERRED.md`, Functional core): which side is right is the owner's call.
- Which flows become reducers: the rule's "two of five" test names the walk lifecycle and the voice memo as candidates.

## Audited (Nov 3)

One report-only pass found 14 issues (1 high, 6 medium, 7 low): 12 fixed, each behind a regression test in `functionalCoreAudit.test.ts`; 1 deferred; 1 fixed in part (the rest deferred).

1. One shared suppression count let a view swap a singleton import for a `Modal` import, and `places.ts` swap module state for `new Date()`: accept. FC5 has its own rule (`no-restricted-syntax`), and core keeps no suppressions (`placeAll`, `withTimeout` moved to `placeAll.ts`). `functional-core audit 1`.
2. `thumbPlan.ts` was core with a module-level `Map` it mutates: accept. `npm test` now finds mutated module-level containers in core; `thumbJob` moved to `thumbJob.ts` (shell). `functional-core audit 2`.
3. The import check missed `require()`, `import()` and all but one platform file of a split: accept. `functional-core audit 3`.
4. The fake recorder's `emit` didn't write the fix, unlike the real ones: accept. `functional-core audit 4`.
5. Views could reach all three singletons through `ports`: accept. FC5 covers `ports`; a shell exports its app instance, so views never import `ports`. `functional-core audit 5`.
6. The meta key scan missed double quotes, other constant names, function builders and templates: accept. Read from the syntax tree; an unreadable key must be accounted for. `functional-core audit 6`.
7. Nothing stopped a baseline from growing: accept. A ceiling per baseline in the test, to lower and never raise (it passes from the start: it is a guard, not a reproduction). `functional-core audit 7`.
8. FC5 matched the module path, flagging constants and shell functions: accept. It matches the imported names. `functional-core audit 8`.
9. `Modal.tsx` was exempt from FC5, and the config test compared the tags with themselves: accept. The test now reads the real config of every view and core file. `functional-core audit 9`.
10. FC3 missed `Date()`, `globalThis`/`window`, `crypto`, `queueMicrotask`, `requestIdleCallback`; `declare let` was flagged: accept in part. Those are flagged and `declare let` passes (`functional-core audit 10`); the timezone and locale read in core are deferred, and the limits are in the rule file.
11. Type-only modules and pure row codecs were tagged adapter, and the "which layer" test contradicted injected effects: accept. Retagged core; the rule says what is given stays core. `functional-core audit 11`.
12. The meta codecs didn't check the shape the call sites check: accept. JSON codecs take a shape check; words take a list. `functional-core audit 12`.
13. Pure helpers in `components/map/types.ts` have no layer check: defer (moving them is outside this slice; `docs/DEFERRED.md`).
14. The tests loaded `@typescript-eslint/parser`, not a declared dependency: accept. Resolved through `eslint-config-expo`. `functional-core audit 14`.

Native: no native path changes behaviour. The tag line on every `*.native.ts` displaced no directive. `lib/ports/index.ts` and the SQLite adapter's match to the contract have not run on a device (`docs/NATIVE_UNVERIFIED.md`).
