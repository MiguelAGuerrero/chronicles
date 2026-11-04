# 0077. Busy streets measure the density of places, from OpenStreetMap and Overture

Date: 2026-11-03 · Status: accepted · Area: landing, explore

## Context
On South Main Street in Phillipsburg, New Jersey, by the park, the owner saw stores and no busy street. Three causes were found:
- density counted only the categories in the marks table;
- the thresholds were fixed (≥5 places, ≥1 per 40 m, ≥200 m);
- the Explore tab dropped pockets.

OpenStreetMap is also thin on shops in small US towns. Overture Maps Places' tiles over downtown Phillipsburg hold 86 places on Main Street with confidence ≥ 0.8 (release 2026-10-21.0).

Research covered how centres are found from map data and which public sources exist. Foot-traffic sources were ruled out: none fits local-only, and none is free or storable.

## Decision
The owner's calls, Nov 3:
- **Density of places is the measure, not busyness.** Stores, attractions and points of interest, as a proxy for where a town centres.
- **Places come from OpenStreetMap and Overture Places.** Overture is read by tile, with no key and no account.
- **Every place counts.** Everyday services count less.
- **Grades are judged against each town, above a floor.** Every town shows where its activity centres; a residential area shows nothing.
- **Shown as graded magenta streets**, evolving the existing busy-street shading.

## Consequences
- The spec is `specs/activity-density/spec.md` (AD1-AD16); the plan is `specs/activity-density/plan.md`. The owner took the plan's defaults (Nov 3): the `pmtiles` library, and following Overture's newest release automatically.
- **Network:** a second network host, Overture's public S3 bucket, is read by tile like the map.
- **Marks and bars unchanged:** marks, finds and the atlas's presence bars stay on OpenStreetMap.
- **Supersedes:** the v1.5 landing rules for strips and pockets (L4, L5) once built.
