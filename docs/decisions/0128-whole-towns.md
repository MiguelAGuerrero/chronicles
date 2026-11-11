# 0128. Whole towns: a town's page holds every neighborhood inside its border, and Explore's map shows presence, not completion

Date: 2026-11-11 · Status: accepted · Area: explore, vision · Amends AT2 ([0066](0066-explore-is-an-atlas.md)), EC3 ([0124](0124-explore-carousel.md)) and the fix area-marks (finds named over the map)

## Context
On the owner's iPhone (Nov 11, Allentown) Explore looked thin for a city its size. Measured against the
map's own data: Allentown's border holds 38 neighbourhood points and a hamlet (Hanover Acres), and its page
listed at most 24, the nearest to where you stood and only within 5 km of the city's label point. Places
were not missing from the reads (the town's card reads all 27 tiles its border touches); the map drew one
"?" per kind by design. STATUS's "Needs the owner" already held the open half (a neighborhood past its
town's reach, 0126).

## Decision
The owner's calls, Nov 11 (each the recommended option but the third):
- **Every neighborhood inside the town's border**, nearest you first, with no cap and no 5 km limit; a
  town with no border keeps today's reach and cap.
- **Hamlets inside a town's border are its neighborhoods**; outside every border they stay unlisted (rural
  places are Places out of town, 0115). Walk placement is unchanged.
- **Wards are not neighborhoods** ("1st Ward", "Eighth Ward"): voting districts. Historic districts stay.
- **Every place still to find is on the map, for a neighborhood and for a town** ("All for the town").
- **A dot where a "?" would crowd**: a place is a "?" where its pin has room on screen, a small dot in its kind's
  colour where it would overlap another pin; a tap on a dot zooms in toward it (the owner, Nov 11: "not putting a
  whole bunch of question marks overlaid on top of the map ... maybe like a dot instead"; the options recommended).
- **Presence, not completion** (the owner's answer to the steward's S1, which warned that a neighborhood's
  map of every "?" beside its finds reads as a checklist): "this is not for completion. This is for
  presence", and the remedy is to take found places off the view. Explore's map draws no found place,
  whatever is selected. The card keeps its "Found" list.

- **The audit's calls** (Nov 11, `/audit whole-towns`):
  - **A town at its own scale is dots, found or not** (the steward's S1, that the town's field of places thinned as
    you found them): under a neighborhood's zoom (14) a selected town shows every findable place as the same dot, and
    no "?"; "?" (the unfound only) on a neighborhood or zoomed in.
  - **Kind colours stay, with a dark edge** that reaches 3:1 on every ground (the UX review's contrast finding).
  - **A "?" with places under it zooms in** on a tap until they part; at the closest zoom it opens the card.
  - **Walks are placed in hamlets** inside the walk's town border (`AREA_RULES` 4), so a hamlet's card counts them.

## Vision
Idea: list a whole town's neighborhoods wherever you stand, and show the selected area's places where they wait.
Verb: earn. Touches: Never "completion" and 0031 ("discoveries in the moment, not a planned list"),
answered by taking found places off the map; Never "Tallies" (no count in digits or words; the "?" are one
accessible element naming the kinds, WT11); 0115 (countless unnamed "?"). Verdict: aligned. Spec:
`specs/whole-towns/spec.md` (WT1-WT14).

## Consequences
- `townNeighborhoods` takes the town's z10 border; the near read records the town it covered, so each town
  is listed again once, across its border.
- Explore's map loses the found pins that fix area-marks added; the area's card still names its finds.
- WalkMap gains a dots layer on both platforms; which places are "?" is decided at the settled zoom, as capture pins are.
