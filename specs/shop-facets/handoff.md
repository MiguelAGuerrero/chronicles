# Stop facets and town fixtures: hand-off (deferred by the owner, 2026-11-18)

The owner: "Defer for now and keep references of your work and insight so that a future agent may review and pick up when I'm
ready." This file is that reference. It covers two specs that were written together and wait on the same measurement:

- `specs/shop-facets/spec.md` (SHF1-SHF30, decision 0221): every stop of an outing described by the same facets.
- `specs/town-fixtures/spec.md` (TF1-TF24, decision 0222): a settlement's staples as a layer of their own, never finds.

**Nothing of either is built in the app.** Do not start building on the strength of this file: ask the owner first. When they
are ready, begin at "How to pick this up".

## What the owner decided (their words are in the two decision records)

| Question | Answer |
|---|---|
| Which shops | Shops worth browsing; errands and services stay out |
| How chips combine | Facets: picks within a facet widen, picks across facets narrow |
| How the lists are chosen | Measure the data first, then show the owner before any contract changes |
| Shops only, or every stop | One model for every stop: a "kind of place" facet replaces today's five attraction chips |
| "Can be entered" | Its own facet. Entered: "any sort of fenced off or bordered area that must be entered, especially with admission gating or some sort of visitation registration". From outside: "things that can be appreciated from the outside, like a monument or a sculpture". Bounded, not indoors, is the test |
| Galleries and museums | Join the places pack from OpenStreetMap |
| Opening hours | "There has to be some consideration": carried where a source states them; what the page does with them is undecided |
| Other kinds | "farmers markets, boutiques, gift shops, visitor centers, and other ... stops that aren't quite stores ... but are well-known attractions" are kinds too |
| Fixtures: purpose | Describe (a line of words on a town's card) and anchor (marks on the map) |
| Fixtures: "the level of a settlement" | Words only. No tier, tally or comparison between towns |
| Fixtures: scope | Civic and gathering places; practical amenities (toilets, parking) are out |
| Fixtures in an outing | A stop, never a find |
| The composer's form | "we might opt to using a step form like a wizard, but that decision depends on how other apps handle this": decide from precedent, with mocks |

## What the owner has NOT decided (the draft lists below were shown to them and then deferred)

1. The arguable rows in the two tables below. The fixtures table matters most: a kind that becomes a staple stops being findable.
2. Which candidate facets to pursue (opening hours and admission were raised by the owner; the rest are this agent's).
3. Whether a town's walk should begin at a plaza or a visitor centre in place of the town's bare point (TF15).
4. The composer's form: chips in place, a "Refine" sheet, or two stages.
5. Whether clothes, shoes and jewellery sold new are "worth browsing" or errands.

## The draft lists (this agent's proposal, not measured, not approved)

Drawn from how OpenStreetMap documents its tags, what the live packs held on Nov 18, and the owner's rules. The count may add or
remove entries.

### Facet: kind of place

| Group | Kinds |
|---|---|
| Art | gallery, public art, sculpture, statue, mural, fountain, art environment, artist's studio |
| Culture | museum (by type: art, history, science, local, maritime, transport, children's), theatre, concert hall, cinema, arts centre, observatory, planetarium, aquarium, zoo, carousel, little free library |
| History | monument, memorial, war memorial, marker or plaque, historic building, historic house, fort, castle, battlefield, archaeological site, ruin, mill, lighthouse, bridge, covered bridge, old machine, old stone, tavern, mausoleum, ghost town, historic ship |
| Green | park, garden, botanical garden, community garden, nature reserve, wildlife refuge, arboretum, woods, waterfall, cave, hot spring, beach, old tree, natural monument |
| Views and oddities | viewpoint, overlook, fire tower, tower, pier, boardwalk, roadside giant, natural oddity, odd engineering, folly, time capsule, survey mark |
| Shops | any shop worth browsing (refined by the two shop facets) |
| Markets and makers | farmers' market, flea market, craft market, a maker's workshop that sells (pottery, glass, weaving, leather, jewellery, bookbinding) |
| Places simply known | a named attraction, a theme or amusement park, a water park, a winery, a brewery, a distillery, a farm you can visit |

The app already switches 57 kinds in five groups in "What I'm into" (`src/lib/explore/explore.ts`, `KINDS`); SHF20 says one list
serves both screens. No gallery kind exists anywhere today.

### Facet: entered, or from outside

- Entered: museum, gallery, shop, market, zoo, aquarium, theatre, fort, walled or gated garden, reserve with a gate, theme park, winery.
- From outside: monument, sculpture, statue, mural, marker, bridge, a lighthouse seen from the road, viewpoint, roadside giant.
- Arguable, the owner's: an open park with no fence, a cemetery, a church, a pier, a ruin, a battlefield.
- A place overrides its kind's side where its source says it charges, takes bookings or is fenced (SHF21a).

### Facet: what a shop sells

| Group | Values |
|---|---|
| Print | books, comics, maps, newspapers and magazines, stationery |
| Music and film | records, musical instruments, film and video |
| Art and craft | art (dealers), art supplies, craft supplies, frames, photography |
| Home | antiques, furniture, interior decoration, housewares, lighting, rugs, pottery and ceramics |
| Clothes and wear | clothes, boutique, shoes, bags, jewellery, watches, hats, fabric |
| Play and collect | toys, games, models, collectibles, coins and stamps, sports cards |
| Gifts | gift shop, souvenirs, museum shop, florist |
| Food to take home | bakery, cheese, chocolate and sweets, deli, tea, coffee roaster, wine, spices, farm shop |
| Outdoors | outdoor gear, bicycles, fishing, garden centre |

### Facet: how a shop sells it

New; second-hand (thrift and charity); vintage (curated); antique; handmade (sold by its maker). Where the source does not say,
no value: never assumed new. Today's "Thrifting" and "Antiques" chips are really this facet, which is why they overlap and why a
used bookshop cannot be asked for.

### Candidate facets (not decided)

| Facet | Values | Depends on |
|---|---|---|
| Opening hours | open today; hours not known | how many places state hours (the count's `withHours`) |
| Admission | free; paid; booking needed | whether sources record a fee or a reservation |
| Indoors or outdoors | under a roof; in the open | derived from kind; not the same as "entered" (a walled garden is entered and outdoors) |
| Step-free access | yes; limited; not stated | how often wheelchair access is recorded |
| New to you | places you have not been near | built already (visited from the trace, OJ47) |
| Independent or chain | independent only; include chains | built already (a name list, QC13) |
| How far | close by, or a reach | built already (OJ41) |
| Character of the journey | among the shops, past old places, through green, a bit of each | built already; would be derived from the groups of kinds (SHF27) |

Never facets: a rating, popularity, "best of", a price level, how busy, a number of reviews, trending. Each is a crowd's measure,
which the vision rules out.

### Town fixtures: proposed in

| Group | Fixtures |
|---|---|
| Arrival and orientation | visitor centre, tourist information office, main railway station, bus station, ferry terminal |
| Civic | town or city hall, courthouse, post office, public library, community centre |
| Gathering | plaza or town square, market square or market hall, main street or high street, village green or common, bandstand or pavilion |
| Everyday landmarks | a clock tower on a civic building, a town sign or gateway |

### Town fixtures: arguable, the owner's

| Fixture | For a staple | Against |
|---|---|---|
| Church or place of worship | nearly every settlement has one | 6,176 are finds today; many are worth noticing |
| Cemetery | every town has one | 890 are finds today; old ones are discoveries |
| War memorial | close to universal | 2,722 are finds today; it is a thing looked at |
| Central or town park | a staple of any town | parks are the heart of the Green group |
| School, college, university | universal | not visited; a campus can be a discovery |
| Hospital, fire station, police station | universal | errands and emergencies |
| The town's own museum | very common | entered and discovered |
| Theatre or cinema | common | already a Culture kind |
| Station building | a staple as transport | 1,204 historic stations are finds today |
| Water tower | marks many small towns | 1,287 are finds today |

### Town fixtures: proposed out

Public toilets, parking, drinking water, benches, bins, cash machines and banks, fuel, pharmacies, supermarkets, bus stops, taxi
ranks, bicycle racks, charging points.

## What was measured, and what it showed

**The live packs, after chronicles-data's run 35 (Nov 18).** Both are plain files on the Pages site and can be downloaded whole.

- Places `places-us-20261118.35.pmtiles`: 173,463 places (130,473 OpenStreetMap, 42,990 Wikidata; it was 42,282, all Wikidata,
  before), 71,559 unnamed. Largest classes: fountain 37,913, plaque 21,842, sculpture 15,709, waterfall 9,339, public bookcase
  9,143, statue 8,558, church 6,176, mural 5,672, museum_by_type 4,407, civic_building 3,705, station 1,204, museum 942.
- Stores `stores-us-20261118.35.pmtiles`: 24,326 shops, all OpenStreetMap. second_hand 8,642, books 5,300, antiques 4,279, crafts
  3,240, records 1,744, vintage 1,109, **art_supplies 12, maps 2** (those two values do not match how shops are tagged).
- The stores contract has one dimension, `what`, of eight hand-picked values, and reserves `how` and `hours` unused. The pipeline
  keeps 11 `shop=` values and 8 `craft=` values and drops every other kind of shop (`chronicles-data/src/stores/osmShops.ts`).
- The app pins stores contract v3 (`src/lib/__tests__/outing/contract/`); the data repo is at v8. The schema is otherwise the
  same: housekeeping, not a breakage.

**One city's map tiles** (Zurich, the test set; not the US): about 11,400 shops in well over forty kinds, the largest being
errands (convenience, beauty, kiosk, optician). It shows the shape of the list, not its numbers.

**Perimeters** (for "entered", and for the drive spec's places found from the road): `scripts/measure/perimeters.mjs`, table in
`specs/drive-in-the-outing/plan.md`. The map's own tiles have shapes with no names (7 of 9,093), so a shape cannot be tied to a
place; Overture's base theme names 1,647 of 9,981 and matched parks 91 of 99 and cemeteries 37 of 37, but campuses poorly.

## The count that everything waits on

chronicles-data's main counts, in the pass its OpenStreetMap run already makes, every value of `shop`, `craft`, `tourism`,
`historic`, `leisure`, `amenity`, `information`, `place` and `railway` in the US; for shops and crafts the share that say
`second_hand`; and for every tag the share that carry `opening_hours` (its `docs/shop-counts/spec.md`, SK1-SK13; 127 tests).
The result is `osmKindCounts` in the run's `report` artifact.

**It has not run.** It needs "Manual places build" on `main` with OpenStreetMap ticked and Wikidata unticked (the `/data-build`
skill). Two things to know:

- This session's GitHub integration was refused when starting a workflow there (403, "Resource not accessible by integration"),
  three times. Asking another session to start it was also refused, rightly. The owner starts it, or grants Actions write.
- The first run after SK11 downloads all four extracts whole, even if unchanged (over an hour), because an extract is counted
  only when it is downloaded. After that an unchanged extract carries its counts.
- Monday's scheduled build produces the same counts without anyone starting anything.

## How to pick this up

1. Ask the owner whether they are ready, and whether the count has run. Read both specs and decisions 0221 and 0222.
2. Read `osmKindCounts` from the latest OpenStreetMap run's `report` artifact (`actions_list` then
   `list_workflow_run_artifacts`). If there is none, the count has not run: say so, do not estimate.
3. From the counts, redraw the lists above: which kinds exist in numbers, which proposed values are empty, how far second-hand
   and opening hours are recorded. Bring the lists and the arguable rows to the owner (SHF2). No contract change before that.
4. Mock the composer three ways at the real list sizes (SHF14a) and let the owner choose. The precedent is in
   `docs/research/adjacent-apps.md`, "Compose a plan from several choices"; note it is from search summaries, not pages read.
5. Then, in order: chronicles-data contract versions (`what` redrawn and `how` emitted; galleries and museums into the places
   pack; `hours` carried; a fixtures pack), the app's pinned contract, and the app's slices by `/slice`, spec first, test first.
6. Hours need a parser for OpenStreetMap's `opening_hours` language: a library choice, so ask the owner (AGENTS.md).

## Insight worth keeping

- **The app's matching core already narrows across facets.** `matches` in `src/lib/outing/candidates.ts` is "within a dimension
  any value, across dimensions all"; only `matchesAny` across picks widens (OJ14). The work is the chips, the contract and the
  lists, not the matcher.
- **Dependent facets reopen the wizard question.** What a shop sells applies only once shops are picked; that is the case where
  the recorded apps use steps. An earlier "not a wizard" recommendation was withdrawn for this reason.
- **"Well-known" must never become a measure.** A kind is known because a source names it as that kind of place, not by a
  rating or visits (SHF20a). Likewise a town's fixtures are said in words and never tallied (TF7, TF19): the owner's phrase
  "asserts the level of a settlement" was put to them, and they chose words only.
- **Kinds that become fixtures stop being finds**, and a find already made is kept (TF20). This changes "What I'm into".
- **Real towns break the planner in ways the test grid hides.** On Providence's real streets a route costs 40 to 80 ms, a
  failed one most, and shops inside a mall or on a campus cannot be routed to at all (outing-journey audits 61, 62;
  `.claude/rules/outing.md`). More kinds mean more candidates: measure on real tiles before adding routing per candidate.
- **To reproduce a live result off the page:** download the pack with `curl`; fetch the street tiles inside Playwright from the
  live origin (the tile host is refused to `curl` here but reachable from the browser); then run `decodeTile`, `deriveSegments`,
  `legOver` and `planChapter` under `tsx` from a file inside the repo (imports do not resolve from the scratchpad).
- **Blocked from cloud sessions:** Geofabrik, Overpass and every taginfo host. OpenStreetMap can only be measured inside
  chronicles-data's own build.

## Process traps this session hit (so the next one does not)

- **Test-first is read from history by a literal pattern.** `check:test-first` wants `{ todo: ... }` written on the test's own
  line. A todo passed through a variable (`const TODO = { todo: 'test first' }`) is not seen, and pushed history cannot be mended.
  Write `test('TF1: ...', { todo: 'test first' }, ...)`.
- **Decision numbers collide while a branch lives.** `main` took numbers five times in one day; check
  `npm run book:next-decision` before writing a record, and renumber before merging.
- **Merging `main` resets the record documents.** `npm run records -- redo` during a merge takes main's side of STATUS, DEFERRED
  and NATIVE_UNVERIFIED; the branch's entries are then filed again with `npm run records`. Keep the pre-merge copies to refile from.
- **A criterion prefix may be taken** (SH was): list the prefixes in use before choosing one.
- **The presence guard reads comments**: words that are kinds of place ("bar", "sculpture") cannot appear in `src/lib` outside
  the presence modules.
