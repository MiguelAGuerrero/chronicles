# 0082. The town you are in is the one whose border you are inside

Date: 2026-11-04 · Status: accepted · Area: places-and-areas, explore

## Context
At Planet Fitness, 2677 MacArthur Rd, Whitehall PA, the Explore tab said Catasauqua. Towns were judged by label points: the nearest town point within 3 km, the closer for its size. Whitehall is a township with no town label point in the map tiles, so Catasauqua's point, 1.8 km away, won. States already used real outlines (the Natural Earth pack).

Overture Maps' divisions (release 2026-10-21.0) have a locality outline named Whitehall that holds the gym; its own point is in the next tile over. Census-designated places such as Fullerton have no outline there, so the smallest locality outline over a point is its municipality. Midtown Manhattan is inside both Manhattan's and New York's. Overture's neighborhood outlines are mostly districts: Midtown's is "Manhattan Community Board 5".

Sources considered: Overture divisions; US Census TIGER (Places, County Subdivisions), which is US-only and whose host is unreachable from cloud sessions; OpenStreetMap's admin boundaries, which reach the app only as unnamed lines in the map tiles; Who's On First, which is large and also unreachable.

## Decision
The owner's calls, Nov 4:
- **Source:** Overture divisions, read by z12 tile from the Overture bucket already used for places (decision 0080).
- **No outline:** where no outline read covers a point (no data, offline, unincorporated), the nearest-point rule stands as before.
- **Nesting:** the municipality is the town: the smallest locality outline holding the point.
- **Neighborhoods:** a neighborhood point counts only inside the same town outline. Overture's neighborhood outlines are not used (the owner took the default, Nov 4, after being shown the district names).
- **Kept on the phone:** read outlines are a cache (the default the owner took, Nov 4), so later answers need no network.

## Consequences
- The spec is `specs/town-outlines/spec.md` (TO1-TO12); the plan is `specs/town-outlines/plan.md`.
- `AREA_RULES` 2 places every walk again once; `ATLAS_CODE` a3 lists the Explore tab again. A new Overture release alone re-places nothing.
- New cache `outline_tile`: SQLite migration 16, IndexedDB v14, in `DERIVED_STORES`.
- A walk whose outlines couldn't be read is placed by points and tried again later; one wider than 12 tiles is placed by points for good.
