# 0073. A functional core, imperative shell, checked by tools

Date: 2026-11-03 · Status: accepted · Area: architecture, process

## Context
On Nov 1 the owner chose "functional core, imperative shell for new code", from the "Chronicles: functional core assessment" doc (https://claude.ai/artifact/NvVJu2kspKdmY2DFgXTvz1). Its foundations (ports, fakes, a Db contract, typed meta, a store, lint lists) sat on `claude/functional-core-foundations` and never merged; every slice since was written without them. "Pure" was a label in `docs/ARCHITECTURE.md` that nothing checked, and screens such as `walk.tsx` (1,714 lines, 35 effects) read and write the db, decide and render at once, so their rules can only be tested by the e2e.

On Nov 3 the owner restated the goal: rigour, and a clear separation of behaviour and state, so that testing is straightforward and agents get modules with a clear purpose and no side effects leaking elsewhere. Not 100% purity. A research pass ("Functional style in stateful UI apps", Nov 3, `docs/research/functional-style-in-stateful-ui-apps.md`) graded the practices by evidence.

## Decision
- Four layers, declared by each `src/lib` module on its first line: `core`, `shell`, `adapter`, `view`. Core has no hidden inputs and imports only core.
- The rules are checked, not written down only: `npm test` checks the tags and core's imports; lint checks core's hidden inputs and views' imports of the db, recorder and notifier. Existing violations sit in baselines that can only shrink (a JSON baseline, and ESLint's bulk suppressions), replacing the branch's hand-kept `LEGACY_*` lists.
- The Nov 1 foundations come to main by cherry-pick (`561b439`), brought up to date; the branch's 84-line AGENTS.md section is replaced by `.claude/rules/functional-core.md`.
- Views never import `ports` or the singletons (the audit's finding 5; the owner took the default, Nov 3): a shell module exports a factory taking ports, which tests call with fakes, and the app's instance built from `ports`, which views import.
- Shell tests assert the end state by default; the call log only where order is the requirement.
- Reducers (effects as data) only for tangled flows, by the rule file's two-of-five test.
- Screens move over one effect cluster per slice, starting with `walk.tsx`'s fog refresh; never in one rewrite.

## Why
The research found the separation itself well supported (Bernhardt's functional core, Normand's actions and calculations, Seemann's impureim sandwich, React's own rules), and the gap here to be enforcement rather than doctrine. The evidence that it makes AI agents better maintainers is thin; what is measured is that agent-written code erodes and that prose guidance slows it less than checks do. So the rules are checks whose messages name the fix, and the `walk.tsx` slices are the experiment: track its effect count, shell-test time against e2e time, and regressions in moved and unmoved areas.

## Consequences
- New code in a view can't import the db: it adds a shell taking `ports`.
- A new `Db` method needs a contract case and a fake implementation.
- A new meta key is declared in `lib/meta.ts` first.
- Native: the real ports and the SQLite adapter's match to the contract have not run on a device.
