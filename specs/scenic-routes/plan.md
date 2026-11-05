# Scenic routes: the plan

For the owner's review before any code. Spec: `specs/scenic-routes/spec.md` (SR1-SR15).

## How it works, in one paragraph

On Go here, the walk screen first finds the direct route as it does today. If at least one leaning is on and the destination is within 5 km, it reads the area between the two ends, in code and with no camera moves, the way "What's good here?" does. The read covers the z14 tiles of an ellipse that holds every route up to 30% longer, plus Overture's places for the same tiles. From that read it builds three signals: green areas (landcover polygons), places worth seeing (the kinds on in "What I'm into"), and busy streets (graded by `gradeStreets` against the corridor). The street graph is searched again once per leaning. Each edge's cost is its length, discounted where the edge is green, near a sight or busy. Several discount strengths are tried, and the one that gains the most without passing 30% wins. Near-duplicates merge, and the preview card shows what is left. Tapping a row starts the existing navigator on that route. Its sources keep the leaning, so a re-route stays scenic.

## Files

| Where | What | Layer |
|---|---|---|
| `src/lib/nav/scenic.ts` (new) | The leanings, edge appeal per leaning, `scenicRoutes(direct, graph, signals, leanings)`: the 30% budget, the gain threshold, the merge, the rows' words (SR3-SR7, SR10) | core |
| `src/lib/nav/scenicSignals.ts` (new) | Green polygons, sights and graded lines from a corridor read, indexed with `EdgeGrid`; the corridor ellipse and its tiles | core |
| `src/lib/nav/graph.ts` | `shortest(from, to, cost?)`: an optional per-edge cost; the default stays length | core |
| `src/lib/nav/streetRoute.ts` | Exposes its graph and join, so a scenic source routes over the same streets; `scenicRouteSource(leaning, …)` implements `RouteSource` (0022's seam) | core |
| `src/lib/discovery/tileDecode.ts`, `components/map/types.ts` | `CollectedFeatures.green?` from `landcover` (grass/park, grass/garden, wood/*). Optional, so the map's own `collect` is unchanged | core / adapter |
| `src/lib/nav/scenicRead/shell.ts`, `index.ts` (new) | `createScenicRead(ports)`: fetch the corridor's tiles and Overture, cancellable, with a timeout; failure gives `null` (SR9, SR13) | shell + `@instance` |
| `src/lib/routeLeanings/shell.ts`, `index.ts` (new) | The three switches in meta `route_leanings`, like `unitsStore` (SR1) | shell + `@instance` |
| `src/lib/nav/store.ts` | Meta `nav` keeps `leaning?` with the destination (SR11) | shell |
| `src/lib/nav/useNavigation.ts` | `goTo` → a `preview` state (options) when scenic applies, `choose(option)` and `dismiss()`; re-routes use the chosen leaning's source; `start` destinations skip all of it (SR12) | view |
| `src/components/RoutePreview.tsx` (new) | The card: rows with time, distance, "N min longer", the line of what it passes, Go, Cancel; a11y labels and the announcement (SR3, SR8, SR14) | view |
| `src/components/map/*` (WalkMap web + native) | `alternates`: faint lines for the other offered routes; a tap on one highlights it (SR2, SR8) | view |
| `src/app/walk.tsx` | Wires the preview between Go here and the blue bar; the ready destination's preview as the walk starts | view |
| The walk settings drawer (where "What I'm into" lives) | The "Scenic routes" switches (SR1) | view |

## Data

- **No migration.** No SQLite `MIGRATIONS` entry and no IndexedDB `VERSION` bump. There are two meta values: `route_leanings` (new) and `leaning` inside the existing `nav` JSON (an optional field, read safely when it is missing).
- **Truth vs cache:** nothing new is stored as truth. The corridor read is used once per route, held in memory by the route sources while navigating, and then dropped. The streets and places it reads go into today's caches, tagged with the tile build, as `readAround` already does.
- **No derivation rule changes**, so `SNAP_RULES`, `STREET_CODE` and `LANDING_CODE` stay as they are.

## Tests, per criterion

Unit tests live in `src/lib/__tests__/navigation/` (the navigation feature). The street graphs in them are made up, with a park polygon, sights and busy lines placed around them.

| Id | Test | Kind |
|---|---|---|
| SR1 | `routeLeanings.test.ts`: `SR1: all three on by default, a change is kept, all off means no scenic` | shell over `fakePorts()` |
| SR2 | `scenic.test.ts`: `SR2: one option per leaning on, Direct first; none past 5 km`; e2e `scenic` | core, e2e |
| SR3 | `scenic.test.ts`: `SR3: a row's name, time at pace, "N min longer", no digits for a score` | core |
| SR4 | `scenic.test.ts`: `SR4: park and street names, found places by name, unfound never named` | core |
| SR5 | `scenic.test.ts`: `SR5: no scenic route is over 30% longer`; a property check over random grids | core |
| SR6 | `scenic.test.ts`: `SR6: green runs longer in the park`, `SR6: sights passes more of the kinds on`, `SR6: busy runs more graded length`, `SR6: under 100 m of gain is not offered` | core |
| SR7 | `scenic.test.ts`: `SR7: 80% shared merges, 90% like direct is dropped` | core |
| SR8 | e2e `scenic`: tap a row highlights it, Go starts the blue bar, Cancel sets no destination | e2e |
| SR9 | `scenicRead.test.ts`: `SR9: a failed read gives null`; e2e: the notice, then the direct route at once | shell, e2e |
| SR10 | `scenic.test.ts`: `SR10: a re-route from off the line keeps the leaning, within 30% of what is left` | core |
| SR11 | `navStore.test.ts`: `SR11: the leaning is kept with the destination; an old value without one reads as direct` | shell |
| SR12 | `scenic.test.ts`: `SR12: a start destination gets no options`; e2e: Walk me back shows no preview | core, e2e |
| SR13 | `scenicRead.test.ts`: `SR13: only the tile host and Overture are asked; Cancel stops the read`; the e2e's host check already fails on any other host | shell, e2e |
| SR14 | e2e `scenic`: each row's `aria-label` says the whole row | e2e |
| SR15 | `scenicGreen.test.ts`: `SR15: landcover parks, gardens and woods become green areas` with `mvtFixture`. I also check it once against the Zurich `test_data.zip` tile in the session and note the result in the record; the file is too big to commit | core |

- **New journey `scenic`** (`scripts/e2e/journeys/scenic.js`). The fake Fox Point grid gets a park polygon in its `landcover` layer, one side of a block away from the straight line. The journey starts a walk, long-presses beyond the park, takes Go here, checks the preview (Direct plus Through green), taps through to the blue bar, and covers Cancel, all leanings off, and Walk me back.
- **`scripts/features.js`:** navigation gets `journeys: ['scenic']` and `specs: [..., 'scenic-routes']`.
- **Journeys touched beyond `scenic`:** every journey that does Go here or sets a destination with the defaults on (`walk`, `ready`, `memories`, `marks`, `qol`) will now meet the preview. I'll give the e2e harness a helper that taps Direct's Go, and run each journey `check:affected` names.

## Deferred, and why

- **Via-stop detours and loops:** your call; one kind of route this slice.
- **Explore's Walk here and "Walk to its busiest street":** your call (Ready + Go here). They keep starting a walk straight away.
- **Choosing before Start:** the ready screen has no walk, and the navigator routes inside one. Showing the preview as Start records keeps one path through `useNavigation`. See the question below.
- **Over 5 km:** the corridor read grows with the square of the distance (about 20 tiles plus Overture at 5 km). I picked 5 km so the read stays at a few seconds; tunable.
- **Water as green, park area in the atlas:** out of scope; the atlas keeps counting park places.

## Native paths that will not run on a device

The preview card and the faint alternates on native MapLibre, the switches in the native drawer, and the corridor read on a phone (it is shared JS through `fetch`, but untried there). These go into `docs/NATIVE_UNVERIFIED.md`.

## Then

The spec's record, STATUS and PRODUCT, decision 0094 (scenic routes: the owner's calls of Nov 4), the navigation rule file, `/docs-gc`, commit on `claude/scenic-routes`, then `/deploy`.
