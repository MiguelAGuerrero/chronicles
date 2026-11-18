# The React Compiler: plan (RC1-RC3)

Built on the owner's go-ahead of Nov 18: no stop at this plan. Decision 0203.

- `app.json`: `experiments.reactCompiler: true` (babel-preset-expo 58 reads it; `@expo/metro-config` passes it to Metro,
  `expo export` to the build).
- `src/lib/__tests__/arch/compiler.baseline.json`: the 44 functions skipped today (`file:function: reason`).
- No app code changes: a skipped function runs as before.

## Tests (feature `arch`)

| Id | Test |
|---|---|
| RC1 | `arch/reactCompiler.test.ts`: `app.json` sets it; and the `launch` journey reads the exported bundle for the compiler runtime's memo-cache sentinel |
| RC2 | `arch/reactCompiler.test.ts`: babel-plugin-react-compiler over `src/app` and `src/components`; the skipped set is within the baseline (a new skip fails; one that compiles now asks for its line to go) |
| RC3 | the `walk` journey's render window: `render:walk` at most 2.0/s |

## Cost

Measured before and after with `perf-walk.js` (3 min) and `perf-explore.js` (6 switches, 6 drags at 4x CPU) on the
web build, nothing else running. The compiler adds a memo cache per compiled component (memory) and saves renders.
Native: device only (an item in `docs/NATIVE_UNVERIFIED.md`).

## Verification

`npm test`, typecheck, lint, and every journey `check:affected` names on the /chronicles build: the compiler touches
every screen, so this is close to the whole set; the full flow (no `E2E_ONLY`) only if the owner asks.

## Deferred

- The 44 skipped functions (29 behind an eslint-disable of a React rule, 13 unsupported syntax, 1 ref read during
  render): each is a cleanup that lets it compile, taken by the next sweep of its area.
