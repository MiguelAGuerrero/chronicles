<!-- Repo first (like navigate-ready, explore-atlas): not yet a tab of the owner's concept doc. Amends "Places worth the stop" (specs/places-worth-the-stop/spec.md). -->

# Remarkable and public

Nov 9, 2026 · the owner, after "why is the Bethlehem Steel Stacks missing?"

The places archive takes a listed place when it is remarkable and public: on a heritage register, and reachable from public ground. A listed church, cemetery, bridge, mill or station becomes a place to find; a listed house, school or office does not, unless it is a National Historic Landmark or a source says it is open to visitors. Attractions in the map stay places to find, and the National Aviary joins them.

## Why (the measurement, Nov 9)

Wikidata's located items against what the app keeps from the real tiles (OpenFreeMap `20261101_080013_pt`, through `placesFromTilePois` and `isMarkable`), in Bethlehem, Allentown, Easton, Jim Thorpe, Pittsburgh, Philadelphia's Old City and Zurich:

- 84 of 369 plausible US destinations become places to find (Bethlehem 2 of 16; Zurich 32 of 333).
- 202 are never in the tiles (no `man_made`, `historic` only as monument, castle or ruins, `building` only as dormitory); 45 are in the tiles and dropped by `tilePois`; 38 are kept but stopped by the `notable.json` name words (Central Moravian Church, Packer Memorial Chapel).
- 172 of the 285 misses carry a heritage listing (155 National Register, 15 National Historic Landmarks); the archive takes only Landmarks (0103, Nov 6), so it would add about 18.
- A draft of this rule on the sample's National Register listings: 59 public-type listings in (Packer Memorial Chapel, Bethlehem Silk Mill, Easton Cemetery, the Mauch Chunk station), 36 houses and 30 districts out, and public places Wikidata types only as "house" or "building" (Trout Hall, Burnside Plantation) in only through a sign that they are open.
- Nationally, National Register listings typed only as house (16,116) or building (10,320) stay out unless a Landmark or shown open; the public-by-nature types are smaller (churches 4,456, road bridges 1,945, stations 1,113, cemeteries 940).
- The Steel Stacks are in the data: the tiles carry `SteelStacks` as `attraction/attraction`, a place to find of kind viewpoints. Every named attraction in the seven areas' tiles is kept (65 of 65).

## Vision

