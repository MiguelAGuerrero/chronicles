# 0088. Town borders are drawn on every map that shows a town

Date: 2026-11-04 · Status: accepted · Area: map, places-and-areas

## Context
Town outlines (decision 0083) made Explore say Whitehall at 2677 MacArthur Rd, but nothing showed the border itself. The owner expected the towns highlighted, the way states are on a US map. The z12 tiles that decide which town you're in are cut at their edges, so they would draw as boxes.

## Decision
The owner's calls, Nov 4:
- **Where:** every map that shows a town: Explore (and a town's page), Chronicle, the walk screen, the replay and a day.
- **How:** your town (or a walk's towns) tinted with a firm edge; the towns around drawn as thin lines. Chronicle tints every walked town alike, with no lines for the others; the walk screen draws lines only, the town you're in firmer.
- **Data:** borders are drawn from Overture's z10 divisions tile (about 40 km across, read once and kept); deciding stays on z12.

## Consequences
- The spec is `specs/town-borders/spec.md` (TB1-TB9); the plan is `specs/town-borders/plan.md`.
- `outline_tile` is keyed `z/x/y`: SQLite migration 18 and IndexedDB v15, both clearing the old rows.
- A walked town's region is one tint whatever was walked there: nothing is a score.
- After the deploy (Nov 4) the owner saw nothing on a phone: the tint went from 7% to 12%, the edges to 3 px and over the streets, and Explore frames the whole town (TB10-TB12).
- On native the border layers sit over the base map's streets (MapLibre RN has no base road layer id to go below); unverified on a device.
