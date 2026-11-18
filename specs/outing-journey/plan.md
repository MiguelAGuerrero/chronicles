# Plan an outing, destination first: plan (OJ1-OJ40)

Written 2026-11-17 for the owner's review before any code. Nothing is built. The screens are drafted in `mock.html`
(https://claude.ai/artifact/DZH98CQkpUuVmy2WnrinKj).

## The idea in one paragraph

The page that shipped plans one circuit of shops within 2.6 km of where you stand. Its core is already generic (`Candidate`, `Want`,
`planOuting`, `swapCandidate`), so a town's chapter is that same planner run around a town's centre instead of around you. What is new
sits around it: a destination (Explore's gazetteer search, already on the device), the towns between (the gazetteer again, by distance
from the straight line, no network), a second source of candidates (the places the tiles and the archive already give Explore), chips
that widen, up to three journeys composed per leaning, a line per town from the atlas's own words, and a session that carries a journey
town by town with Open in Maps between. No road routing, no new store, no new dependency.

## Build order (three steps under this one spec)

| Step | What you can do after it | Criteria |
|---|---|---|
| 1. The page | Open a full-map page, search a destination, pick unified chips, swipe journeys for the destination's own town (and "Nowhere in particular"), open one, Swap, Start as today | OJ1-OJ4, OJ6-OJ19, OJ21, OJ22, OJ25, OJ27 (hours), OJ34-OJ36, OJ38 |
| 2. The towns between | Journeys hold several towns; each has its line and its chapter (a walk, or one stop); Leave this town out | OJ5, OJ20, OJ23, OJ24, OJ26, OJ27 (straight lines), OJ37 |
| 3. The session carries it | Start records from where you are; the bar names the next town, Open in Maps, Skip; the way on foot within reach | OJ28-OJ33 |

Each step ends shippable. Step 3 is the one that depends on decision 0209's reading of a recorded drive; steps 1 and 2 do not.

## Files

New, `src/lib/outing/` (each starts with `// @layer`):

| File | Layer | Holds |
|---|---|---|
| `sources.ts` | core | `placeCandidates(places, hidden)`: Explore's `Place` records as `Candidate`s with a facet `kind` (the atlas's eight kinds and their subtypes), markable only; `allCandidates(stores, tileShops, places, opts)` joins them with `outingCandidates` (OJ11, OJ36, OJ38) |
| `chips.ts` | core | the vocabulary as one table: today's shop rows plus attraction rows (Green, Old places, Views, Art, Storefronts...), each a `Want`; `matchesAny(wants, c)`: a candidate matches when any picked chip's own match does (D5, OJ14); `defaultChips(hidden)` from "What I'm into" (OJ12); alphabetical (OJ15) |
| `leanings.ts` | core | three leanings, each a fixed set of chip ids; `leaningsFor(picked)` in a fixed order (OJ17, OJ18) |
| `corridor.ts` | core | `townsBetween(index, from, to, rules)`: gazetteer towns within a width of the straight line, in order along it, capped; pure geometry (OJ20) |
| `chapter.ts` | core | `planChapter(cands, wants, centre, ceilingM, leg)`: `planOuting` around a town's centre; with one reachable stop, a single-stop chapter (D2, OJ24) |
| `journey.ts` | core | `composeJourneys(towns, chaptersByTown, picked)`: one journey per leaning from the towns whose chapter holds that leaning's stops; equal journeys merged; deterministic (OJ17, OJ19, OJ22); `leaveOut` (OJ26) |
| `townLine.ts` | core | a town's line from an `AtlasProfile`-shaped read: `characterLine(steps)`, storefront street names, green; never a count (OJ23) |
| `journeyWords.ts` | core | card summary, chapter lines, the two notices, the reasons; held to the banned-word grep (OJ9, OJ21, OJ27) |
| `journeyDest.ts` | core | `journeyDest(journey)`: a `Waypoint` whose new `chapters` field is a list of `{ town, at, via }`, positions and town names only, no path (OJ34); `nextChapter(dest, trace)`: the chapter ahead, read from where you have been, nothing kept (OJ29-OJ31) |
| `journeyService.ts` | shell | `createJourneyService(deps)`: reads each town once (the existing `read` at `READ_M` around its centre, the stores pack, the archive), bounded and cancellable; keeps nothing (OJ35, OJ37) |
| `useJourney.ts` | view | the hook the page calls; replaces `useOuting` for the page |

