# 0187. Explore subtypes: every kind's subtypes, an inclusive bar, and OSM locating more types

Date: 2026-11-17 · Status: accepted · Area: explore, discovery, presence, vision · Supersedes in part: decision 0183 ("for every other type OSM still only corroborates"; "a marker is a marker whoever lists it", its Nov 16 call)

## Context
The owner asked to compare "What I'm into" (18 rows) with the data set. Two reviews measured the live pack
(`places-us-20261116.17`, 32,458 places, all from Wikidata): one class held 9,725 listed buildings, 2,604 of 2,739
"ruins" were ghost towns, about 3,800 of 4,129 "plaques" were named state historical markers hidden by Plaques' default,
740 lighthouses and 600 covered bridges sat in Curiosities, and no waterfall, garden, zoo, fountain or concert hall
reached the app at all. The five small-place switches were empty because chronicles-data's small-places branch was
never merged. The vision gate judged the full tree **aligned if reshaped** (Earn).

## Decision
The owner's calls, Nov 17:
- **The full subtype tree**: "go with the full findings"; "I'm not against having 45 different columns and rows if
  that gives us a richer data set" (about 53 rows: `specs/explore-subtypes/plan.md`).
- **Inclusive, not exclusive**: "we should be more inclusive than exclusive and only truly discount things that are
  really unremarkable" ("no matter how small" was "a little bit hyperbolic").
- **OpenStreetMap locates more types** ("Yes, extend the table"): fountains, water towers, windmills and watermills,
  lighthouses, cannons and locomotives, caves, waterfalls, old trees and botanical gardens join 0183's table; for
  every other type OSM still confirms.
- **Ghost towns are their own subtype, off by default**; true ruins their own, on.
- **Historical markers split from plaques, on**: Wikidata's commemorative plaques are "Historical markers"; OSM's
  plaques stay "Plaques", off.
- **Category headings; subtypes fold under their kind**, shown while it is on.
- **Publish the small places now**: chronicles-data's `main` took SL1-SL11 on Nov 17.

The gate's reshaping, carried as criteria: a subtype resolves from a type, tag or name the archive already reads
(0117); switches filter what is shown and are never counted, ranked or listed as a set; no label names significance
(0110: "Old trees", never "Notable trees"; "Nature", never "Natural wonders"); the truly unremarkable stays out
(untyped springs and dams, drinking fountains, plain benches, give boxes, wrecks off public ground, unnamed OSM water
towers).

## Consequences
- chronicles-data takes contract v4 (its `docs/subtypes`, ST1-ST10); the app pins it (`specs/explore-subtypes`,
  XS1-XS27). `PRESENCE_CODE` p6, nothing carried; every area is derived again.
- A push to chronicles-data never fetches OpenStreetMap (RB8): the OSM rows reach the pack at the Monday run or a hand
  run the owner starts.
- Kept checklist items and finds keep their old kind until their area is rebuilt; nothing kept is patched.
- VISION.md's rules are unchanged; its Precedents table gains this row.
