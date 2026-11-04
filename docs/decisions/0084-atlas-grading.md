# 0084. The findable kinds count only what can be found; a thin ring says nothing

Date: 2026-11-04 · Status: accepted · Area: explore, atlas

## Context
Fields at Willow Brook, North Catasauqua, showed History "plenty" while "Waiting to be found" had no history at all. The dots counted every place of a kind in the 800 m ring (every place of worship, cemetery and town hall). The "?" marks counted only places that pass `isMarkable`, which needs a notable name for those classes.

The owner asked for research on grading areas: the doc "Grading areas by their features", https://claude.ai/artifact/KbWci9Guj4XcamTNqow8oC. Its findings:
- Fixed, absolute steps per kind and no total are well supported.
- The tiles' `rank` is a label order, not fame.
- Significance (Wikidata, page views, heritage, Wikivoyage) is not in the tiles.
- Comparable products (Wayfarer, Komoot, Atlas Obscura, Walk Score, Google Area Busyness) list only what passes their criteria, and say nothing when data is thin.

## Decision
The owner's calls, Nov 4 ("Yes and implement" on the defaults similar apps suggest, then the plan's questions):
- History, Art, Culture, Green and Views count only places that could be marks. Food, Shops and Nightlife count every place. One dot means at least one such place (AG1, AG2).
- A ring with fewer than 3 mapped places of the eight kinds says nothing about its kinds, on its tile and its card (AG3).
- Green stays a count of parks. The steps stay.
- No significance file and no host.
- The spec defines a mark: a lasting, recognisable place, reachable on foot, that tells something about the place, with an exclusion list (AG5).
- Distance weighting inside the ring is dropped.
- Next slice, "Whole areas":
  - a town is graded across its outline (0083), a neighborhood across its share of the town (closer to its point than to any other);
  - dots say how much the area holds;
  - density is a separate layer: the kind's density shading the area's picture.

## Consequences
- Amends AT4 (what the ring counts) and the card's "How the marks work".
- `ATLAS_CODE` a4 reads every ring again; `profile.thin` is cache, no migration.
- The e2e has a `grading` journey and a neighborhood 6 km west of the fake grid, Quiet Hollow.
- The spec is `specs/atlas-grading/spec.md` (AG1-AG6).