Idea: Close the measured gap in places to find: heritage listings as the landmark signal (the National Register, not only Landmarks), a listing lifting a tile place past the name-word rule, OpenStreetMap's tags read by the archive, attractions kept, the aviary folded in; Overture as a source was put to the gate and reshaped away (the owner, Nov 9).
Verb: earn (it raises what you notice: the buildings, bridges, mills and churches that make a town itself, which the tiles can't carry)
Touches: Never, "Ratings, reviews, stars, 'best of', rankings of places" (nearest fit: "open-data signals such as a heritage listing"); Never, "Popularity, trending, foot traffic"; Always, "Guidance is structural: where there is a lot, and what makes a place itself, never whether it is good"; decision 0103 ("a listed building enters only as a National Historic Landmark", Nov 6, after 847 of 900 places in a test cell were National Register listings; "Significance is a gate, never a measure"; "Type decides, never age or listing"); PW7 (name, class, src, id); PW15 (OSM only corroborates); the "signal" rule of Places worth the stop ("A shop or eatery becomes a place only with a signal"); the activity-density rule (Overture's places, never marks); AG5 (`MARKABLE_CLASSES` pinned).
Verdict: aligned if reshaped (decision 0104)
Shape: A listing is a gate on what a place is, never a measure or a label: a listed place enters when it is public (its type public by nature, or a source showing it open) or a Landmark, never a district and never a place OSM marks closed. OpenStreetMap's tags corroborate Wikidata items; Overture stays for busy streets. On screen nothing new: these are places to find of the existing kinds, never labelled listed or historic, never sized, ordered or counted by notability.
Criteria: RP1-RP6 (the rule), RP7 (OSM corroborates), RP8 (kinds by type), RP9 (the name rule lifted), RP11 (nothing about a listing shown or stored; order and size unchanged), RP12 (the owner's review, never published), RP13-RP14 (attractions), RP15 (aviary), RP16 (no hotels from tiles), RP17 (the benchmark structural), RP18 (no kind named for significance), RP19 (whispers bounded), RP20 (reachability said, never filtered).
Open: none (the plan's questions answered Nov 9).

## Decisions

- **Nov 9 (decision 0104):** a listed place enters when remarkable (a heritage listing; the National Register counts) and public (reachable from public ground: "Reachable from public ground"; a bridge, a monument, the furnaces count though they can't be entered).
- **Nov 9:** mundane buildings with no historic precedent or remarkability stay out ("not every building might not be publicly available. So like a private residence or a reserve that can't be entered").
- **Nov 9:** a private house that is a National Historic Landmark is a place to find ("Yes, if NHL"; the gate recommended never).
- **Nov 9:** "ensure that we have attractions supported too": the tiles' attractions are pinned; the listing rules never remove one; Wikidata's loose "tourist attraction" class is not used.
- **Nov 9:** OpenStreetMap only corroborates ("Corroborate only"): its tags decide whether a listed Wikidata item is public, closed or gone; a place found only in OSM is not added (deferred, with its licence question: an archive with OSM-only places is a derived ODbL database). This supersedes 0104's "a place found only there enters by the same pinned class table" (recorded in a new decision with the slice).
- **Nov 9:** Overture stays for busy streets; historic hotels are not added to `tilePois`.
- **Nov 9 (the plan's questions):** the new kind is "Buildings and structures", on by default; the replay's whispers follow the card's rule ("Bound them like the card"; amends RR15); reachability is not a filter ("Trust the tags, but just develop a way to warn or inspect whether something might or may not be accessible, but don't limit the data because of it"), and the warning goes to both the owner's review and the walker's card ("Both").
- **Nov 9:** "Viewpoints and attractions" (the kind) and "Viewpoints & oddities" (its category) are two levels, not two names for one thing; both stay.

## Acceptance criteria

The rule (the archive's build, `classify.mjs`):

1. **RP1 Listed and public by type.** A Wikidata item on the National Register whose type is public by nature enters the archive: places of worship, cemeteries, courthouses, town halls, post offices, libraries, theatres and opera houses, railway stations, bridges, dams, locks and aqueducts, mills, factories, breweries and furnaces, lighthouses and water towers, forts and fountains. The types are a pinned list of Wikidata classes, with their subclasses fixed at pin time, never looked up at run time.
2. **RP2 Listed and shown open.** A listed item of any other type enters when a source shows it open to visitors: its Wikidata type is a museum (a museum, a historic house museum, an open-air museum, a historic site), or the OpenStreetMap element carrying its Wikidata id is tagged `tourism=museum|attraction|gallery`, `historic=monument|memorial|castle|ruins|fort|archaeological_site`, or `amenity=place_of_worship|theatre|arts_centre|library|townhall|courthouse`. `historic=building` and other plain historic tags are no sign.
3. **RP3 Mundane stays out.** A listed house, residence, school, office, bank, hotel or commercial building, or a listed item whose type is only "building" or "structure", with no sign of being open (RP2) and no Landmark status (RP4), never enters.
4. **RP4 A Landmark enters.** A National Historic Landmark enters whatever its type, a private house included.
5. **RP5 Never where it can't be reached.** An item whose OpenStreetMap element is tagged `access=private` or `access=no` never enters, a Landmark included.
6. **RP6 Districts never.** A historic district never enters, a Landmark included (PW7 holds).
7. **RP7 OpenStreetMap corroborates.** OSM elements are joined to items only by their `wikidata` tag; every place in the archive comes from Wikidata or the owner's file (PW15 holds), and an OSM element with no Wikidata item adds nothing.
8. **RP8 Kinds by type.** A listed place of worship is a Historic church; a cemetery a Cemetery; a theatre or opera house a Theatre; a museum a Museum; any other listed building or structure (a bridge, a mill, a station, a courthouse, a Landmark house) is of a new kind, "Buildings and structures", in History, on by default in "What I'm into". The classes of 0103 come first in their order (a monument is a Monument, an observation tower a Viewpoint, a lighthouse a Curiosity), so a listing never changes the kind of a place 0103 already classed.

What the app does with them:

9. **RP9 A listing lifts the name rule.** A tile place with the same name as a listed archive place within 50 m is one place to find, of the archive's kind, whatever its name says: "Central Moravian Church" with no word from `notable.json` (PW8's merge).
10. **RP10 The fetch asks for listings, never popularity.** The weekly fetch asks each US cell for National Register listings and Landmarks beside the pinned classes, with what says a place is gone, and never for sitelinks, articles, page views or a count (PW7 holds).
11. **RP11 Nothing new is stored or shown.** An archive point still carries name, class, src and id only: no listing, register, date or notability field. A listed place shows as any place to find does: its name and its kind's label, the existing labels the only words beside it, in the same order, size and colour as any other place whatever its source. No screen shows a listing, a register or a count of listed places (steward 5).
12. **RP12 The owner's review.** For each named test area, the build writes beside the archive (never inside it) a review listing every place it would add, with its class and why it entered (public type, shown open, Landmark). It also gives, for the whole region, how many places each class and reason adds, and each test area's atlas History step before and after (steward 7, 8). The review is the owner's: never part of a release, the archive or the manifest. The owner strikes a place through `archiveEdits.json`'s `remove`, and the next build leaves it out.

Attractions and the tiles:

13. **RP13 Attractions are places to find.** Every named `tourism=attraction` in the tiles is a place to find of kind "Viewpoints and attractions": SteelStacks, from the tiles over Bethlehem's SteelStacks campus (build `20261101_080013_pt`), is the fixture.
14. **RP14 The listing rules never remove an attraction.** A tile attraction with no archive place, or with one of the same name within 50 m, is still one place to find after the merge and the owner's edits, unless the owner's `remove` names it.
15. **RP15 The aviary.** A tile place of class `zoo`, subclass `aviary`, is a place to find of kind "Viewpoints and attractions" (the National Aviary); `MARKABLE_CLASSES` is re-pinned (AG5).
16. **RP16 No hotels from the tiles.** A tile place of class `lodging` is still never a place to find; a hotel is one only through the archive (RP2, RP4).

The benchmark:

17. **RP17 The coverage measurement is kept.** `npm run places:coverage` (network; never in CI or `npm test`) reads the tiles and Wikidata for a fixed set of areas and reports, per area, the plausible destinations (defined by structure only: on a register or of a pinned public type, standing, not a district; never by sitelinks, articles or page views, steward 3), those shown, those an archive would add, and those still missed with the reason (never in the tiles, dropped by the adapter, stopped by the name rule). Its pure parts (matching a Wikidata item to a place, the reason) have unit tests. Its reports are for the owner, per area in words and lists, never shown in the app and never a percentage to aim at.

The labels:

18. **RP18 No kind is named for significance.** No kind's label holds a register's name or a word for significance ("landmark", "notable", "listed", "remarkable"), since a kind's label is shown beside every place of that kind (`name · kind` on the walk's card, "Found: … · kind") (steward 1).

The replay and reachability:

19. **RP19 The whispers are bounded.** A replay whispers passed places as its card names them: one or two by name, more than two as one "Passed a few places without stopping", never one whisper per place (amends RR15).
20. **RP20 Reachability is said, never filtered.** A place to find with no street or path of the same tile read within 60 m is still offered and still findable; its card on the walk says "No street or path close by" under its name. The owner's review (RP12) and the benchmark (RP17) flag such places "may not be reachable". Nothing is removed for it.

## Record

Built Nov 9 on `claude/gallant-maxwell-hp14jb` (tests first `59d0663`, code `3a99310`; decision 0105 for the slice's calls).

- **Passed:** RP1-RP20, each by its named test (`npm run check:test-first remarkable-and-public`: 20 of 20 tested first). Unit tests 1,422 pass; typecheck and lint clean. E2E: `marks` (RP18, RP20 and its own checks), and `curiosities`, `edit`, `gaps`, `headsup`, `hidden`, `layers`, `nudge`, `ready`, `reload`, `replay`, `tabs`, `walkability`, all green on the e2e build.
- **Re-pinned on purpose:** PW5 (`ARCHIVE_CLASSES`), E16 (ten kinds), PW14's fetch rows (`listed`) and its audit-5 message (listings are asked for).
- **Not changed:** `ATLAS_CODE` stays a7 (the plan says why).
- **What the benchmark showed on Bethlehem (Nov 9):** the rule adds Bethlehem Waterworks, Burnside Plantation, the Gemeinhaus and Packer Memorial Chapel without OSM's signals; most remaining misses are unlisted churches and cemeteries (stopped by the name rule) and unlisted bridges and stations (not in the tiles). Central Moravian Church is a contributing building of a listed district with no listing of its own, so the listing gate does not lift it (DEFERRED).
- **Deferred:** OSM's signals in production (the weekly job passes no `--osm` yet), places only OSM knows, contributing buildings of a listed district, registers outside the US, the "History & landmarks" category label and "Historic churches" for every place of worship (the owner's copy calls); `docs/DEFERRED.md`.
- **Native:** the card's line and the new switch have never run on a phone (`docs/NATIVE_UNVERIFIED.md`).
- **Audit:** see "Audit" below.

## Audit (Nov 9, at the owner's request)

The auditor (13 findings) and the steward (6, numbered on after them). 19 findings: 17 fixed, 1 fixed in part and deferred in part, 1 rejected. Regression tests `remarkable-and-public audit N` in `placesArchiveBuild.test.ts`, `remarkablePublic.test.ts`, `placesCoverage.test.ts` and `replay/ceremony.test.ts`, each committed failing (`remarkable-and-public audit: regression tests first`) before its fix. The owner's two calls are decision 0106.

1. Listed courthouses, town halls, city halls and libraries never entered (they are offices to Wikidata): accept, fixed. A home is never public by type; another mundane class stays public when a public root reaches it; libraries are public roots. The overlap kept is civic: county courthouses (1,298 listings), town halls, courthouses, armories, city halls. (audit 1)
2. `osm.overpassql` did not parse and one statement was unbounded; the build read any `--osm` shape as empty: accept, fixed. (audit 2)
3. The review lacked the History step before and after, and the reach flag: accept in part. The reach flag is the benchmark's (`places:coverage --review`, matched by `areaKey` since audit 8); the History step needs the atlas's tiles, which the build does not read: deferred.
4. `was:*` dropped repurposed, still-standing stations and churches: accept, fixed (only `demolished:`, `razed:`, `destroyed:` mean gone). (audit 4)
5. A large place showed twice (Wikidata at the gate, the map mid-grounds): accept, the owner's call, 200 m for the same name and category (decision 0106). (audit 5)
6. Two fast taps could lose the second card's line: accept, fixed (the shell answers only the latest ask). (audit 6)
7. "No street or path close by" at the edge of the read tiles: accept, fixed (said only when every tile under the 60 m disc holds cached streets). (audit 7)
8. The benchmark counted rail and ferries as ways, missed "Jim Thorpe", and matched on one shared word: accept, fixed. (audit 8)
9. A day replay bounded passes across its walks: accept, fixed (bounded per walk). (audit 9)
10. Sites, battlefields and wrecks were "Buildings and structures": accept, the owner's call, Monuments and ruins (decision 0106). (audit 10)
11. `wikidata=Q1;Q2` was ignored: accept, fixed. (audit 11)
12. A district also typed ghost town or monument entered: accept, fixed. (audit 12)
13. An ended listing counted; a cut-off answer killed the fetch: accept, fixed. (audit 13)
14. (steward S1) "Passed a few places" came at the first place, false when said: accept, fixed (at the last). (audit 14)
15. (steward S2) Absence the cache cannot know: accept, the same as 7, fixed there.
16. (steward S3) "Buildings and structures" stands in for "listed": reject for now: only listed places fill it by design (0105); widening it to unlisted structures is the owner's open question (DEFERRED).
17. (steward S4) The deferred "History & landmarks" entry should name the find announcement too: accept, DEFERRED says so.
18. (steward S5) The review was written into the archive's folder: accept, fixed (`--review-out`, refused when it is `--out`). (audit 18)
19. (steward S6) `passedAlong`'s comment described the old whispers: accept, fixed.

Also from the auditor, for the owner: "No street or path close by" sits under "Walk within 60 m to see what it is." on a "?", which reads as two instructions (copy; DEFERRED).
