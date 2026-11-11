# Whole towns: the plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/whole-towns/spec.md` (WT1-WT9).

## Why the page was short (measured Nov 11, OpenFreeMap build 20261101, Overture 2026-10-21.0)

- Allentown's border holds **38 neighbourhood points** and one hamlet (Hanover Acres). A town's page took those
  within `townNeighborhoodsM` (5 km) of the label point (Trexler Park is 5.5 km out) and kept the **24 nearest you**
  (`townCap`), so which 14 went missing depended on where you stood.
- Hamlets were never areas: `tilePlaces.ts` maps neighbourhood, suburb and quarter to neighborhoods, and no hamlet.
- Places were not missing: the town's card reads all 27 tiles its border touches (495 places, TP1-TP3). The map shows
  one "?" per kind (fix area-marks). History reads "some" because 2 of its 122 places pass `isMarkable`: AG1's rule,
  not a read; unchanged here.

## Files

| File | Change |
|---|---|
| `src/lib/areas/tilePlaces.ts` (core) | `hamletsFromTiles(features)`: hamlet points as neighborhood-level candidates. The only file that knows the classes; `placesFromTiles` is untouched, so walk placement is too (WT5). |
| `src/lib/atlas/hoods.ts` (core, new) | `isWard(name)` (WT6); `townHoods(candidates, hamlets, town, set)`: the neighborhood candidates inside the town's border and owned by no smaller town inside it, hamlets inside it, no wards (WT1, WT2, WT4, WT5). |
| `src/lib/atlas/atlas.ts` (core) | `townNeighborhoods` takes the town's border set: with an outline, every row inside it that the town owns, no cap or reach (WT1, WT2); without, as today (WT3). Wards dropped in it and in `nearList` (WT6). `NearRead`/`NearTarget`/`AtlasStepNear` gain `town` (its key); `needsNear` asks for a read of that town (WT9). `waitingMarks(..., { all })`: every unfound mark of a shown kind (WT7). |
| `src/lib/atlas/read.ts` (shell) | `readNear(..., town)`: reads the town's z10 border (`outlines.borders`, as `readRing` does); with an outline, the z14 tiles it touches (`extentTiles`, `TILE_BUDGET`) and `townHoods`; a failed border read returns false (WT3's retry); none in the data, the 5 km read as today. Records `town` on the near read. |
| `src/lib/atlas/useAtlas.ts` (view) | The open town's border set (`useOutlineSet([town.at], BORDER_ZOOM)`) passed to `townNeighborhoods`; the near target carries `town`. |
| `src/lib/atlas/waitingPins.ts` (core, new) | `waitingPins(marks, zoom, lat, centre)`: every waiting mark, split into pins and dots: greedy, nearest the area's middle first, a pin where no pin already placed lies within a pin's width in metres at that zoom (the `pressRadiusM` arithmetic), else a dot (WT12). `roomZoom(dot, marks, lat)`: the lowest zoom (at most 18) at which no other mark lies within a pin's width of it (WT13). `dotAt(press, radiusM, dots)` (WT13). |
| `src/components/map/*` (view, both platforms) | A `waitingDots` prop: a GeoJSON circle layer in the kind's colour with a white edge, under the pins (WT14). No new tap plumbing: `onPress` already reports the spot and its reach. |
| `src/app/(tabs)/explore.tsx` (view) | Every waiting mark of the selected area (`waitingMarks(..., { all: true })`), split by `waitingPins` at the zoom `onViewChange` reports; pins as `discoveries`, the rest as `waitingDots`; no found pins (WT10); a press on a dot eases to `roomZoom` (WT13). The card keeps one per kind (WT8). |
| `src/lib/atlas/atlas.ts` (core) | `waitingLabel(area, kinds)`: "Places to find in X: art, parks" (WT11). |
| `src/components/WalkMap*` / `MarkPinView.tsx` (view) | Explore's waiting pins hidden from the screen reader, one summary element over the map carrying `waitingLabel` (WT11). |

## Data

- No migration, no IndexedDB version. `atlas_area` rows are cache; a hamlet's row is a neighborhood row. The near
  read's meta record gains an optional `town`; a read made before has none, so each town is listed once again (WT9).
- No `ATLAS_CODE` bump: rings are measured as before, only the listing widens, so no ring is read again.
- No `AREA_RULES` bump: walks are placed as before.

## Tests (feature `explore`, `src/lib/__tests__/explore/`)

