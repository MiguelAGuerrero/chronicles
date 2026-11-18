---
paths:
  - "src/lib/outing/**"
  - "src/components/outing/**"
  - "src/lib/__tests__/outing/**"
---
# Plan an outing

One page from Explore: pick what you want to see from a vocabulary, get one proposed circuit (QC1-QC40, decision 0194, the spec is `specs/quick-circuit/spec.md`, its plan `plan.md`, the data side's contract `handoff.md`). It reuses the walk planner's routing (`fitOrder`, the legs, the ceiling and retrace rules, `PlannerCapture`) and adds no second planner.

## What it is

- **The core knows no kind of place** (QC37). It plans over a `Candidate` (id, position, facets by dimension, a name held for a tap or arrival only) and a `Want` (a match over facets): within a dimension any value, across dimensions all (`mergeFacets`, `matches`). `candidates.ts`, `pick.ts`, `plan.ts`, `swap.ts`, `dest.ts` and `arrival.ts` hold no word of a dimension or a shop (a test greps them); `wants.ts` is the vocabulary and the only place an entry is spelled.
- **Shops are presence, never points of interest** (the owner, Nov 16): the stores layer (`stores.ts`, `storesRead.ts`, `storesMerge.ts`) is read only by `outing/`; no store reaches the places archive, marks, the atlas or a checklist (QC31, held by a grep test). A shop enters by what it sells and by nothing a crowd says (QC11, QC12): `isStore` rejects any field beyond id, name, position, facets, src.
- **The pack is chronicles-data's** (`handoff.md`): tile features with flat properties `name`, `id`, `src` and one property per dimension, its values joined by a comma; an unknown dimension or value is dropped, never an error (QC40). Until a pack covers an area the tiles' shops serve the same table (`TILE_FACETS`); a failed pack read leaves nothing and says nothing (`readStores`).
- **Stops are never named before a tap or arrival** (QC17, QC24): a slot says its entry's word and a distance in words (`words.ts`); the destination holds positions only (`outingDest`); a name is resolved from the data at that moment and is never stored. Swap is the nearest other of the picked entries to the stop it replaces, not held, not offered for that slot before, no wrap (QC21).
- **Words** are held to the planner's banned-word grep, whole words, and no digit, ordinal or "of N" (QC25, QC28, QC33).

## The page, destination first (OJ1-OJ40, decisions 0203 and 0204; `specs/outing-journey/`; step 1 of three built)

- **The page is the map** (`components/outing/OutingPage.tsx`, `useJourney.ts`): a field over it opens Explore's `SearchSheet`; a pick, or "Nowhere in particular", is the place the one read is made around (`outingService.open(place, picked)`), and nothing is read before that tap (OJ35). The first page's search over chips and its Loop / One way switch are gone (QC3 retired): a journey is a loop when one can be made, else one way (`planJourneys`).
- **Chips are one list** (`chips.ts`): `wants.ts`'s shop rows (its tests pin those three) beside the attraction rows, whose match is over `kind`, the atlas's eight kinds. **Each chip on widens** (`matchesAny`, OJ14): never `mergeFacets` across chips, which narrows across dimensions and would ask for a shop that is also a monument. The planners take an `Accept` (facets or a rule).
- **Attractions are a second source** (`sources.ts`, `placeCandidates`): Explore's markable places of the kinds switched on, read with the same tiles as the shops (`app.ts`). It only reads: no shop becomes markable (QC31 holds), and a place not found yet is `unfound`, so its card says "Named when you reach it." (OJ25, OJ40).
- **Journeys are per leaning** (`leanings.ts`, `journeys.ts`): a fixed order that says nothing, two with the same stops are one; `journeys.ts` holds no word of a kind (the core's grep covers it).
- **A chip's aliases pass presence's guard**: `sculpture` and `historic` are presence's words and fail it; pick another word.
- Far places: `startChoice` mirrors `walkToChoice` (0121): "When I get there" beside Start past 2 km, alone past 10 km. Step 3 replaces this with a session that records the drive.

## One machine (decision 0205)

- **Every outing is a journey of chapters over areas** (`areas.ts`, `journeys.ts`): where you stand, the towns within the reach (`areasAround`) or toward a place (`areasToward`), each read once by `outingService.open` and planned by `planChapter` (three, else two, of the offered places, a loop else one way, else one place alone). `planJourneys` is not told whether there was a destination; never add a second planner for a new way of choosing areas. Around here is the list of one area.
- **Offered order** is by chip in turn, unfound first, then nearest (`ranked`); `POOL` is how far "Another like this" (`salts`) moves on. A mixed journey leads only when its stops span leanings.
- **Reads are bounded by `AREA_RULES.readMax`** (eight areas, new towns first), sequential, and stopped when the areas change; the gazetteer is loaded only when a reach beyond close by or a destination asks (`useJourney`'s `towns()`), never on opening the page (5.6 MB on the web).
- **The page's position is the one it first had** (`origin`): the reads are not made again at every fix.
- **Visited is read from the trace, never stored** (`visited.ts`, decision 0206): `walkedNear` gives the walked fixes of the newest thirty outings near an area (found through `listWalkAreas`, read with `readTrace` and their pauses and stills), and a candidate within Explore's range of one is `seen`, offered after the new ones. Do not add a visited table without a slice of its own: it would be a cache of the trace.
- Start takes the first chapter only; carrying a journey through the session is step 3.

## The plan a session carries (decision 0207)

- **`journeyPlan.ts`** (core): towns, points, stops' positions, loop; `isJourneyPlan` refuses a field more. `stepPlan` says which town is ahead and prunes the ones behind; **nothing stores reached, passed or done**. A done mark, a count of towns or an ordinal anywhere here is the trip planner's progress bar the vision forbids.
- **`planStore.ts` / `plans.ts`**: meta `outing_journey`, offered by Explore at Start, taken up by the session that starts within two minutes, cleared in `session.ts` at Stop. `navigation` forgets a destination it cannot route ("Too far to walk"), which is why the plan is not in `nav`.
- **`useJourneyBar.ts`** (the walk screen): between towns it gives the line and the point for Maps; within reach it offers the way (`walk()`), never begins it. The word "bar" is presence's in `src/lib`: the hook's field is `next`.
- Start with a far first town passes `dest: null`: the session records and the bar leads; "When I get there" keeps only the first chapter.

## From the second audit (Nov 18)

- **Nothing is routed for you.** `useJourneyBar` never calls `goTo` by itself: within reach it shows "<Town> is here." and "Show the way"; a route that starts on arrival is the nag 0121 ruled out, and it fought the page's own Start (audit 33).
- **The kept plan is only what is ahead** (`stepPlan`, `passBy`, `planStore.keep`): do not read the trace to learn where a session has been, and do not add a `passed`, `reached` or `away` field: a town that is behind leaves the plan, and nothing says why (audit 36-38, 46).
- **`stepPlan`'s order of rules matters**: a town within `leftM` is never behind, whatever else is true (two towns within reach of each other, audit 34); "past it toward the next" needs you to be moving away from it (audit 42); drifting lets even the last town go (audit 45).
- A plan offered for a Start that did not happen is withdrawn (`explore.tsx`), and `load` takes up nothing from the future (audit 44).
- The bar is on the surface's ground with ink, never the route's colour, and holds no ordinal ("next", "first"); its spacing is on the 4 px grid the floating UI is held to (`spacingGrid.test.ts`).
- The plan's key is read with `db.getMeta` directly, as `nav` is: FC8's scan reads those calls, and `metaStore.get` would leave the key "unused".
- While a session records, everything in the page's sheet stays left of the capture stack (`styles.beside`, the cards' width): a new pinned row must too (audit 32).

## From the audit (Nov 17)

- **State asked of one set of journeys is dropped with it**: `fresh()` in `useJourney` clears `salts`, `swaps` and Undo on a new destination, reach, chip or chains. A new piece of per-journey state goes there too, or it outlives its journey (audit 1).
- **`areasToward` spreads the towns it reads along the way** and keeps within 10 km of the line; `areasAround` takes the nearest and only then puts the new first. Never slice a new-first list: that turns "before" into "instead of" (audit 3, 4).
- **`legFor(session)`** is the one way to a read's street graph; `legOver` in the service builds it again each call (audit 5). `walked` is asked once per look and `forget()` starts a new one (audit 6).
- **A line never promises what the page does not keep**: nothing of a journey survives closing the page (OJ34), so no word says "wait", "later" or "kept" (audit 10).
- The page's pinned parts are the footer (cards, dots, the primary) and, opened, the bar with Back: content that must be seen at the first look goes there, not in the scroll (audit 14, 15).

## Traps

- Presence's guard (`presence-readers audit 1`) forbids spelling a poi tag outside presence; `antiques` and `books` are values of the pack's `what` dimension and are allowed under `outing/` only (`PLAIN_IN`).
- `fitOrder` is exported from `walkPlanner/planner.ts` for the outing's ordering; nothing else of the planner changes.
- Native, unverified: the page over Explore's map, the arrival chip on a followed route, the basemap's labels near a stop, the pack's tile read on a device.
