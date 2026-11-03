# 0017. Navigation runs inside a walk, which keeps recording, with routes computed on the device

Date: 2026-10 (v0.5) · Status: accepted · Area: navigation

## Context
v0.5 navigate (walk me back is one use; the owner's calls).

## Decision
Navigation runs inside a walk, which keeps recording. The routes are computed on the device; nothing is sent anywhere. Sources sit behind `RouteSource`, so suggested spots or downloaded regions can add one without touching the navigator.

## Consequences
- `lib/nav/types.ts`; `traceRouteSource` (along this walk's trace), `streetRouteSource` (over the streets derived from tiles, read with `collect` at z14 first); `routeTo` tries the sources in order and says why when none can.
- `lib/nav/rules.ts`: a street within 150 m of each end; over 10 km is too far; off route is more than 50 m away for 2 fixes; arrival within 30 m.
- The destination is kept with the open walk (meta `nav`); Stop clears it.
- Deferred: bridges and tunnels still join the streets they cross (`docs/DEFERRED.md`).
