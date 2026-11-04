# Town outlines: the plan

For the owner to review before any code. The criteria are `spec.md` (TO1-TO12).

## What was found (Nov 4)

- Towns are chosen by nearest label point in three places: walk placement (`lib/areas/assign.ts`), the Explore tab's "You're here" (`nearList` in `lib/atlas/atlas.ts`), and checklist membership (`areaFor` in `lib/explore/explore.ts`). States already use real outlines (the Natural Earth pack).
- Overture's `divisions.pmtiles` (release 2026-10-21.0), checked at real coordinates:

  | Point | Outlines that contain it | Today's app |
  |---|---|---|
  | Planet Fitness, 2677 MacArthur Rd | locality Whitehall, Lehigh County | Catasauqua |
  | Fullerton (a Census-designated place) | locality Whitehall (Fullerton has no outline) | Fullerton, if its point is the nearest |
  | Midtown Manhattan | locality Manhattan, locality New York, neighborhood "Manhattan Community Board 5" | Manhattan (a borough point) |
  | Downtown Phillipsburg | locality Phillipsburg | Phillipsburg |

- A z12 tile is 80-170 KB; a z10 tile is 200-530 KB. Outlines are clipped at tile edges. Whitehall's own point is linked to its outline by `division_id`, and it sits in the next tile over.

## Design

One pure question, asked the same way by all three callers: **which town contains this point?**

1. **`PlaceCandidate` gains an optional `outline`** (polygons as `[lon, lat]` rings, plus a bbox) in `areas/types.ts`. Area keys stay level + name + parent (no dataset ids).
2. **`areas/divisionTiles.ts` (core, adapter-free)**, the only file that knows Overture's division schema. It reads decoded tile features and returns town candidates with outlines. Pieces of one outline cut by tile edges are merged by `division_id`. The point is Overture's division point when the tiles have it, else the outline's centre.
3. **`areas/towns.ts` (core):**
   - `townAt(p, candidates)` makes the TO1-TO3 decision: the smallest outline that contains the point; else the nearest point, leaving out towns whose outline was read and does not contain it.
   - `mergeTowns(tilePoints, outlines)` (TO4, TO5) makes a label point and an outline of the same name one candidate when the point is inside the outline, keeping the label point.
   - `hoodAllowed(hood, town)` (TO6).
4. **Callers:**
   - `assignAreas` takes the merged candidates and uses `townAt` per 50 m piece, plus the neighborhood rule (TO6, TO7).
   - `areaFor` (explore) uses the same two calls (TO11).
   - `nearList` takes an optional `townAt` answer for `from`: the row with that key is "here". Otherwise, as today (TO10).
5. **Reading (shell), `areas/outlines.ts`:** `outlinesFor(points)` loads from the cache any outlines whose bbox covers the points. For tiles not yet cached, it reads the z12 tiles under the points (at most 12; past that it gives up and the caller falls back, TO8). It uses the same release and deadline handling as the places reader (`activity/reader.ts`, parametrized by archive name). If a division point is not in the tiles read, the outline's centre stands in; no extra z10 read.
6. **Storage (TO12):** a derived `town_outline` store keyed by Overture division id. It holds name, polygons, bbox, point, release and the tile it came from, so a tile already read isn't read again. SQLite migration 16 and IndexedDB v14 (`oldVersion < 14`). Added to `DERIVED_STORES`, so `purgeDerived` clears it. The `Db` interface gets `putOutlines` and `outlinesIn(bounds)`, each with a contract case first (FC7).
7. **Re-placing (TO8, TO9):**
   - `AREA_RULES` goes `'1'` → `'2'`, and the rules tag adds `overture-divisions` but not the release, so a monthly release doesn't re-place every walk.
   - A placement that couldn't read outlines saves its point-based rows with `placesRead: false`, so `snapDone` is false and the walk is tried again. Placing old walks (`backlog.ts`) and the replay already retry walks that aren't done.
8. **The Explore tab (TO4, TO10):**
   - The town near read (`atlas/read.ts`) also adds the outline town at your position as an atlas row when the tiles' points don't have it (Whitehall).
   - `useAtlas` asks `townAt` on each fix against the cached outlines, which takes no network, so crossing a border shows at once.
   - `ATLAS_CODE` goes a2 → a3, so the tab lists again.

## Tests per criterion

All in `src/lib/__tests__/`. The Whitehall, Catasauqua and Manhattan outlines are fixtures cut from the real z12 tiles (a few KB of rings, committed as JSON, with the release named).

| Id | Test |
|---|---|
| TO1 | `towns.test.ts` "TO1: the gym at 2677 MacArthur Rd is in Whitehall, not Catasauqua" |
| TO2 | `towns.test.ts` "TO2: Midtown is in Manhattan, the smaller of two nested outlines" |
| TO3 | `towns.test.ts` "TO3: no outline read: the nearest point; a read outline that misses never wins by its point" |
| TO4 | `divisionTiles.test.ts` "TO4: an outline-only town gets Overture's point, else the outline's centre"; `towns.test.ts` "TO4: an outline-only town is a candidate" |
| TO5 | `towns.test.ts` "TO5: a label point inside its own outline is one candidate at the label point" |
| TO6 | `towns.test.ts` "TO6: a neighborhood point across the town's border does not count" |
| TO7 | `areas.test.ts` "TO7: a walk across the Whitehall-Catasauqua border counts metres in both, titled by the larger" |
| TO8 | `finish` shell test with `fakePorts()` "TO8: outlines unreadable: placed by points, not done; placed from outlines on the next snap" |
| TO9 | `areas.test.ts` "TO9: the rules tag changes with AREA_RULES, not with the Overture release" |
| TO10 | `atlas.test.ts` "TO10: here is the outline town, at once across a border"; e2e `atlas` journey check "TO10: the title names the outline town" (a fake divisions archive, beside the fake places one) |
| TO11 | `explore.test.ts` "TO11: a checklist place belongs to the town whose outline holds it" |
| TO12 | `dbContract.ts` cases for `putOutlines` and `outlinesIn`; shell test "TO12: a cached tile is not read again; cleared by purgeDerived" |

## Deferred, and why

- **Neighborhood outlines.** Overture's are sparse and often administrative ("Manhattan Community Board 5" over Midtown). Using them would rename real neighborhoods after districts. Neighborhood points stay, clipped to the town (TO6).
- **County, state and country from Overture.** The Natural Earth pack already does states offline; one source per level for now.
- **Outlines on the native map** (drawing a town's border). Nothing draws them yet; this slice only uses them to decide.
- **Bundled outlines for offline first launch.** Until a tile has been read once, that area falls back to points (TO3).

## Native

The decision code is shared and runs under `npm test`. Never run on a device: SQLite migration 16 and the outline reads on a phone (the same `pmtiles` path the places reader uses). Both go into `docs/NATIVE_UNVERIFIED.md`.

## Docs

- `.claude/rules/places-and-areas.md`: the placement rule and the cache.
- `.claude/rules/explore-and-discovery.md`: membership.
- `docs/ARCHITECTURE.md`: codemap and data model.
- `docs/decisions/0083-town-outlines.md`: the owner's four calls.
- `docs/PRODUCT.md` and `docs/STATUS.md`.
