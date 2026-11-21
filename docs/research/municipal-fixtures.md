# Municipal fixtures: the data set (investigation, 2026-11-21)

From: the owner's /investigate, 2026-11-21: "How could we build a data set for which every town, major town, city is given its
municipal fixtures, such as visitor centers, etc., that could be overlaid on the map that aren't necessarily sights to see, but
are points of interest in the sense that if you always want to stop by the visitor center to see what's around, it's easy to see
where that is and be known ahead of time that a particular area has it, whether that be through its Explorer card or just seeing
it on the map." Queued as G13 (`docs/STATUS.md`, "Next evolutions"). Status: queued.

## What the owner saw

No screen: an idea. It is decision 0225's town fixtures (Nov 18), specced as `specs/town-fixtures/spec.md` (TF1-TF24) on
`claude/determined-wright-yg1fq9` and deferred by the owner the same day, with its hand-off in `specs/shop-facets/handoff.md`
on that branch. What 0225 settled stands: a town's card says in words what it has, the map marks where, a layer of its own,
never counted, never a find. What was never worked out is where the data comes from, which is this question.

## Why it is not there yet

1. **No source has been measured for fixtures.** The places pack (`places-us-20261118.35`, 173,463 places) holds civic
   buildings (3,705) and stations (1,204) as finds; nothing in it is a tourist office, a library or a post office as such.
2. **The fixture list waits on a count nobody has run.** chronicles-data's OpenStreetMap kind counts (`osmKindCounts`, its
   SK1-SK13) need a "Manual places build" with OpenStreetMap ticked, or the scheduled build; the public manifest still points
   at Nov 18's run 35 (`https://miguelaguerrero.github.io/chronicles-data/manifest.json`, read Nov 21).
3. **OpenStreetMap cannot be measured from a cloud session.** Overpass, Geofabrik and taginfo are refused by the network
   (checked again Nov 21); only chronicles-data's own build reads OpenStreetMap.

## What was measured (Nov 21)

**Overture places** (release `2026-11-18.0`, the one the app reads, `src/lib/activity/release.ts`), every place within a
radius of six real centres, by the leaf of `taxonomy.hierarchy` (script kept outside the repo; it reads tiles as
`scripts/fixture-overture.mjs` does):

| Place (radius) | places read | visitor_center | town_hall | library | post_office | public_plaza | train_station | bus_station | farmers_market |
|---|---|---|---|---|---|---|---|---|---|
| Providence RI, city (1.5 km) | 8025 | 1 | 2 | 24 | 6 | 5 | 3 | 8 | 3 |
| Harrisburg PA, city (1.5 km) | 3629 | 0 | 1 | 9 | 3 | 1 | 1 | 3 | 2 |
| Gettysburg PA, town (1.2 km) | 1225 | 1 | 0 | 3 | 2 | 1 | 4 | 2 | 3 |
| Bristol RI, town (1.2 km) | 690 | 0 | 1 | 1 | 3 | 0 | 0 | 0 | 0 |
| Stowe VT, village (1.2 km) | 503 | 0 | 1 | 1 | 2 | 0 | 0 | 0 | 0 |
| Marfa TX, small town (1.2 km) | 239 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 1 |

What the names show:

- **Visitor centres are the weakest kind.** Providence's one is the Convention & Visitors Bureau; Gettysburg's is "Destination
  Gettysburg" (the bureau); Stowe's has none; Marfa's ("Marfa Tourism Department", 0.97) is filed as a government office.
