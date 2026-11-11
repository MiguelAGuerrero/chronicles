# The places contract, pinned

A copy of chronicles-data's `contract/` (https://github.com/MiguelAGuerrero/chronicles-data, decision 0108), taken
from its branch `claude/cool-wright-y0p9en` on 2026-11-11, contract version 3 (a place may have no name; the
`osm-places` source locates monuments and memorials, decision 0142). Version 2 was Remarkable and public (RD13: the
classes church, cemetery, theatre, museum and historic_site; heritage_building renamed building_structure). `placesContract.test.ts` (PP17)
holds the app's class table and its reader to it. To take a new contract: copy chronicles-data's `contract/` over this
folder (README aside), run the test, and change the app where it fails.

**What the app reads into a class beyond its name** (revisit each when taking a new version):

- `museum` lights History as well as Culture (Presence and kinds, PK1, PK19; `ARCHIVE_ALSO` in
  `discovery/archivePois.ts`): under contract v2 a museum enters only through its listing (chronicles-data's
  `listing()`, RD8). If a new version lets a museum enter another way (an OpenStreetMap tag, the owner's edits), PK1's
  rule is decided again with the owner.
