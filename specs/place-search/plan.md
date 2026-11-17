# Place search: the plan

For the owner to review before any code. Criteria are in `spec.md` (GZ1-GZ19). The steward's findings are triaged at the foot.

## What exists

- Free look (0150) already does the second half of the job: `showHere` in `src/app/(tabs)/explore.tsx` sets `looked = {at, you}`, leaves a town's page, drops the pick, closes the card and the spot, frames the page and announces it; `lookPage(at)`, `lookedList`, `lookWords()` (`src/lib/atlas/freeLook.ts`) list "the areas around a point" and word the page. A pick is the same move with a name.
- Boundaries are the precedent for a bundled, script-built pack read through an adapter: `scripts/build-boundaries.js` writes `assets/boundaries/us.json`, `src/lib/areas/boundaryPack.ts` (core) types it, `src/lib/areas/boundaries.ts` `require`s it lazily.
- The title card sits top-left over the map (`titleWrap`, right 64 clear of the Layers column); the Layers button sits top-right (`LayersControl`).
- The icon set has no magnifier (`src/components/icons.tsx`).
- **The data host is blocked here.** `download.geonames.org` answers 403 from this cloud session (the proxy's policy). The build script can be written and tested on a fixture; the real pack needs the file. See open call 1.

## Design

1. **The pack (data).** `scripts/build-gazetteer.js <cities5000.txt> <admin1CodesASCII.txt> <countryInfo.txt> <out.json>` reads GeoNames's tab files and writes the app's pack, **columnar** so it parses fast and stays small:
   `{ id: "geonames-cities5000-2026-11-16", names: [...], ascii: [...], region: [...index into regions], country: [...index into countries], lat: [...int, 1e-4 deg], lon: [...int], regions: [...], countries: [...] }`.
   Fields kept: the name, its ASCII name, region (admin1 name), country (name), the point. **Population is not read at all; alternates are kept for every place that has them, up to three English-looking ASCII ones (steward S1)**; GZ13's test fails if the pack holds anything else. Sorted by normalized name at build so the app need not sort. Size is measured and recorded; over 6 MB stops the build and goes to the owner.
2. **Core, `src/lib/gazetteer/` (`@layer core`, no React Native).**
   - `normalize.ts`: `fold(text)` (lowercase, NFD, strip combining marks, punctuation to space, "saint"/"st" equivalence, collapsed spaces) and `words(text)`.
   - `pack.ts`: `GazetteerPack` type, `validatePack` (GZ13), `placeAt(pack, i)`.
   - `index.ts`: `buildIndex(pack)` makes sorted arrays of `(folded word start, place)` once; `search(index, query, from, limit)` returns places whose name or any word starts with the folded query, ordered by `distanceM` from `from`, else name then region; at most `LIMIT` rows (GZ3, GZ4, GZ5, GZ15). Pure: the clock, the fix and the map centre are arguments.
   - `words.ts` (as `freeLook.lookWords` is): the field's label, prompts and empty and failure lines, the announcements, the magnifier's name; each is scanned for digits and rank words (GZ5, GZ11).
3. **Adapter, `src/lib/gazetteer/source.ts` (`@layer adapter`).** `GazetteerSource { load(): Promise<GazetteerPack> }` and the app's instance: a lazy `require('../../../assets/gazetteer/places.json')` the first time it is called, memoised, failing as a rejected promise (GZ12, GZ15, GZ8). Tests run against an in-memory source.
4. **Hook, `src/lib/gazetteer/usePlaceSearch.ts` (`@layer view`).** Holds the field's text, the loaded index (status `idle|loading|ready|failed`, `retry`), the results from `search`; it stores nothing (GZ16).
5. **The control and sheet, `src/components/atlas/PlaceSearch.tsx` (a view).** A `SearchButton` (magnifier, 44 pt, `testID="atlas-search"`) and a `SearchSheet` (`testID="atlas-search-sheet"`: label, `TextInput` at 16 px, Clear, Close, a list of result rows `testID="atlas-search-result"`). A new `search` icon in `icons.tsx`. The sheet is inside the screen (never a `Modal`, which iOS cannot lay over another and which the lint restricts), covering the title card while open.
6. **The screen, `explore.tsx`.** `showHere` is generalised to `lookAt(at, named?)`: `looked` gains `named?: { name: string; region: string }`; `lookWords(named?)` gives "Around <name>" and the region as subtitle (GZ6). A pick calls `lookAt([lon, lat], {name, region})`, leaves `free` as it found it (GZ17), closes the sheet, and returns focus to the magnifier. Everything FL6-FL21 says of a look stays true. The magnifier is in the title card's row, trailing the title card (`SearchButton` beside `titleCard`), so it shares the title's place on a page, a town's page and a look (GZ17).
7. **Attribution (GZ14).** The app credits its map data in `AtlasCard`, `WalkMap`, `index.tsx` (OpenStreetMap, found by `grep`); the GeoNames line goes in the same place, with the pack's date from `id`.
8. **Not touched:** the db, the migrations (a read-only bundled asset: no schema, no `SNAP_RULES` bump), Navigate, the walk planner.

## Data

- Truth or cache: neither. A bundled, read-only asset; never written; no storage, no migration, no IndexedDB version.
- Built once by the script, committed under `assets/gazetteer/` with its build recipe in the script's header, so the pack is reproducible and its dataset swappable.

## Tests per criterion (written first, as todos)

Pure ones in `src/lib/__tests__/explore/gazetteer.test.ts` (the explore feature's folder), screen ones in a new journey `scripts/e2e/journeys/placesearch.js`, both listed under `explore` in `scripts/features.js`.

| Id | Test |
|---|---|
| GZ1 | journey "GZ1: a magnifier is drawn in the title row, named Search places, 44 px"; the cold find (`ux-reviewer`), recorded in the spec |
| GZ2 | journey "GZ2: the field is focused, labelled, 16 px, has Clear and Close; Escape closes" |
| GZ3 | unit "GZ3: case, diacritics, punctuation and Saint/St fold; any word's start matches; one letter lists nothing" |
| GZ4 | unit "GZ4: nearest first from a fix, else from the map's middle, else by name then region; never by anything else"; "GZ4: the list is capped" |
| GZ5 | unit "GZ5: a row says name, region and country, and no digit" |
| GZ6 | journey "GZ6: a pick looks at the place: title 'Around X', the region, the first area selected, Locate returns"; unit `lookWords("GZ6: named title says the place and never where the reader is")` |
| GZ7 | journey "GZ7: a pick with no readable map data shows the look's own failure words, Locate and Move map stay" |
| GZ8 | unit "GZ8: no match and an unreadable pack say their words" (hook over an in-memory source); journey "GZ8: no match shows its line and the way on" |
| GZ9 | journey "GZ9: typing and picking send no request beyond the look's own near reads; the text is in none" (the harness's request log) |
| GZ10 | journey "GZ10: offline, the field matches and picks" |
| GZ11 | unit "GZ11: no announcement or label carries a digit or a rank word"; journey "GZ11: arrows step, Enter picks, focus returns" |
| GZ12 | unit "GZ12: the build script's output is a valid pack for a fixture dump"; arch test "GZ12: no dataset name in src outside the adapter and the pack" |
| GZ13 | unit "GZ13: validatePack rejects a pack with a population or any extra field"; unit over the committed pack "GZ13: the committed pack has only the allowed fields" |
| GZ14 | journey "GZ14: the credit names GeoNames and CC BY 4.0 where the map credit is" |
| GZ15 | unit "GZ15: 50,000 synthetic places answer in under 20 ms"; unit "GZ15: nothing loads until search opens" (adapter spy) |
| GZ16 | unit "GZ16: the hook writes no key and no row" (fake `ports.db`, asserted untouched); journey "GZ16: after Close the field is empty on reopening" |
| GZ17 | journey "GZ17: the magnifier is on the near page, a town's page and a look; Move map on, a pick leaves it on" |
| GZ18 | journey "GZ18: a 60-char name and 40-char region fit at 390 and 320 px" (the longest text the screen can meet, seeded) |
| GZ19 | journey "GZ19: sheet, town page, long press and Move map never overlap at 390 and 320 px"; `overlaySlots` unit |

A criterion that needs the real pack ("zurich" finds Zürich; Carlisle PA exists) is a unit over the committed pack: it exists only once the pack is built (open call 1).

## Per-action lines (UI)

Matrix rows: 16 (a long list: search, with a filter text field), 17 (short text: labelled field, Clear, 16 px), 23 (dismiss: a visible Close).

| Action | Goal, how often, where | Control | Matrix | Where the owner looks first |
|---|---|---|---|---|
| Open search | Go to a named town: now and then, at a desk or on a bench, not while walking | Magnifier button, top of the map beside the title | 16 | At the top of Explore, near the title "Near you"; they see a magnifier |
| Type | Name the place | Text field, label "Search towns and cities", Clear while it holds text | 17 | In the sheet that opens |
| Pick | Go there | A row per match: name, region, country | 16 | The list under the field |
| Leave | Back out | Close button; Escape; Back | 23 | Trailing the field |
| Come back to me | After a look | Locate (exists) | FL8 | The right column |

Defaults I took that make a control quieter, for the owner to overrule: the magnifier is **an icon with no word beside it** (named for a screen reader and a web tooltip); the field's helper line is one short sentence; Close is an icon button. The cold find (step 9 of `/slice`) tests whether the icon alone is found.

## Open calls for the owner (recommendation first)

1. **Where the data comes from.** `download.geonames.org` is blocked in this cloud environment. (a) **Allow the host in the environment** (`download.geonames.org`, one proposal you approve), so I build and commit the real pack here. (b) You run the script on your computer and commit the file. (c) I finish everything against a fixture and the real pack lands later, with the unit tests over it still todo. Recommend (a).
2. **Names people type that are not the local name** ("Munich" for München, "Florence" for Firenze). Revised by the steward (S1): a population test on who gets alternates is a quiet size ranking, so **every place keeps up to three ASCII alternates, by no size test**. Cost: pack size, measured at build; over 6 MB comes back to you. The alternative is none, and Munich finds nothing.
3. **The magnifier's place.** Recommend beside the title card at the top; the alternative is the right column under Layers. The cold find is the check.

## Deferred

- Villages and places under 5,000 people; a country pack or downloaded region (GZ12 makes it another pack).
- Recents (a stored history; against GZ16 and the vision's restraint).
- Navigate destination, search from every tab, a facts card on pick (the owner's call, Nov 16).
- Distance on a result (not asked for; the order carries it).
- Names in non-Latin scripts beyond the ASCII alternates.

## Native paths that will not run on a device

The pack's `require` of a 3-5 MB JSON on Hermes (first-open cost); the on-screen keyboard over the sheet (insets, `keyboardShouldPersistTaps`); the magnifier's focus return and the screen reader's reading of the list. Each goes to `docs/NATIVE_UNVERIFIED.md` as a first-phone-run check; `GZ2` (keyboard), `GZ15` (first-open time) and `GZ11` (VoiceOver) are listed `device:` in `UNTESTED` where the web journey cannot check them.

## Docs at the end

Decision record for this slice (numbered by `npm run book:next-decision` at ship), amending 0150; `docs/PRODUCT.md` (Explore's search); `docs/ARCHITECTURE.md` (the gazetteer pack, one more bundled asset); `.claude/rules/explore-search.md` (narrow `paths:`); a `/docs-gc`.

## Steward's findings (Nov 16)

One breach, five drifts, one tone; nothing edited by the steward. Accepted: all but where noted.

- **S1 accept** (alternates by size, a hidden cut): no population test; GZ13 adds the alternates rule; GZ4 ends a capped list with "Keep typing to narrow it.", the nearest kept, later words may match region and country so every place is reachable (GZ3).
- **S2 accept**: no distance on rows (GZ5); "Distance on a result" stays deferred.
- **S3 accept**: the order's origin is an argument; a unit test shows a search after a pick uses the live map's middle, not `savedCamera` (GZ4).
- **S4 accept**: the planner hides the magnifier; wide layout, no-fix state, an open card and a banner join GZ17/GZ19; the magnifier's id goes in `NAMES_CLEAR_OF` and `exploreSlots`; a pick cancels an in-flight Look here (`look-cancel`) first (GZ6). Journey rows added to GZ6, GZ17, GZ19.
- **S5 accept**: `lookWords(named)` covers title, subtitle, row label, announcement and empty line (GZ6); unit test "GZ6: no named word says the middle of the map".
- **S6 accept**: the live region speaks on none/some/loading changes only (GZ11).
- **S7 accept**: "Search is unavailable." without an apology (GZ8).
- **Credits**: the real places are `AtlasCard.tsx` (the credit line), `WalkMap.web.tsx` (MapLibre attribution, `OVERTURE_CREDIT`) and the native path; `index.tsx` has none. GZ14 names them; check decision 0115 PW15's planned GeoNames credit is not duplicated.
- **Testability**: GZ15 uses a generous bound and a comparison count; GZ6's announcement is checked with the announcement spy; the cold find is recorded in the spec's Record.
- **Owner questions**: (1) a row's region and country is context, not a moment: no conflict. (2) A capped list is reachable by typing more (S1). (3) Move map is named as the way on (GZ7). (4) Exonyms: now kept for all places. (5) The decision record amends 0150 and also 0092/EC10 (a pick moves the map with Move map off): confirm.
