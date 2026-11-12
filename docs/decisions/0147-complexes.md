# 0147. Complexes: a named place made of other places, on Explore and in a moment's line

Date: 2026-11-11 · Status: accepted · Area: explore, places, resurface

## Context
The owner, on a walk at Strawberry Square in Harrisburg: the map named it neither as an area nor as a point of interest. A shopping square, a mall or a campus is no attraction (shops are never marks) and no street (so no Busy area), yet it is a named place a walker would notice, and "a lot of activity in life" is what Explore is for. They asked what it should be called and where it sits.

## Decision
The owner's calls, Nov 11:
1. **The word is "complex"**, a subdivision of the neighborhood or town you are in, with kinds of its own.
2. **Explore and the arrival line only.** No star, no Area level, no replay line, no walk assigned to a complex (the vision gate, aligned if reshaped, `specs/complexes/spec.md`).
3. **Information only.** Never a mark, a "?" or a find.
4. **Outlines come from an in-app Overture adapter**: a named building polygon (`buildings`) that holds enough places, behind `ComplexSource` so a chronicles-data pack can replace it later.
5. **Five kinds from the named building's type and what it holds**: Shopping, Markets, Campuses, Stations and Civic, over the recommendation to build Shopping first and the rest as fixtures prove their rules. A courthouse or a hospital that holds enough places is therefore a Civic or Campus complex. The Capitol Complex is not found: Overture names its buildings one by one and carries no outline for it, and we never join buildings ourselves.
6. **Nearest first and a "See more"**, no cap (replacing the plan's six). The first four show; the rest follow the button; the label carries no number.
7. The steward's findings were accepted whole (Nov 11): a viewing never fetches a tile, the street stays in a moment's line, no "what it holds" line, the minimums are a gate and never a measure (0103), the outlines are quiet and named only at close zoom.
8. **A new derived store**, `complex` (SQLite migration 23, IndexedDB 19), one row per complex, cleared with the derived stores.

## Consequences
- The rule is `lib/complexes/rule.ts` (core), tuned on real Overture fixtures (`scripts/fixture-complexes.mjs`). A complex is judged only once every z14 tile that holds a vertex of its pieces is read, because tiles carry a buffer: Strawberry Square lies whole in one tile with a fragment in the next; the Lehigh Valley Mall is cut across two.
- A moment's arrival line leads with a complex already on the phone and keeps its street ("Strawberry Square, N 2nd St, Harrisburg"); nothing is fetched to show it.
- A name from OpenStreetMap's contributors is open-data presence (0080, 0084), not other people's activity.
- **The audit's open questions, answered by the owner's "reasonable defaults" (Nov 12):** the card says where the kinds are switched (a quiet line under its complexes: "Choose which kinds show in a walk's settings"), since Explore has no settings of its own; the reads stay ambient like places' and divisions', with no tap and no metered-connection check (deferred, `docs/DEFERRED.md`); the store of every area browsed is derived data on the device, cleared by a purge, and never leaves it.
- Deferred: the Capitol Complex and any kind no real fixture shows, Navigate and Walk me back naming a complex, a title suggestion, search or the share reel naming one (`docs/DEFERRED.md`).