- **Town halls are mostly right** (Providence City Hall, Bristol Town Hall, Marfa City Hall, Stowe Town Clerk), with misfiles
  (Harrisburg's one "town hall" is its Codes Administration Bureau).
- **Libraries are right but mixed**: public branches beside university, state and administrative libraries.
- **Post offices mix in parcel points** (UPS Access Points, a DHL Service Point) beside the Postal Service's own.
- **Stations are noisy** in small towns (a scenic railway, a train's name).

**Wikidata** (query.wikidata.org, US items with coordinates, `P31/P279*`): visitor centre (Q18411786) 281; city hall
(Q25550691) 1,025; town hall building (Q543654) 648; public library (Q28564) 14,594; post office (Q35054) 618; square
(Q174782) 374. Strong for libraries, thin elsewhere.

**Other sources, not measured:** the IMLS Public Libraries Survey publishes every US public library outlet with coordinates,
public domain (https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls, read as a search summary).

## How adjacent apps do it

In `docs/research/adjacent-apps.md`, "Mark a town's staples: the tourist office, the hall, the library": Michelin town plans
mark tourist information, post offices and the like beside the sights (search summary, unverified); OpenStreetMap separates a
town's tourist office (`information=office`) from an attraction's visitor centre (`information=visitor_centre`) (wiki, search
summary); Apple Maps draws civic glyphs on its base map with no switch (from memory); AllTrails lists a trailhead's facilities
as words and glyphs (from memory); Foursquare counts check-ins at a town hall, the counter-example.

## Options

| # | The change | Answers | Vision risk | Rough cost |
|---|---|---|---|---|
| A | A third pack in chronicles-data, OpenStreetMap-first, Overture and Wikidata (or the library survey) folded in where strong, de-duplicated at build; the app reads it through an adapter | 1, 2, 3 | none beyond 0225's | data repo: an extractor, a merge, a contract; app: adapter, contract pin, in-memory source |
| B | No pack: the app filters the Overture places it already reads by fixture categories and name rules | 1 | none | app only, a core filter and a shell read; visitor centres patchy as measured |
| C | A third pack from OpenStreetMap alone | 1, 2, 3 | none | as A without the merge; gaps where OpenStreetMap is thin |
| D | Leave it deferred | none | none | what was measured goes into the hand-off |

## The owner's calls

Asked in this run, Nov 21, each answered with the recommended option; decision 0255 (amends 0225):

1. **Source**: A, the OpenStreetMap-first pack with the others folded in (offered: A, B, C).
2. **What "visitor centre" means**: the town's tourist office only, `information=office`; an attraction's visitor centre stays
   a place to discover (offered: that, or both kinds).
3. **Scope**: the data set first; the card's line and the map's layer after, as their own step with a mock-up (offered: that,
   the whole spec now, or keep it deferred).
4. **The count**: wait for Monday's scheduled build, Nov 23 (offered: that, or the owner starts the build now).

## The recommendation

Option A, as the first slice of 0225's town fixtures: the pack and the app's read of it, with nothing yet drawn.

```
Idea: A data set of each town's fixtures (the tourist office, the hall, the library, the post office, the square, the market,
  the main station), built as a third pack and read by the app, before any screen shows it
Verb: earn (knowing ahead where a town's tourist office and middle are), through the screens that follow
Touches: decision 0225 (its shape stands), 0255, 0005 (nothing leaves the device beyond the pack's reads), 0156 (no dataset
  hard-coded: through an adapter)
Verdict: no surface (this slice); the screens keep 0225's gate, "aligned if reshaped", and get a mock-up (0252)
Shape: as asked
Criteria: below
Open: the list of kinds, from Monday's count
```

Size **M**: one slice in the data repo and one small one here, no architectural decision beyond 0225's pack.

## Done when

The app, on the web build in a test, reads Stowe's and Marfa's fixtures from the pack through its adapter and finds each town's
tourist office where OpenStreetMap has one, its town hall and its library, and nothing of a kind outside the list.

## What the slice will touch

- **chronicles-data** (its own session; `/data-build` runs the build): an OpenStreetMap extractor for the fixture tags
  (`tourism=information` + `information=office`, `amenity=townhall`, `amenity=library`, `amenity=post_office`,
  `place=square`, `amenity=marketplace`, the main `railway=station`, as the list settles), the merge with Overture and
  Wikidata, a fixtures pack and its contract version, the manifest.
- **This repo**: the contract pinned (`src/lib/__tests__/outing/contract/` holds the stores pin), an adapter beside
  `discovery/archiveManifest.ts` and `discovery/tilePois.ts`, an in-memory source for tests, layer tags (`core` for the
  decode, `adapter` for the read). No screen.
- Checks first: `npm run check:affected`, the contract tests, `npm test`.

## Open for the owner

- **The list of kinds** (TF1), from Monday's `osmKindCounts`: the hand-off's "proposed in", "arguable" and "proposed out"
  tables redrawn from the counts and brought to the owner before the contract is fixed.

## Engineering unknowns

- How the merge matches one fixture across sources (name and distance, as `activity/points.ts`'s `matchName` does for busy
  areas) and what radius.
- Which station is a town's "main" one, and how a market square (`place=square` named "Market Square") is told from a market.
- Whether a fixture is assigned to its town in the pack or read against the town's outline in the app (the outline is already
  drawn, TO1); the card's line needs one or the other.
- Nothing of this has run on a phone.