New components, `src/components/outing/`: `OutingPage.tsx` (the map with the search field and the sheet; replaces `OutingDrawer`),
`ChipRow.tsx`, `JourneyCards.tsx` (the sideways row, built as Explore's carousel is), `JourneyDetail.tsx` (towns and stops),
`NextTownBar.tsx` (step 3).

Touched:

- `src/lib/outing/candidates.ts`: nothing removed; `mergeFacets` stays for a single chip's own combination. `plan.ts`, `pick.ts` and
  `swap.ts` take a predicate where they took merged facets (D5).
- `src/lib/nav/types.ts`: `Waypoint` gains optional `chapters` (step 3). It is saved inside meta `nav` as JSON, so no migration.
- `src/components/atlas/PlaceSearch.tsx`: `SearchSheet` is reused as it is; `onPick` sets the destination.
- `src/app/(tabs)/explore.tsx`: hosts `OutingPage` where it hosts `OutingDrawer`.
- `src/app/walk.tsx` and `nav/useNavigation.ts` (step 3): the next-town bar; a foot route only within the ceiling of the chapter.
- `scripts/features.js`: the `outing` row gains this spec; the journey `outing` is rewritten and a journey `journey` added.
- `.claude/rules/outing.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`.

## Data

- **Truth:** none new. A started session is the Walk it is today.
- **Cache:** none new. Outline, tile and archive reads go through the caches that exist.
- **Stored:** `outing_chains` only (OJ34). `Waypoint.chapters` rides in meta `nav` with the open session and is cleared with it.
- No SQLite migration, no IndexedDB version bump.

## Tests per criterion

Unit tests in `src/lib/__tests__/outing/`, named by id; shell tests over `fakePorts()` and in-memory sources; two journeys.

| Criteria | Test |
|---|---|
| OJ11, OJ36, OJ38 | `sources.test.ts`: a fixture of stores and places plans one journey; a store never yields a markable place; the core files hold no kind's word (the existing grep, extended) |
| OJ12-OJ15 | `chips.test.ts`: defaults from hidden kinds, the banned-word grep, widening, no sentence about a chip unserved, the order |
| OJ17-OJ19, OJ22 | `journey.test.ts`: at most three, fixed order, merged when equal, deterministic, the reason line |
| OJ20 | `corridor.test.ts`: towns in order along the line, the width, the cap, a near destination gives one chapter |
| OJ23 | `townLine.test.ts`: words only, no digit, no unfound name |
| OJ24, OJ26 | `chapter.test.ts`, `journey.test.ts`: a walk or one stop, within the ceiling; leave out replans, never the destination |
| OJ9, OJ21, OJ25, OJ27 | `journeyWords.test.ts`: "away", no time, no digit for stops, the two notices once |
| OJ29-OJ31, OJ34 | `journeyDest.test.ts`: positions and town names only; next chapter, skip, nothing marked done |
| OJ6, OJ35, OJ37 | `journeyService.test.ts`: no read before a destination and a chip; a failed town is left out; the bounds hold; the query reaches no port |
| OJ1-OJ5, OJ7, OJ8, OJ10, OJ16, OJ18 | journey `outing` (rewritten): the page, the search, the chips, the cards, the detail |
| OJ28, OJ30, OJ32, OJ33, OJ39, OJ40 | journey `journey` (new): Start records, the bar, the way on foot in reach, the chip, the stack uncovered at 320 px on the session and on the page |
| OJ1-OJ3's finding criteria | the `ux-reviewer`'s cold find, not a unit test |

## Cost

- **Towns between:** the gazetteer index (about 50,000 rows, already built once per source, about 0.7 s) scanned once per destination:
  a point-to-segment distance per row. Once per pick, off the frame.
- **Per town read:** the existing outing read, 2.6 km around a centre: about 16 to 25 z14 tiles, one z12 stores tile, one archive tile.
  Bounded per town, not by a count of towns (0210): each town read is about 25 tiles, read in order of the line, cancellable, each town filling its line as it lands. Towns shared by two
  journeys are read once. Nothing is read per frame or per fix.
- **Step 3:** `nextChapter` per fix is constant time (a handful of chapters).
- **Harness:** `scripts/perf-explore.js` for the page's reads on the web; a long driven recording is device only
  (`docs/NATIVE_UNVERIFIED.md`). The walk screen's render budget at driving fix density is not measured today.

## The screen, action by action

| Action | Goal, how often, where | Control | Adjacent apps | Where the owner looks first |
|---|---|---|---|---|
| Say where to | once per outing, standing or sitting | a search field over the map, "Where to?" | Apple Maps: a search field, then directions (verified); Google Maps the same (unverified) | top of the page |
| Stay around here | sometimes | a chip in the sheet, "Nowhere in particular" | none of them offers it | under the field, with the near towns |
| Say what you like | once, adjusted a little | toggle chips in the sheet | Google Maps' category chips along a route | the sheet, under its own line of words |
| See another suggestion | a few times | swipe the card row; the next card's edge shows; dots under it | no verified precedent (how Apple Maps lists routes is not on the page read) | the cards |
| Open a journey | once or twice | the primary button, "See this journey" | Roadtrippers opens an itinerary | under the cards |
| Change a stop or a town | rarely | "Swap" on a stop, "Leave this town out" on a town, as text buttons | Google Maps: remove a stop | on the item itself |
| Start | once | the one primary button, pinned | all: Go or Start | bottom of the detail |
| Drive to the next town | each town | "Open in Maps" on the session's bar | hand-off is ours (0195) | the bar at the top |
| Pass a town by | rarely | "Pass this town by" beside it; a town driven past is let go without it | Google Maps: remove stop | the same bar |

Defaults taken that make something quieter, the owner's to overrule: the dots under the cards are small and wordless (the next card's
edge is the main cue); "Include chains" moves behind the sheet's pull-up; stops stay unnumbered and unmarked when reached.