| Id | Test | File |
|---|---|---|
| WT1 | `WT1: a town's page lists every neighborhood inside its border, nearest you first, past 5 km and past 24` | `wholeTowns.test.ts` |
| WT2 | `WT2: a neighborhood in a smaller town inside the border is that town's` | `wholeTowns.test.ts` |
| WT3 | `WT3: a town with no border lists by its reach, at most 24` (core) and `WT3: a failed border read lists nothing and is tried again` (the listing decision as core: `hoodsRead`) | `wholeTowns.test.ts` |
| WT4 | `WT4: Allentown's listing read finds every neighbourhood point inside its border` (real fixture: the place points and border of Allentown, saved by a new `scripts/fixture-town-hoods.mjs`) | `wholeTowns.test.ts` |
| WT5 | `WT5: a hamlet inside a border is a neighborhood; outside, none; placesFromTiles still has no hamlet` | `wholeTowns.test.ts` |
| WT6 | `WT6: wards are not neighborhoods, on a town's page or near you; Wardsville is` | `wholeTowns.test.ts` |
| WT7 | `WT7: every place still to find in the selected area is on the map, a town's too` | `wholeTowns.test.ts`, and a `carousel` check (a neighborhood's and a town's map hold every waiting place, as pins plus dots) |
| WT12 | `WT12: a "?" where it has room, a dot where it would overlap; no two "?" overlap; the same view gives the same split` | `waitingPins.test.ts`, and a `carousel` check (zoomed out: dots; zoomed in: more "?") |
| WT13 | `WT13: a tap on a dot zooms to where it has room, at most 18` (core) and a `carousel` check (a tapped dot becomes a "?") | `waitingPins.test.ts`, `carousel` |
| WT14 | `WT14: a dot carries no name, number or icon; only the selected area's are drawn` | `waitingPins.test.ts`, `carousel` |
| WT8 | `WT8: the card's waiting is one per kind and no "?" carries a name` | `wholeTowns.test.ts`, and a `carousel` check that no text on the page, row or card holds a number in digits or words beside "neighborhood(s)" or "place(s)" (the steward's S3) |
| WT10 | `WT10: Explore's map draws no found place` (core: the pins from `areaPins`'s marks helper) and a check in the `marks` journey (a find leaves the map) | `wholeTowns.test.ts`, `marks` |
| WT11 | `WT11: the "?" are one label naming the area and the kinds, the same for one or many` (core) and a check in `carousel` (one element, the pins `aria-hidden`) | `wholeTowns.test.ts`, `carousel` |
| WT9 | `WT9: a town's page is listed once per build; a read by reach alone is listed again` | `wholeTowns.test.ts` |

The `snap`/`carousel` world (`snapWorld`, Allentown's 4 km border) gains a hamlet and a ward inside the border and a
cluster of places of one kind beside a neighborhood; the journey checks the hamlet's card shows, the ward's doesn't,
the cluster is dots zoomed out and "?" once a dot is tapped. Journeys to run at the end: `carousel`, `snap`, `atlas`, `marks`,
`grading`, `outlines` (those `check:affected` names for these files).

## The steward (Nov 11): triage

- **S1 [drift] a neighborhood's map becomes its checklist** (every "?" beside its finds by name): put to the owner. Their answer: it is for presence, not completion; take found places off the view. Accepted as WT10, decision 0127; the "?" are not merged.
- **S2 [drift] a screen reader counts the "?" out loud**: accepted as WT11.
- **S3 [tone] WT8 tested for digits only**: accepted into WT8 and its test.
- Silent, noted: whether a "?" pinned at a place's own spot gives too much away before you walk there. The owner chose every "?" at its place; the stacking of close pins stays DEFERRED (fix area-marks audit 2).

## Screen actions

| Action | Goal, how often | Control | Matrix row / precedent |
|---|---|---|---|
| Step through a town's neighborhoods | See each part of a town, on every visit to its page | the row of cards (unchanged; more cards) | "browse a set of places": carousel (0124) |
| See where an area's places wait | Pick where to wander, on selecting an area | "?" pins where there is room, kind-coloured dots where not | map pins (fix area-marks); the capture pins' grouping by screen distance (`useZoomPins`); 0115's countless "?"; Apple and Google Maps draw lesser places as dots until zoomed in |
| Look closer at a crowded spot | See which kinds wait in a dense block, occasionally | a tap on a dot zooms in toward it | 0115's merged star zooms in on a tap |

One new tap target (a dot), with the map's 44 px press reach.

## Deferred

- Hamlets and wards in walk placement (the home's stars): a change to `AREA_RULES` that re-places every walk; not asked.
- Neighborhood rings stay 800 m around the point (no neighbourhood outlines in the tiles): `docs/DEFERRED.md` already has "whole areas".
- History's thin count (AG1's notable-name rule for worship and memorials): its own question for the owner.
- A town past `TILE_BUDGET` (60 z14 tiles): the nearest 60 are read, as the town's card already does.

## Performance

A town can hold a hundred or more waiting places (Allentown: about 100 findable from the map alone, more with the
archive). Dots are one circle layer, not markers; "?" pins are markers, at most as many as fit on screen without
overlapping. The split runs once per settled half-zoom, never per frame.

## Native

No native-only code; the dots layer is written for both maps and native's is never run (an item in `docs/NATIVE_UNVERIFIED.md`: zoom out on a town, see dots; tap one, it zooms in). The listing read runs on both platforms through `fetchTiles`; never run on a device (an item in
`docs/NATIVE_UNVERIFIED.md`: open a big city's page and see its whole list).
