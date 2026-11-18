# 0183. Small places from OpenStreetMap: OSM may locate a pinned table of small types; the repetitive ones off by default

Date: 2026-11-16 (the owner's calls of Nov 14) · Status: accepted · Area: explore, discovery, presence, vision · Supersedes in part: decision 0110 ("OpenStreetMap only corroborates") · An exception to: decision 0115 ("kinds filter what you see, never what exists"), for presence weights only

## Context
The owner asked how Pikmin Bloom gets the places on its postcards, which reach small things such as a time capsule,
and whether Chronicles could use that data (research: `docs/research/small-places-wayspots.md`). The postcards come
from Niantic's Wayspot database (Ingress portals, PokéStops), seeded from the Historical Marker Database and grown by
players' nominations under the criteria "a great place to explore, exercise or be social". Since May 2025 Scopely owns
it; it has no public API, the abuse policy forbids third-party access, and 0108 would make any community source
nominate-only anyway. Wayfarer's eligible places map onto OpenStreetMap tags, but 0110 let OSM only corroborate, so a
place only OSM knows (a time capsule, a public bookcase) never enters the archive. 0110's reason, that the archive
would become a derived ODbL database, has since happened: the US pack is ODbL once OSM changed it.

The vision gate judged the idea **aligned if reshaped** (Earn: "what makes a place itself"): a pinned table, the
repetitive types off by default, nothing counted or collected.

## Decision
The owner's calls, Nov 14:
- **OpenStreetMap may locate places on its own** for a pinned table of small types ("Yes, OpenStreetMap should
  contribute their places"). An unlisted tag is left out, never guessed (0103); `access=private|no` keeps a place out
  (0109). This supersedes 0110's "a place only OSM knows is not added" for the table's types only; for every other
  type OSM still only corroborates.
- **Each type is its own subset (a refinement, 0144) under an existing kind, with a default** ("reasonable defaults…
  so they don't end up cluttering up the UI with menial points of interest"; "Yes, as proposed"):

  | Kind (category) | Subset | OSM tags | Default |
  |---|---|---|---|
  | Monuments and memorials (History) | Plaques and markers | `memorial=plaque`; `historic=memorial` as a plaque | off |
  | Monuments and memorials (History) | Small memorials | `memorial=bench`, `memorial=ghost_bike`, `memorial=stolperstein` | off |
  | Buildings and structures (History) | Old stones | `historic=milestone`, `historic=boundary_stone` | off |
  | Places of worship (History) | Wayside shrines and crosses | `historic=wayside_shrine`, `historic=wayside_cross` | off |
  | Curiosities (Viewpoints & oddities) | Time capsules | `historic=time_capsule` | on |
  | Community spaces (Culture) | Little libraries | `amenity=public_bookcase` | on |
  | Public art (Art) | Murals and sculptures | `tourism=artwork` with a known `artwork_type` (untyped artwork left out) | on |
  | Parks and gardens (Parks) | Community gardens | `leisure=garden` + `garden:type=community` | on |

  An off-by-default subset starts hidden on a fresh install and for an existing user after the update (the
  `explore_kinds_known` mechanism, PK18); once switched on it stays on.
- **An unnamed place is named by its type** ("Little library", "Time capsule"); unnamed places merge by type within a
  few metres instead of by name.
- **Ghost bikes and Stolpersteine are found places, off by default** in Small memorials, named plainly when found,
  never collected or counted.
- **Presence weighs them by the size of the stop, and only when switched on** (the owner chose this over counting them
  always): ¼ for plaques, small memorials, old stones, wayside shrines and time capsules; ½ for little libraries and
  community gardens; 1 for murals and sculptures (as artwork already is). No cap: a street dense with plaques adds up
  ("if a place has a lot of plaques and memorial benches… there might be historical value there"). This is an
  exception to 0115 for presence weights: a switched-off subset adds nothing to density or bars for that reader.
- **A breakdown of a category's bar by type** on a neighbourhood or town card (the types present, in words, in a fixed
  order, no counts) is wanted, as **its own slice after this one**, with its own gate; the owner's tension, recorded
  for it: weighting is a form of curation, so "be smart and reasonable about what an experience really elicits versus
  how much a point of interest contributes to the overall shape" of an area.

## Consequences
- The data side is built in `chronicles-data` (the class table, the OSM read as a locating role for these types, the
  noise review per test area before publishing, 0109); this repo takes a new contract version, the subsets in
  `REFINEMENTS` and `KINDS`, their default-off entries and presence's weights. `PRESENCE_CODE` and `ATLAS_CODE` bump.
- Presence becomes reader-dependent for these subsets: cached area and atlas rows must keep each subset's share apart
  so a switch re-sums without reading tiles again. That design is the slice's (ask before choosing the storage shape).
- No screen counts these places or treats them as a set (VISION.md Never: tallies; a find is a memory). The walk's card
  and the replay keep their bounds (0110: one or two by name, then a phrase).
- Nothing reaches a phone until the archive's address is set (PW16) and the weekly job's OSM fetch has run.
- `docs/DEFERRED.md`'s "Places only OpenStreetMap knows" entry is answered for the table's types.
- VISION.md's rules are unchanged; its Precedents table gains this row.
