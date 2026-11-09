# 0104. Listed places enter when remarkable and public; the archive reads OpenStreetMap's tags; attractions are pinned

Date: 2026-11-09 · Status: accepted · Area: explore, discovery, atlas

## Context
The owner asked why the Bethlehem Steel Stacks seemed missing, then for the general gap behind it. A measurement on Nov 9 compared Wikidata's located items with what the app keeps from the real tiles (OpenFreeMap build `20261101_080013_pt`, run through `placesFromTilePois` and `isMarkable`) in seven areas: Bethlehem, Allentown, Easton, Jim Thorpe, Pittsburgh, Philadelphia's Old City, Zurich.

- Of 369 plausible destinations in the six US areas (listed or well known, standing, not a district, school or company), 84 became places to find (Bethlehem 2 of 16; Zurich 32 of 333).
- 202 were never in the tiles: the OpenMapTiles `poi` layer has no `man_made` key, takes `historic` only as monument, castle or ruins, and `building` only as dormitory, so a building, bridge, mill or furnace notable for what it is has no way in.
- 45 were in the tiles and dropped by `tilePois` (the National Aviary, `zoo/aviary`, among them); 38 were kept but stopped by the `notable.json` name-word rule (Central Moravian Church, Packer Memorial Chapel).
- 172 of the 285 misses carry a heritage listing (155 National Register, 15 National Historic Landmarks). The archive admits only Landmarks (0103, Nov 6) and is off until PW16, so switched on it would add about 18.
- The Steel Stacks themselves are not missing from the data: OpenStreetMap maps them as an area tagged `tourism=attraction`, the tiles carry `SteelStacks` as `attraction/attraction`, and `tilePois` keeps it as a place to find (kind viewpoints). Every named attraction in the seven areas' tiles is kept (65 of 65). The furnaces' own OSM feature is not in the tiles.
- The archive's build reads Wikidata only; 0103's "and OpenStreetMap tags" was never built.

The vision gate (0094) judged the idea **aligned if reshaped**: a listing as a gate on what a place is, OpenStreetMap's tags instead of Overture as a source of places to find. The owner accepted the reshape on Nov 9.

## Decision
The owner's calls, Nov 9:
- **0103's Nov 6 rule is amended, not reversed whole.** A listed place enters the archive when it is **remarkable and public**: remarkable is a heritage listing (the National Register counts, not only Landmarks); public means reachable from public ground ("Reachable from public ground"): you can stand in front of it, so a bridge, a monument or the blast furnaces count even though they can't be entered.
- **Public is shown by its type or its sources**: a type public by nature (places of worship, cemeteries, civic buildings, stations, bridges, dams, locks, mills, furnaces, industrial structures, towers, monuments), or a source saying it is open to visitors (a Wikidata museum or historic-site class; OpenStreetMap `tourism=museum`, `tourism=attraction` or `historic=*` at the same place).
- **Never on a listing alone:** schools, offices, banks, hotels and ordinary commercial buildings ("just mundane buildings with no historical precedent or remarkability"), and historic districts, unless a public sign above holds, or, for the buildings, it is a National Historic Landmark.
- **Never where it can't be reached:** OpenStreetMap `access=private` or `access=no` keeps a place out (a reserve that can't be entered).
- **Private houses:** a residence enters when a source says it is open to visitors (a house museum), or when it is a National Historic Landmark ("Yes, if NHL"; the gate recommended never, the owner decided).
- **The archive reads OpenStreetMap's tags**, as 0103 intended; a place found only there enters by the same pinned class table, and an unmapped tag is left out, never guessed.
- **Attractions are supported and pinned** ("ensure that we have attractions supported too"): every named `tourism=attraction` in the tiles stays a place to find (a test, SteelStacks as its fixture); the archive's OpenStreetMap read maps `tourism=attraction` to the same kind; the listing rules never remove an attraction. Wikidata's loose "tourist attraction" class is not used (the gate's recommendation; it holds businesses, events and tours).
- **Overture stays for busy streets only** (the reshape): its categories are what a business calls itself (two walking tours as a museum and a historic site, the plant as "b2b_service"), not what a place is.
- **Noise is reviewed before publishing:** the build reports, per test area and class, what each change adds; the owner strikes types or places (`archiveEdits.json`) before an archive is published, as on Nov 6. The coverage measurement is kept as a benchmark that reports places added, struck and still missed.
- **Folded in:** `zoo/aviary` becomes a place to find (viewpoints). Historic hotels are not added to `tilePois` (every chain hotel would follow); a listed hotel enters through the rule above.

## Consequences
- A slice ("Remarkable and public", `/slice`) carries these as criteria; PW5 and PW6 (the class table), AG5 (`MARKABLE_CLASSES`) and the archive version are re-pinned deliberately, and `ATLAS_CODE` is bumped where grading changes.
- Listed places of worship and cemeteries enter as their own kinds (churches, cemeteries); through the merge rule (same name within 50 m, the archive wins) a listed church in the tiles becomes a place to find whatever its name says, with no new field in the archive (PW7 holds: name, class, src, id).
- The build needs OpenStreetMap tags at build time (in `chronicles-data`'s scheduled job); nothing new is read by the app, and the app's hosts are unchanged.
- The kind's two labels disagree ("Viewpoints and attractions" in the filter, "Viewpoints & oddities" as the category); the slice settles one.
- Nothing reaches a phone until PW16 sets the archive's address.
- Why the owner didn't see the Steel Stacks is a separate question (a place is named only on an exploring walk within 60 m; the Explore tab never names places), answered outside this record.
- VISION.md's rules are unchanged; its Precedents table gains this row.
