# 0057. Only a bridge or tunnel leaves the ground; lines on different levels meet only where one lands on the other

Date: 2026-11-03 · Status: accepted · Area: streets, navigation

## Context
The concept doc's "Bridges and Open in Maps" tab, NB1-NB7; Nov 3, after a route turned the owner off a bridge onto the path under it. Bridges and tunnels had joined the streets they cross (deferred in 0017).

## Decision
Only a bridge or tunnel leaves the ground (`levelOf`): a bridge at its `layer`, else 1; a tunnel at its `layer`, else 0. A `layer` on anything else is ignored. Lines on different levels meet only where one lands on the other: an end of it touches the other line, and that end touches nothing else on its own level. A route starts on the street you walk along (`streetRouteSource` `join` with `RouteHint.heading`): within `NAV.headingJoinM` (12 m), one within 35° of the heading wins.

## Consequences
- Crosswalk removal, stitching and the sidewalk merge compare levels (`landings`); junction keys are per line (`withJunctions`); the route graph merges a piece end only with another piece's end (`streetRoute.ts` `addEnd`).
- `STREET_CODE` 3 purges the cache once. Real Zurich tiles: about 180 fewer pieces of 22,300, identical ids with the tags stripped.
- Audit (Nov 3): 11 findings, 7 fixed (`bridges audit N` in `bridges.test.ts`). Deferred: `MERGE_M` at a chunk end over a junction below, the heading window at an alley mouth, indoor `level`.
