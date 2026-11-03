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
- Which flows become reducers: the rule's "two of five" test names the walk lifecycle and the voice memo as candidates.
