---
name: refactor
description: The end-of-slice refactor step - read the code-quality facts for the slice's scope (npm run quality -- --scope), fix what the slice made worse, apply up to 3 behaviour-preserving moves from the catalog (.claude/rules/refactoring.md), tighten the baseline, file anything architectural. Run by /slice after its tests are green and before /docs-gc, and by /tend in each sweep; decision 0178.
when_to_use: A slice's tests are green (step 9 of /slice); a /tend sweep of an area; check:quality fails; the owner asks to refactor an area or a file.
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

# Refactor: leave the code better than the slice found it

The facts come from scripts, not opinion (`npm run quality`, `scripts/quality/`); the moves come from a fixed
catalog (`.claude/rules/refactoring.md`, R1-R21); the gate (`npm run check:quality`) holds what is gained. A
refactor keeps behaviour: if a test has to change, it is not a refactor (`npm run check:refactor`).
The owner's calls: decision 0178; the spec: `specs/code-quality/spec.md` (CQ1-CQ15).

## Who calls it, and what it may do

| Caller | Scope | Moves | Commits | Pushes |
|---|---|---|---|---|
| `/slice`, step 9, after green, before `/docs-gc` | `npm run quality -- --scope` (the slice's changed files and the rest of their features) | what the slice made worse, then up to 3 from the queue | on the slice's branch | never: the slice's own publishing does |
| `/tend`, in a sweep of an area | `npm run quality -- --scope <feature>` for each feature of the area | up to 3 from the queue | in the run's worktree | never on its own grant: the run publishes |
| the owner, `/refactor <feature or file>` | that feature, or the file's features | up to 3, or the number the owner names | on the current branch | never on its own grant |

`/refactor` never pushes on its own grant and never changes behaviour. A skill called by another asks the owner nothing and pushes nothing on its own authority; it returns its result block
(`.claude/skills/ship.md`) and the caller files or asks.

## 1. Read the scope

```bash
npm run quality -- --scope [<feature>]     # the gate for the scope, then the queue, ranked by commits × branches
npm run check:quality                      # the whole tree, with the type checker (floating promises)
```

The queue lists each move with its file, line and evidence. Moves waiting on their slice (R10 on errors handled by
kind, R16 on the palette) are named under the queue and not offered.

## 2. First, what the slice made worse

`check:quality` failing on the slice's own files comes first and does not count toward the 3:

- **New code past a limit**: fix it in the slice's own code. Never by adding to the baseline.
- **Worse than recorded**: a recorded file or function grew. A file over 400 lines is frozen: move code out of it
  (R1, R4, R13) before the slice's addition fits. If the slice cannot land without growing it, stop and ask the owner.
- **Better than recorded**: tighten (step 5).

## 3. Then up to 3 moves from the queue

Take them from the top of the queue, skipping one that is:

- **behavioural**: a move whose recipe changes what a person sees or what is stored (an error now shown, a trace read
  with its fills, R17 when the fix is to pass the context): file it, as the owner's call;
- **architectural**: a dependency, a migration, a navigation change, a module moved across `src/lib` and
  `src/components`, a derivation-rule bump, or more than about 8 source files: file it;
- **a god screen's split**: `walk.tsx` and `WalkMap.web.tsx` have their own decomposition slices; take a move there
  only if it is one effect cluster or one helper (R1, R3, R4 for one cluster).

Each move follows its recipe in `.claude/rules/refactoring.md`: logic moved to core gets its unit test first, a
shell split gets a `fakePorts()` test first, the rest rides on the tests and journeys that cover the file.

## 4. One commit per move

```
refactor <feature> N: R<k> <what moved, in a few words>

Evidence: <the queue line: file, line, metric>
Test: <the test written first, or "covered by" the tests and journeys that ran>
```

- `N` counts on from the last `refactor <feature> N` in `git log` (`git log --oneline --grep '^refactor <feature> '`).
- Per commit: `npm run check:affected` (layers, the gate, the tests the change reaches, typecheck, lint), and the
  journeys it names once at the end of the step (`docs/TESTING.md`).
- Existing tests are never edited: a refactor adds tests, it doesn't bend them (`npm run check:refactor`, CI).

## 5. Tighten

```bash
npm run quality -- --tighten     # lowers the values that improved, removes what is gone; refuses anything worse or new
```

Commit the tightened `scripts/quality.baseline.json` with the move that earned it. The baseline is written once by
`--baseline` and never by hand; `quality.test.ts` holds it no looser than `main`'s.

## 6. File the rest

Anything taken off the queue as behavioural or architectural goes to the owner: from `/slice`, a "From /slice
<slug>" item in `docs/STATUS.md`, "Needs the owner"; from `/tend`, an inbox entry, `[arch]` when architectural. Use
`npm run records` for both (decision 0156). A move left for later is not filed: the queue keeps it.

## Report

What moved, by queue line and commit; the baseline's count before and after; what was filed; then the result block.
Never claim a move ran on a phone: say "nothing here has run on a phone" when native files moved.
