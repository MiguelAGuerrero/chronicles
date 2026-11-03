# 0028. The trace is green, on a white edge, and the fog is quiet

Date: 2026-11-01 · Status: accepted · Area: map, fog

## Context
The owner's call, Nov 1, after a scan's read filled a phone's walk map with grey.

## Decision
Fog is `FOG_STYLE`: 50% opacity, 1–2.5 px, narrower than the 4.5 px trace. It is bold only while "unwalked streets near me" is on.

## Consequences
- `colors.test.ts` checks the hues and contrasts.
- The route is 8 px on a 12 px white edge, under the trace; rides are dashed in the trace's green on its white edge (`RIDE_DASH`, 0040); hotspots are magenta (`HOTSPOT`), the one hue no other layer uses.
