# 0025. The live dot is a Kalman filter fed per fix, glided by the map without re-rendering the screen

Date: 2026-11-01 · Status: accepted · Area: walk screen, trace

## Context
The owner's go-ahead, Nov 1, after the dot lagged, slid back over walked ground and swung at sharp angles: it was the newest point of a trace re-read every 2 s.

## Decision
Each fix updates the dot at once through a constant-velocity Kalman filter per axis. The map glides to it without re-rendering the walk screen, toward `lead`: one fix interval ahead while moving, so the glide ends where the walker is. Without motion it is held still unless the speed is steady in one direction for 3 fixes and, from a standstill, the fix left by its accuracy. A gap over 60 s or a jump over 150 m restarts it at the fix.

## Consequences
- `liveDot.ts`, `DotStore` fed in `useLiveTrace`, `useGlideFrames(..., source)`.
- A short link line joins the trace's end to the dot (60 m at most), drawn once per fix (`setData:trace-link`), never per frame; the native link line is unverified.
- The e2e reads the dot's spot from `data-at` on the puck (only when `window.__perf` is set) and checks it moves on every fix.
- Motion feeds it through `setMotion` (0026).
