# The places contract, pinned

A copy of chronicles-data's `contract/` (https://github.com/MiguelAGuerrero/chronicles-data, decision 0108), taken
from its branch `claude/typed-bridges` (68c65cd) on 2026-11-18, contract version 8. Version 8 (typed bridges; the app's
specs/more-attractions MA10, the owner's call of Nov 18) added `suspension_bridge`, a suspension bridge known only by its
Wikidata type, with no National Register listing; listed and covered bridges stay `bridge`. Version 7 (the more-attractions
audit 18) added `natural_monument`, a national monument that is a natural place (Devils Tower, Muir Woods, Jewel Cave).
Version 6 (More attractions, its AT1-AT6; the app's specs/more-attractions, decision 0198) added `museum_by_type`,
`nature_reserve`, `amusement_park` and `pier`; version 5 went to the stores pack, a layer this app does not read. Version 4
(Explore subtypes, its ST1-ST10; decision 0191) added the subtype classes. Version 3 (Small places, its SL10; decision
0183) added small_memorial, old_stone, wayside_shrine, time_capsule, public_bookcase and community_garden, OpenStreetMap's
`locates` in sources.json and an empty name only for the small classes. Version 2 (Remarkable and public, RD13) added
church, cemetery, theatre, museum and historic_site, and renamed heritage_building building_structure.
`placesContract.test.ts` (PP17) holds the app's class table and its reader to it. To take a new contract: copy
chronicles-data's `contract/` over this folder (README aside), run the test, and change the app where it fails.

**What the app reads into a class beyond its name** (revisit each when taking a new version):

- `museum` lights History as well as Culture (Presence and kinds, PK1, PK19): presence makes an archive place `recorded`,
  and `named` makes a recorded museum `historic` (`presence/presence.ts`). A `museum` still enters only through its
  listing (chronicles-data's `listing()`, RD8). Since v6 a museum may enter by its type alone, as its own class
  `museum_by_type`: presence gives it `by_type`, never `recorded`, and `named` never makes it `historic`, whatever its
  name (MA2, more-attractions audit 2; the owner, Nov 18, Culture only). So PK19's question was answered by a class of its
  own; a new version that let a `museum` enter another way would raise it again with the owner.
- Not every archive place is `recorded`: `museum_by_type`, `natural_monument` (v7) and `suspension_bridge` (v8) are held
  for their type and are `by_type` instead (more-attractions audits 2 and 18, MA10).
- `pier` enters by its type (a listed pier keeps its listing's class, `building_structure`, on the data side), so it weighs
  nothing in the History bar (`bar: 0`, more-attractions audit 3). Since v8 a typed suspension bridge is its own class,
  `suspension_bridge`: a Bridges place that weighs nothing in the History bar (`bar: 0`, as a pier) and never comes
  unnamed; `bridge` holds only listed and covered bridges and lights History (MA10).
- `marker` is a plaque whoever lists it (Wikidata or, since v3, OpenStreetMap; the owner, Nov 16): presence's `plaque`,
  the subset Plaques and markers, off by default (SP3). An unnamed place of a small class is named by its type
  (`archiveUnnamedLabel`, SP5).
