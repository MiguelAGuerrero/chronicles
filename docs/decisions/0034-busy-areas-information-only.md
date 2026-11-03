# 0034. Busy areas are information only

Date: 2026-11-01 · Status: accepted · Area: landing

## Context
v1.5 landing ("What's good here", a home long press from z10) found hotspots and offered a landing on them: a Start here pin, a card and Walk the loop. Explore (0031) took over discovery in the moment.

## Decision
The owner's call, Nov 1: busy areas are information only. No Start here pin, no card, no Walk the loop (L10, L13, L16 retired by explore). `analysis.landing` is still computed and stored; nothing draws it.

## Consequences
- `landing/read.ts` and `landing/analyze.ts` (pure) still find strips and pockets by density; hotspots are magenta (`HOTSPOT`, `HOTSPOT_PIN`), the one hue no other layer uses.
- Remembered areas (`landing` store: SQLite migration 7, IndexedDB v6) are a cache kept across builds, drawn dimmed when stale (`LANDING_CODE`, bumped by hand).
- On the walk, only while exploring: the "On <strip>" chip and the dead-zone pill (`landing/walk.ts`, `stripAt`, `deadZoneDue`).
- The ordinary activity of an area shows as its busy streets rather than as marks (0044).
