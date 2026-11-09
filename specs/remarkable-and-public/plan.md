# Remarkable and public: the plan

For the owner to read before any code. Spec: `specs/remarkable-and-public/spec.md` (RP1-RP17). Decisions 0103, 0104.

## Questions for the owner

1. **The kind of a listed building or structure that is not a church, cemetery, theatre or museum** (a bridge, a mill, a station, a courthouse, a Landmark house). These would be the bulk of what the slice adds.
   - **A new kind, "Landmarks"** (recommended), in History, on by default, with its own switch in "What I'm into". It gives the walker an off switch for the whole new set, which is the cheapest guard against noise you'd still find too much, and its name says what it is. Cost: a new `Kind`, a row in `KINDS`, a check in the `marks` journey (the switch list), nothing stored changes shape (`kind` is already a string).
   - **"Monuments and ruins"**, as 0103's `heritage_building` does today: no new switch, but a station or a mill under "Monuments and ruins" reads wrong, and switching it off also hides monuments.

Everything else follows from the owner's calls in the spec's Decisions.

## Files

The archive's build (no app code; runs in the `chronicles-data` weekly job):

- `scripts/places-archive/classify.mjs`: the rule (RP1-RP6, RP8). New pinned lists: `LISTED` (National Register `Q19558910`, Landmark `Q624232` as today), `PUBLIC_TYPES` (RP1's types, each with its subclasses), `OPEN_TYPES` (museum, historic house museum, open-air museum, historic site), `OPEN_TAGS` and `CLOSED_TAGS` for OpenStreetMap (RP2, RP5). New archive classes `church`, `cemetery`, `theatre`, `museum`; `heritage_building` stays the class of every other listed place (its kind is question 1). `classify(item, osm)` keeps 0103's `ORDER` first (RP8), then: district → out; closed → out; Landmark → in; listed and (public type or open type or OSM open) → in; else out.
- `scripts/places-archive/public-types.json` (new): the pinned class ids with their subclasses, written once by `scripts/places-archive/pin-types.mjs` (new, owner-run, like the Nov 6 lookup) and never looked up at build or run time (RP1). Ids are checked against the live service when pinned; the lookup on Nov 9 found two of the first guesses wrong (blast furnace, industrial building), which is why it is a script, not a hand list.
- `scripts/places-archive/fetch-wikidata.mjs`: the cell query adds `UNION { ?item wdt:P1435 wd:Q19558910 }` and returns `listed`; still no sitelinks, articles or counts (RP10). The existing PW14 assertion "never every National Register listing" is amended deliberately (the owner's Nov 9 call), and says so in its name.
- `scripts/build-places-archive.mjs`: OSM signals by Wikidata id (`open`, `closed`, beside today's `gone`), joined only through the `wikidata` tag (RP7); `--review areas.json` writes `review-<region>-<version>.json` beside the archive: per named area, each place it would add, with class and reason (RP12). The archive's bytes don't change with the review.
- `scripts/places-archive/osm.overpassql` (new): the OpenStreetMap query the build expects (PW14 says the queries are kept beside it; none was): elements with a `wikidata` tag and any of `tourism`, `historic`, `amenity`, `access`, `demolished:*`, `razed:*`, `was:*`, for a region's boxes.

The app:

- `src/lib/discovery/archivePois.ts`: `ARCHIVE_CLASSES` gains `church` → History / churches, `cemetery` → History / cemeteries, `theatre` → Culture / theatres, `museum` → Culture / museums; `heritage_building` → History / the kind of question 1. The PW5 pin is re-pinned deliberately.
- `src/lib/discovery/tilePois.ts`: `zoo: [[['zoo', 'aviary'], 'viewpoints']]` (RP15); `MARKABLE_CLASSES` re-pinned (AG5). Nothing for lodging (RP16).
- `src/lib/atlas/atlas.ts`: `ATLAS_CODE` a7 → a8 (the aviary changes what a ring counts).
- If question 1 is "Landmarks": `src/lib/discovery/types.ts` (`Kind`), `src/lib/explore/explore.ts` (`KINDS`, after "Monuments and ruins"), and the e2e `marks` journey's check of the switch list.

The benchmark (RP17):

- `scripts/places-coverage.ts` (new, run with `tsx`): the Nov 9 measurement, kept. Reads the tiles (OpenFreeMap's current build) and Wikidata for a fixed list of areas (the seven of the measurement), runs `placesFromTilePois` and `isMarkable` from `src/lib`, and prints per area: destinations, shown, would-be-added by the current `classify.mjs`, still missed by reason. Network only; never in `npm test` or CI. `npm run places:coverage`.
- `scripts/places-archive/coverage.mjs` (new): its pure parts (name matching, the outcome and reason), unit-tested.

## Data

- No new truth, no cache change, no SQLite migration, no IndexedDB version.
- The archive's version changes with its next build (PW12 rebuilds checklists against it); `ATLAS_CODE` a8 re-reads atlas rows.
- The archive's schema is unchanged: name, class, src, id (RP11, PW7).

## Tests, per criterion

All in the `explore` feature (`src/lib/__tests__/explore/`):

| Id | File | Test name |
|---|---|---|
| RP1 | `placesArchiveBuild.test.ts` | RP1: a listed church, cemetery, bridge, mill and station enter by their type |
| RP2 | `placesArchiveBuild.test.ts` | RP2: a listed house or building enters only when a museum type or its OSM tags show it open; historic=building is no sign |
| RP3 | `placesArchiveBuild.test.ts` | RP3: a listed house, school, office, bank, hotel or bare building with no open sign and no Landmark stays out |
| RP4 | `placesArchiveBuild.test.ts` | RP4: a National Historic Landmark enters whatever its type, a private house included |
| RP5 | `placesArchiveBuild.test.ts` | RP5: access=private or access=no keeps a place out, a Landmark too |
| RP6 | `placesArchiveBuild.test.ts` | RP6: a historic district never enters, a Landmark too |
| RP7 | `placesArchiveBuild.test.ts` | RP7: OSM joins only by its wikidata tag, and every place comes from Wikidata or the owner (extends PW15's test) |
| RP8 | `placesArchiveBuild.test.ts` | RP8: listed places take their kind by type, and 0103's classes keep theirs |
| RP9 | `remarkablePublic.test.ts` | RP9: a listed church in the tiles with no notable word is one place to find, of the archive's kind |
| RP10 | `placesArchiveBuild.test.ts` | RP10: the fetch asks for National Register listings and Landmarks, never for popularity |
| RP11 | `remarkablePublic.test.ts` | RP11: an archive point carries name, class, src and id only, and no copy names a listing |
| RP12 | `placesArchiveBuild.test.ts` | RP12: the build writes a review per area beside the archive, and an owner's remove leaves the place out |
| RP13 | `remarkablePublic.test.ts` | RP13: every named attraction in the tiles is a place to find, SteelStacks among them |
| RP14 | `remarkablePublic.test.ts` | RP14: an attraction stays one place to find through the merge and the edits |
| RP15 | `remarkablePublic.test.ts` | RP15: the National Aviary (zoo/aviary) is a place to find |
| RP16 | `remarkablePublic.test.ts` | RP16: a lodging place in the tiles is never a place to find |
| RP17 | `placesCoverage.test.ts` | RP17: the benchmark matches a Wikidata item to a place and names why a miss was missed |

- RP13's fixture: `src/lib/__tests__/explore/steelstacksPois.json`, the decoded `poi` features of the z14 tiles over the campus from build `20261101_080013_pt` (names, classes, positions; a few kilobytes), with the build named in the file.
- RP11's "no copy names a listing": a grep over `src/app` and `src/components` strings for "listed", "register", "landmark" as a label (beside `check:vision`).
- No new journey: no screen changes unless question 1 is "Landmarks", which adds one check to `marks` (the switch is listed and on by default).

## Deferred, and why

- **Places only OpenStreetMap knows** (the furnaces' own feature): the owner's call (corroborate only); adding them makes the archive a derived ODbL database. `docs/DEFERRED.md`, with the licence question.
- **Registers outside the US** (Zurich's 199 listed misses are on Swiss registers): US first (0103); another region is the same rule with its register's id. `docs/DEFERRED.md`.
- **The `chronicles-data` workflow**: it must pass `--osm` (built from `osm.overpassql`) and `--review` to the build; that repo is not in this session. Listed for the owner in `docs/STATUS.md` "Needs the owner".
- **Why the owner didn't see the Steel Stacks**: not this slice (the data has them); a separate look at the exploring walk and the Explore tab's naming.
- **Nothing reaches a phone until PW16** sets the archive's address (unchanged).

## Native

No native code. Nothing to add to `docs/NATIVE_UNVERIFIED.md`.

## Steward

(Findings and their triage, below, before the owner reads this.)
