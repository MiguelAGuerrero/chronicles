<!-- Repo first: written from the owner's report in a session (Nov 20, with a screenshot of two Philadelphia cards on Explore) and their answer to /fix's hard stop ("Do it right as a slice"), not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Town identity: one town is one card, however it was read

Nov 20, 2026 · @Miguel Guerrero

## Vision

Idea: "Philadelphia got listed twice" (the owner, Nov 20, a screenshot of two Philadelphia cards side by side on Explore's row, both "45 min walk · New to you", both "Walnut Street"); asked to do it right as a slice, rather than the narrow fix.
Verb: earn (Explore's row says which towns are around you, once each, yours first, so the walker reads where there is a lot without noise).
Touches: Always, "Moments and the trace are truth; streets, areas and summaries are recomputed" (atlas rows are cache: the rows listed before are listed again under a new code, never patched); decision 0083 (TO10: "your town is the outline you are in", never the nearest point); decisions 0124 and 0126 (one row of cards, one level per row); decision 0132 (whole towns). No Never line: nothing is counted, ranked or added to the screen.
Verdict: aligned
Shape: as asked. The row shows each town once; the card is the one at the map's own label point; no word, control or count is added.
Precedent: Nominatim (OSM's search) links a boundary and its place node into one place ("linked place nodes", names of linked places folded into the boundary's), verified; Overture's divisions theme gives a locality one id shared by its point and its area (`division_id`), verified in `src/lib/areas/divisionTiles.ts`; Google Maps lists one result per place, unverified.
Criteria: TI1-TI10.
Open: none. Out of this slice (the steward's S1-S3): which walks a town's card counts ("Walked once") stays as it is, by name within 3 km of the card's point; counting by the border is deferred with placing by identity.

## What it is

On Explore's page near you, the row of town cards showed Philadelphia twice. The town read (`atlas/readShell.ts`) reads town borders only under you; a city's map label (Philadelphia's at City Hall) lies in a tile not read, often farther than 3 km from the piece of border read, so the border was taken for a second town of the same name, at the middle of the piece read. Reproduced on Overture's 2026-11-18 divisions tiles from much of Philadelphia more than about 3 km from City Hall.

The narrow fix (branch `fix/duplicate-city`, 6ba318c) joined a city's label within 12 km; its review found that it drops the city you stand in when its label is past the read, still lists a city twice from reads made at two spots of it, can make the wrong one of two same-named cities "You're here", and leaves town-class places as they were. This slice decides by the border under the label, and keeps the border's identity on the town's row.

## Decisions (the owner's calls)

- **Do it right as a slice** (Nov 20, answering `/fix`'s hard stop): each town row keeps the identity of its border, so rows of one town merge whatever spot they were read from, and a label is joined to a border by the border under it, not by a distance; a migration was accepted for it.

## Criteria

1. **TI1** (the owner's task: "Philadelphia got listed twice") On Explore's page near you, a town appears as one card in the row, from wherever in it you stand. With Overture's 2026-11-18 divisions tiles for Philadelphia and its label at City Hall, every spot of a grid across the city lists one Philadelphia card. No new control: nothing to find.
2. **TI2** A town's map label and the border that holds it are one town, whatever the distance from the label to you or to the part of the border read first: whether they are one is decided by the border under the label, read for it. A label whose border does not hold it is not that border's town.
3. **TI3** Two towns of one name, each with its own border (Kansas City, Missouri and Kansas City, Kansas), stay two cards, and "You're here" is on the one whose border holds you, whichever label is nearer.
4. **TI4** The town whose border holds you is in the row, first and "You're here", even when its label lies beyond the 12 km the town read reaches.
5. **TI5** Rows of one town listed by reads at different spots (one by its border alone, at the middle of the piece read; one by its map label) show as one card: the one at the label, its distance measured to the label.
6. **TI6** A place the map classes as a town or a village (a large township or suburb) is held to the same rule as a city: the border under its label decides, never a distance.
7. **TI7** Town rows listed before this slice (the duplicates already on a phone) are listed again, once each; neighborhood rows listed before it stand. The neighborhood rows it carries are only those of the code just before it.
8. **TI8** Placing walks is unchanged: no walk is placed again, the home's stars are as they were (the placing rules' tag is the same), and a town card's "New to you" or "Walked once" counts the same walks as before.
9. **TI9** The town read reads a border tile for a label only when that label shares a name with a border read and its own tile was not read, at most 12 such tiles a read, each kept and never read again; selecting or scrolling the row reads nothing.
10. **TI10** The identity is cache: a row keeps it through a reload on the phone and on the web, a row stored before this slice reads back with none, and clearing derived data clears it with the rows.

## How adjacent apps do it

- **Nominatim** (OpenStreetMap's search): processes administrative boundaries before other places "to ensure correct handling of linked place nodes", and a boundary's searchable names include "names of linked places": a town's place node and its boundary are one result. Source: https://raw.githubusercontent.com/osm-search/Nominatim/master/docs/develop/Indexing.md , read Nov 20, 2026. **Verified**.
- **Overture Maps** (divisions theme, our source of borders): a locality's point (`division`) and its area (`division_area`) carry one id (`division_id`); the area is cut at tile edges and joined back by that id. Source: observed in the tiles, Nov 20, 2026 (`src/lib/areas/divisionTiles.ts`, `scripts/fixture-outlines.mjs`). **Verified**.
- **Google Maps**: a search for a town lists it once, its border outlined, whatever the query's spot. Source: from memory, unverified. **Unverified**.

## Record

- **Nov 21, built** (the owner's go-ahead, `/slice and /deploy`): TI1-TI10 tested first (`b430c07`), passing at `7192007`
  (`src/lib/__tests__/explore/townIdentity.test.ts`; TI10 in `dbContract.ts`). TI1 holds on Overture's real
  Philadelphia tiles from 81 spots, 1 card from each spot inside the city. Every wiring point was reverted once and seen
  failing a test (the label tiles' read, `townOf` by id, `nearList`'s merge and your far town, the read's far town, the
  label tiles adding no town, `newRows`' upgrade).
- **Deferred** (`docs/DEFERRED.md`, "Explore atlas"): which walks a town's card counts, by its border, with placing by
  identity (`[owner]`); a border-only town's point (`[loop]`).
- **Native, never run on a device:** migration 31 and the two columns (`docs/NATIVE_UNVERIFIED.md`, Migrations).
- **Not audited** (an audit runs only when the owner asks, decision 0074); the fix branch's auditor findings F1-F7 are
  each answered by a criterion or a deferral above.
