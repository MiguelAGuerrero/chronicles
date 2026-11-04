---
paths:
  - "src/**"
  - "scripts/layers.js"
  - "eslint.config.js"
  - "eslint-suppressions.json"
---
# Functional core, imperative shell

Decisions are data and plain functions; effects live in a thin shell. Draw the line at decisions, not at purity: a function may mutate its own locals, and React already requires most of this (derive in render, events in handlers, Effects only to sync with something outside). The owner's calls: `docs/decisions/0073-functional-core-checked.md`. The spec: `specs/functional-core/spec.md` (FC1-FC10).

## Layers

Every module in `src/lib` starts with one line, `// @layer core|shell|adapter|view`. `src/app` and `src/components` are views by folder.

| Layer | Holds | May import (values) |
|---|---|---|
| `core` | decisions, models, rules, reducers | core, `fflate`, `pbf`, `@mapbox/vector-tile`, JSON; types from anywhere |
| `shell` | one feature's effects: db reads and writes, timers, its `Store` | anything but views |
| `adapter` | a platform implementation behind an interface (`db/*`, `recorder/*`, `media/*`, ...) | anything |
| `view` | React hooks; with `src/app` and `src/components`, what renders | anything but the `db`, `recorder`, `notifier` and `ports` singletons |

- **Core has no hidden inputs.** Time, ids and randomness are arguments: `now: number`, not `Date.now()`; no `Math.random()`, `crypto`, timers, `window`/`globalThis` or module-level `let`/`var` (lint). A module-level `const` Map, Set, array or object that the file mutates is state too (`npm test`); a read-only lookup table is fine.
- **Known limits.** Lint can't follow an alias (`const now = Date.now`). The device's timezone and locale are read in core today (`getHours`, `toLocaleDateString` in `days.ts`, `walkTitle.ts`, `months.ts`, `explore.ts`): a hidden input left as it is (docs/DEFERRED.md); don't add more.
- **Which layer?** If it branches on data, it belongs in core. If it reaches the outside world itself (imports the db or a platform module, reads the clock, sets a timer, keeps state), it is a shell, or an adapter if it is the platform's side of an interface. Code that only calls what it is given (a transport, a timer function, a callback passed in) stays core: passing it in is the point. A file that does both is a shell until its decisions are pulled out into a core module beside it (as `placeAll.ts` from `places.ts`, `thumbJob.ts` from `thumbPlan.ts`). A file of types only is core.
- **Shells take their effects as an argument.** A shell module exports a factory, `createFog(p: Pick<Ports, 'db' | 'clock'>)`, which tests call with `fakePorts()`, and the app's instance, `export const fog = createFog(ports)` (`ports` from `lib/ports`: db, recorder, notifier, clock, newId). Views import the instance and call it; they never import `ports` or the singletons (lint). The two composition roots are `lib/ports/index.ts` and `index.js` (the background task).
- **A shell's state** is a `Store` (`lib/store.ts`), read by a view with `useStore(store, select)`. The selector returns a field or a primitive, never a new object or array, or the view re-renders on every change (the render budget).
- **Meta keys** go through `metaStore(db)` (`lib/meta.ts`); declare a key in `META` (or a `prefix:id` family in `META_FAMILIES`) before using it.

## Reducers only where a flow is tangled

Make a flow an explicit `step(state, event, now) => { state, effects }` (a discriminated union for the state, effects as data the shell runs) when two or more of these hold: impossible flag combinations, async work that can be cancelled or retried, timers driving steps, resume after a reload, an event that means different things in different phases. The walk lifecycle and the voice memo pass; the fog refresh doesn't (it is a sandwich: read, decide, write). No XState.

## Tests

- **Core:** unit tests, no fakes.
- **Shell:** `fakePorts()` (`__tests__/fakes`); `recorder.emit(fix)` writes the fix to the fake db, then tells subscribers, as the real recorders do. Assert the end state (what the fake db holds, what the store holds). Assert the call log (`log.effects()`) only where order is the requirement, or for the notifier and recorder, whose effects leave the app. `failNext` a call to test a failure path; a failure only the fake can produce is labelled so in the test name.
- **The fake db** is held to the real web store by one contract suite (`dbContract.ts`, run over both). A new or changed `Db` method gets a contract case first; `FC7 every Db method has a contract case` fails otherwise. SQLite can't run in Node.
- **Views:** the e2e checks what is seen.

## The checks, and how to shrink a baseline

- `npm test` (`layers.test.ts`): every module tagged; core imports only core. Known violations are in `src/lib/__tests__/layers.baseline.json`; fixing one fails the test until its line is deleted.
- `npm test` also checks core's mutated module-level containers, and the meta keys (`meta.test.ts`, read from the syntax tree: use a constant or a `(id) => \`family:${id}\`` builder, or the test asks where the key comes from).
- `npm run lint`: core's hidden inputs (FC3) and views' singleton imports (FC5, under `no-restricted-syntax`, a rule nothing else in a view uses, so a suppressed count can't hide a `Modal` or Reanimated import). Each message names the fix. Known violations are counted per file and rule in `eslint-suppressions.json`; only FC5 in views is there, core has none. After fixing some, run `npx eslint src index.js --prune-suppressions`; a stale count fails lint.
- Both baselines have a ceiling in `functionalCoreAudit.test.ts` (`functional-core audit 7`): lower it as you fix, never raise it. Never add to a baseline by hand, and never run `--suppress-all` or `--suppress-rule`: a new violation is fixed, not recorded.
- Moving a screen over: one effect cluster per slice, the e2e as the safety net, the decisions out first (test-first), then the shell against `fakePorts()`, then the view reads the store.