## Against precedent

- The app proposes the towns and the stops; every adjacent app takes them from you. Reason: the owner's "choose your own adventure";
  an itinerary you assemble is the list the vision's audience line rules out.
- No minutes anywhere, where Google Maps ranks stops by minutes added. Reason: Never, "Several ways ranked by minutes".
- No road route or road distance. Reason: none of principle; the app has no road routing (D1). A question for the owner, below.
- Stops unnamed until a tap or arrival. Reason: 0194, and "be surprised by what I find".

## Deferred, and why

A road graph of the app's own (D1); opening hours (no data); places in the search, not only towns (the gazetteer holds towns); a kept
or shared journey (OJ34); streets and fog from a driven trace, driven gap inference, the session's name in the app (their own slices,
0209). Each goes to `docs/DEFERRED.md` when the slice is tracked.

## Native, never run on a device

The page over Explore's map; the card row's swipe; a session started far from its first stop; the bar's Open in Maps mid-recording; a
recording that spans a drive of an hour. Each becomes a `Do / Expect` item.

## The owner's answers (Nov 17, decision 0210)

- No cap on a journey's towns: they are chosen for the variety of kinds they add; how many is a setting (step 2; OJ20, OJ37).
- A road engine of the app's own is its own slice, owed after the page: gate, spec and plan first.
- The rest by default: lone stops allowed; distance only; the distance stays on the card; shops stay out of Explore; chips widen; the
  stack unchanged at driving speed; the search may set this page's destination; **step 1 is built first** for the owner to look at.

## The steward's findings (Nov 17), triaged

Three breaches and seven drifts; the gate's verdict stands. The owner reviews these with the plan.

| # | Finding | Triage |
|---|---|---|
| S1 | The bar keeps naming a town you drove past, and "Skip" makes the plan an obligation | **Accepted**: OJ29, OJ31 rewritten (a town behind is let go silently; the bar can be put away, is silent inside a chapter and at the destination) |
| S2 | OJ34 said no town list is stored while the plan stored one, with a skipped set and a path | **Accepted**: OJ34 rewritten (positions and town names only, while the session is open; nothing says reached or passed; no path) |
| S3 | The rebuilt page lost the capture stack criterion (QC30) | **Accepted**: OJ39 |
| S4 | Default chips made "after a chip is picked" guard nothing; one tap read about a hundred tiles | **Accepted, reshaped**: OJ35 (the person's own tap on a destination starts reads, only for the journey in view, said once in words). Stricter (a second, explicit tap) is the owner's call |
| S5 | Stops and town lines described places ("an old mill, by the creek") | **Accepted**: OJ21, OJ23, OJ25; the draft's wording corrected |
| S6 | "Few shops", "two main streets": quantity words and a verdict on a town | **Accepted**: OJ21, OJ23 |
| S7 | A distance on each card is a length to compare; the first card is a fixed favourite | **To the owner**: they asked for "overall travel commitment" on the preview, so the figure stays on the card until they say. The order stays fixed (OJ17): an order that follows the last chip tapped moves cards under the thumb |
| S8 | Open in Maps handed a stop's position, so Maps would name it | **Accepted**: OJ29 hands the town's point. For a lone stop by the road the town's point is not where the shop is: the owner's call with D2 |
| S9 | A shop and an attraction look alike but part ways on arrival; OJ12 reversed a QC line unsaid | **Accepted**: OJ40; OJ12 names the line |
| S10 | Precedent thinner than claimed | **Accepted**: the two apps added to `docs/research/adjacent-apps.md` as unverified; the spec and the action table say what is unverified |

The steward's silences, each a question for the owner rather than a default: whether the replay says a town was passed without stopping
(the lows stay in) or lets it go; a moment captured mid-drive and its context line; an outing left open overnight against "All-day
tracking"; whether a single drive-up stop is still Earn.
