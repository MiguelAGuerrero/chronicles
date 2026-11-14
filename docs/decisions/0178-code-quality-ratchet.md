# 0178. Code quality is a ratchet, and every slice ends with a refactor step

Date: 2026-11-14 · Status: accepted · Area: process, architecture

## Context
The owner asked for an investigation of the code's quality (duplication, framework practice, patterns, god
files, drift, smells) that scripts could derive deterministically, to become a refactor skill applied per
slice so the code base never drifts into unmaintainability. The report (`npm run quality`, the findings at
https://claude.ai/artifact/Sys3voC6LZ3jGFgxPTo49w) found the functional core healthy (99.7% of core
functions pure) and the drift elsewhere: six screen components held 45% of the app's hook calls and grew
every week, 1,921 lines of pure logic sat in views and shells, 248 errors were swallowed, and a rule kept in
prose ("don't add more" local-time reads in core) had gone from 4 files to 12. While the slice was built,
`main` added 38 more regressions the gate would have stopped.

## Decision
The owner's calls, Nov 14:
- **Report, then build;** the TypeScript compiler API and git only, no new dependency.
- **A ratchet:** today's violations are a baseline that only shrinks; new code meets the limits
  (`scripts/quality/limits.js`): a file 400 lines, a non-UI function 60 lines and 15 branches, a component
  250 lines, 20 hook calls and 10 props, nesting under 5, a shell function 8 branches, and none of the list
  metrics. **A file over the limit is frozen:** a slice that adds to it moves code out first.
- **A refactor step at the end of every slice** (`/refactor`, after green, before `/docs-gc`): what the slice
  made worse, then up to 3 moves from the ranked queue, on the slice's branch, never pushed on its own grant,
  never changing behaviour (`check:refactor`). **`/tend` sweeps use the same queue.**
- **Dedicated decomposition slices** for `src/app/walk.tsx` and `src/components/map/WalkMap.web.tsx`.
- **`src/components/map/types.ts` moves into `src/lib/map/`** (its pure functions tagged core): the one
  dependency-direction break, the first queue item.

## Consequences
- `npm run check:quality` (CI, `check:affected`; `npm test` without the type checker), `npm run quality --
  --scope | --tighten | --baseline`, `npm run check:refactor`; `.claude/rules/refactoring.md` holds the
  catalog R1-R21; `.claude/skills/refactor/SKILL.md` the step. Spec: `specs/code-quality/spec.md`.
- The baseline was first written from the tree as merged with `main` on Nov 14 (849 entries); from then on
  only `--tighten` changes it.
- Errors handled by kind (decision 0179) and the palette (decision 0180) are their own slices; until they land
  the gate stops new swallowed errors and new colour literals, and the queue does not offer R10 or R16.
- Walk me back over kept and self-filled stretches was gated aligned (decision 0060 already makes a filled
  stretch walked trace in every way); a `/fix`, since it changes behaviour.
