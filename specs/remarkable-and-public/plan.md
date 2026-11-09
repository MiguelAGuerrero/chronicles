# Remarkable and public: the plan

For the owner to read before any code. Spec: `specs/remarkable-and-public/spec.md` (RP1-RP17). Decisions 0103, 0104.

## Questions for the owner

1. **The name of the new kind** for listed buildings and structures that are not churches, cemeteries, theatres or museums (a bridge, a mill, a station, a courthouse, a Landmark house): the bulk of what the slice adds. A separate kind, on by default, gives the walker an off switch for the whole new set. Its label is shown beside every one ("Bethlehem Silk Mill · …", "Found: Trout Hall · …"), so it names what the places are, never their significance (RP18; the steward's finding 1 struck "Landmarks").
   - **"Buildings and structures"** (recommended): plain, true of a mill, a station and a house alike.
   - "Bridges, mills and stations": concrete, but untrue of a courthouse or a house.
   - Fold into "Monuments and ruins" (no new switch): a station or a mill labelled a monument or a ruin is untrue.
2. **The replay's whispers** (steward 2): every place passed whispers "Passed X without stopping" (RR15), with no bound; an exploring walk through a listed old core would play back as a run of misses. **Recommended:** the whispers follow the card's rule (two names, else one "Passed a few places without stopping"): the lows stay in, the volume is bounded. This amends RR15 (the replay), so it is your call. New criterion RP19.
3. **Reachable from a street** (steward 4): your bar is "reachable from public ground", but only OSM's `access` tag tests it, and a building rarely carries one; a Landmark house down a private drive would be a "?" found only by trespassing (a find needs a capture within 60 m). **Recommended:** an archive place is offered only when a street or path from the same tile read is within 60 m of it (the app already reads them; nothing new is fetched). It applies to every archive place, so a curiosity deep off-path goes too. New criterion RP20.

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
- `src/lib/atlas/atlas.ts`: `ATLAS_CODE` a7 → a8. The aviary changes what a ring counts, and the listings change the History step most: in US old cores History will mostly fill, and outside the US (no register yet) it won't, which bends "where there is a lot" toward "where a register is" (steward 7). RP12's review shows each test area's History step before and after, so the owner sees it before publishing.
- The new kind (question 1): `src/lib/discovery/types.ts` (`Kind`), `src/lib/explore/explore.ts` (`KINDS`, after "Monuments and ruins"), and the e2e `marks` journey's check of the switch list.
- Question 2, if yes: `src/lib/ceremony/rhythm.ts` (the whispers take `passedLine` over the walk's passes, as the card does).
- Question 3, if yes: the read that builds checklists (`landing/read.ts`, `atlas/read.ts`) keeps an archive place only within 60 m of a street or path of the same read (a pure `reachable(place, segments)` beside `mergePlaces`, over `EdgeGrid`).

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
- RP18: a unit test over `KINDS` labels.
- RP19 (if question 2 is yes): `src/lib/__tests__/replay/` "RP19: a replay past many places whispers no more than the card names".
- RP20 (if question 3 is yes): `remarkablePublic.test.ts` "RP20: an archive place more than 60 m from every street or path is not offered".
- No new journey: the new kind adds one check to `marks` (the switch is listed and on by default).

## Deferred, and why

- **Places only OpenStreetMap knows** (the furnaces' own feature): the owner's call (corroborate only); adding them makes the archive a derived ODbL database. `docs/DEFERRED.md`, with the licence question.
- **Registers outside the US** (Zurich's 199 listed misses are on Swiss registers): US first (0103); another region is the same rule with its register's id. `docs/DEFERRED.md`.
- **The `chronicles-data` workflow**: it must pass `--osm` (built from `osm.overpassql`) and `--review` to the build; that repo is not in this session. Listed for the owner in `docs/STATUS.md` "Needs the owner".
- **Why the owner didn't see the Steel Stacks**: not this slice (the data has them); a separate look at the exploring walk and the Explore tab's naming.
- **Nothing reaches a phone until PW16** sets the archive's address (unchanged).

## Native

No native code. Nothing to add to `docs/NATIVE_UNVERIFIED.md`.

## Steward (Nov 9) and triage

1. **Breach: "Landmarks" puts the listing on screen**, since a kind's label shows beside every place (`walk.tsx:1554`, `foundLine`). **Accepted:** the recommendation is now "Buildings and structures" (question 1), and RP18 forbids significance words in a kind's label.
2. **The replay whispers every place passed, unbounded** (`rhythm.ts`). **Accepted as question 2** (it amends RR15, the owner's call); RP19 if yes.
3. **RP17's "plausible destinations" could measure fame.** **Accepted:** RP17 defines a destination by structure only (register, pinned type, standing, not a district), never by sitelinks or articles, and reports in words and lists, never a percentage. The Nov 9 measurement used sitelinks for "well known"; the kept benchmark does not.
4. **A Landmark house can be one you can't reach without trespassing.** **Accepted as question 3** (RP20 if yes). The Precedents row for 0104 now says "a Landmark house excepted", so it no longer reads against RP4.
5. **RP11 doesn't test what it says** ("historic" left out of the grep, since "Historic churches" now holds listed places; "never sized or ordered" not carried). **Accepted:** RP11 now says the existing kind labels are the only words beside a listed place, in the same order, size and colour as any place.
6. **"Historic churches" for a synagogue or a mosque** (tone). **Noted, not changed:** it is today's label for every place of worship from the tiles too, so renaming it ("Places of worship") is a copy change beyond this slice. Offered to the owner as a one-line follow-up.
7. **The atlas's History dots will mostly reflect listing density.** **Accepted:** named under `ATLAS_CODE` above; RP12's review shows the History step before and after per test area.
8. **The review must stay off the published host; only test areas are reviewed.** **Accepted:** RP12 says the review is never part of a release, the archive or the manifest, and adds a per-class, per-reason summary for the whole region.

Silent, put to the owner: whether VISION.md should say a find may be a private house seen from the street (the owner's NHL call); whether `tourism=attraction` is a type or a popularity sign (kept as a sign of "open" in RP2: a mapper's statement that visitors go there, not a measure of how many).
