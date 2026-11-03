# 0019. Home is the places map; the log screen is gone

Date: 2026-10 (v0.5) · Status: accepted · Area: home

## Context
v0 had a log screen. The owner's call for v0.5.

## Decision
`src/app/(tabs)/chronicle.tsx` (the Chronicle tab, once the home) shows stars where walks were, at the level for the zoom (`levelForZoom`: neighborhoods from z11, towns from z6, states below, countries below z3 once two countries are walked). Stars merge within 44 px, and all are one size. A bottom sheet (`HomeSheet`, built on Animated and responders, no library) peeks and opens to the walks list or a place's walks. Start floats above it. It reads only walks, summaries, `Area` and `WalkArea` (`places.ts`), never traces or media.

## Consequences
- Walks with no places are placed in one pass behind a cover (`placeAll`, `lib/backlog.ts`, the home's one read of traces).
- The map refits only when the places walked change; a merged star zooms to its points; the 8 busiest single stars show their name; "Elsewhere in" its state for a walk with no town.
- Widened by moments: the home reads every capture row for the days list (0035). The three tabs put this on Navigate and Chronicle (0020); the peek's header is a Walks | Days switch (0050).
