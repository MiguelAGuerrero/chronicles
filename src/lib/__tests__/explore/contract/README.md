# The places contract, pinned

A copy of chronicles-data's `contract/` (https://github.com/MiguelAGuerrero/chronicles-data, decision 0108), taken
from its branch `claude/epic-darwin-m94owv` on 2026-11-16, contract version 3 (Small places, its SL10; the app's
specs/small-places, decision 0182: the classes small_memorial, old_stone, wayside_shrine, time_capsule, public_bookcase
and community_garden; OpenStreetMap's `locates` in sources.json; an empty name only for the small classes). Version 2
(Remarkable and public, RD13) added church, cemetery, theatre, museum and historic_site, and renamed heritage_building
building_structure. `placesContract.test.ts` (PP17)
holds the app's class table and its reader to it. To take a new contract: copy chronicles-data's `contract/` over this
folder (README aside), run the test, and change the app where it fails.

**What the app reads into a class beyond its name** (revisit each when taking a new version):

- `museum` lights History as well as Culture (Presence and kinds, PK1, PK19; presence's archive table makes every
  archive place `recorded`, and `named` makes a recorded museum `historic`, `presence/presence.ts`): under contract v2 a museum enters only through its listing (chronicles-data's
  `listing()`, RD8). If a new version lets a museum enter another way (an OpenStreetMap tag, the owner's edits), PK1's
  rule is decided again with the owner.
- `marker` is a plaque whoever lists it (Wikidata or, since v3, OpenStreetMap; the owner, Nov 16): presence's `plaque`,
  the subset Plaques and markers, off by default (SP3). An unnamed place of a small class is named by its type
  (`archiveUnnamedLabel`, SP5).
