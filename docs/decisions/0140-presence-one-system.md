# 0140. Presence: one system says what a place is; consumers read its classes

Date: 2026-11-11 · Status: accepted · Area: explore, places, layers, landing, scenic routes, walk planner

## Context
The owner, renaming "busy" to "storefronts" (G2): "busy" implies traffic, which depends on the time of day, while the concept is the density of non-residential places you can walk into, a downtown strip or a corner pocket. They then asked that the taxonomy and classification of presence on a street be its own system, iterated and refined on its own, progressively enhanced to show kinds of urban or rural activity and institutions, and isolated from the consumers that rely on it; "busy" could then be built properly if traffic data ever exists, while storefronts is derivable from the same places and overlaid as a feature of the area.

What the code does today (`/tend inbox`, Nov 11): each source has its adapter, but what a place is gets decided several times, per consumer. `discovery/tilePois.ts` turns OpenStreetMap poi tags into categories and kinds for marks, bars, sights and the planner; `discovery/archivePois.ts` does the same for the places archive; `activity/weights.ts` keeps a second OpenStreetMap table and Overture's taxonomy as density weights for the busy layer, What's good here and route leaning (0080); `discovery/noise.ts`, `discovery/bars.ts` and `nav/scenicSignals.ts` add overlays, and scenic routes read raw landcover tags. The two OpenStreetMap tables disagree (memorials, libraries, worship, viewpoints, cinemas, shops), a museum is classified three ways, "notable" is decided twice, and a reclassification invalidates nothing by itself (`ATLAS_CODE` and `LANDING_CODE` are bumped by hand).

## Decision
The owner's calls, Nov 11, each the recommended option:
1. **One presence system.** Per-source adapters (tiles, the archive, Overture) normalise features; one pure classifier gives each feature its classes from one vocabulary, under one version code; a reclassification bumps that code and re-derives what depends on it. Layers, the area card's bars, marks, scenic routes, What's good here and the planner read classes, never source tags.
2. **Several classes per place.** A museum can be culture and history, a library civic and culture; the system says what a place is, each consumer chooses what it reads (as 0127 lets a place light two bars).
3. **Unify, and show the differences.** Where the two OpenStreetMap tables disagree, one answer wins per tag; each change a person can see is listed in the slice with before and after pictures for the owner, and caches are re-derived.
4. **Presence first, then G2 on it.** Storefronts is defined as a presence class and its density, not a renamed busy table.

Marks stay a separate judgement over classes (chains, notable names, what is worth the stop): curation is not classification. "Busy", if traffic or footfall data ever exists, is a signal of its own, not a reading of presence, and goes through the gate first (VISION.md Never, "Popularity, trending, foot traffic").

## Consequences
- Amends 0080: density weights become a function of presence classes, no longer a table of their own; Overture still feeds presence and density, never marks (0109).
- Keeps 0127: bars are a grouping over presence classes.
- The work is G3 in `docs/STATUS.md` (its first slice), then G2. Until then the tables stay as they are.
