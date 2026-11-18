# 0203. The React Compiler is on

Date: 2026-11-18 · Status: accepted · Area: performance, every screen

## Context
The performance investigation of Nov 16 found the React Compiler off: `app.json` had no `experiments.reactCompiler`, and
babel-preset-expo 58 runs it only from that flag, so only its lint rules ran while the docs and the reviews assumed
components were memoized. Nothing memoized what the code didn't; an inline object or closure broke every `memo` below it.

## Decision
The owner, Nov 16: "Separate slice, measured." Nov 18: "with reasonable defaults forward", then "/deploy then /slice".
The compiler is on for every platform (`experiments.reactCompiler: true`). The functions it cannot compile today (44:
29 behind an `eslint-disable` of a React rule, 13 of syntax it does not handle, 1 reading a ref during render) run as
before and are listed in `src/lib/__tests__/arch/compiler.baseline.json`, which only shrinks: new code compiles
(`arch/reactCompiler.test.ts`, RC2).

## Measured (web build, one run each, nothing else running)
- Explore, a neighbourhood switch at 4x CPU: p95 frame 100 → 83 ms, long tasks 2.09 → 1.74 s, script 1.16 → 1.01 s.
- Explore, a drag with Move map: about the same (p95 66.7 ms; long tasks 3.31 → 3.19 s).
- A walk, 3 min: the walk screen 0.97 renders/s and the map 0.77, unchanged (the compiler saves its children's renders,
  not the screen's own); heap 25.3 → 25.9 MB.
- The entry bundle 5.14 → 5.34 MB (each compiled component's memo cache).

## Consequences
- Code still says what it means: the compiler is not a reason to drop the native map's explicit `memo` sources (a
  skipped function gets nothing from it), nor to leave per-frame state above a costly tree.
- A new skip fails `npm test` with what to fix; a skip that compiles again asks for its line to go.
- The phone has never run it (`docs/NATIVE_UNVERIFIED.md`).
