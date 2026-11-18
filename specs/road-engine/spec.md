<!-- The road engine (slug road-engine, prefix RE). Written in the repo first (2026-11-18) from the owner's session; not a tab of the
     concept doc yet, and the doc wins once it exists. It changes specs/outing-journey (D1, OJ9, OJ29) when it lands. -->

# The road engine: the app finds the road between towns and guides the drive (RE)

Nov 18, 2026 · @Miguel Guerrero

The owner, deciding the outing journey (Nov 17): "We should slice the app's own driving engine, because eventually this has to run on
native and background access will be expected." Asked on Nov 18 what it should do: **full driving directions**; road data from **the
map's tiles first, a pack later**; and the roads a journey prefers are **the roads through the towns**.

Today a journey's towns are joined by a straight line, a town's distance is a straight line said "away", and Open in Maps takes the
road (asked, as it happens, for walking directions). With the engine, planning a journey draws the road and says how far it is by
road, the towns offered are the ones on that road, and a session that carries a journey guides the drive to the town ahead: the turn
coming and how far to it, quietly.

## Vision

```
Idea: The app routes a drive itself: a road graph from the map's tiles, one way between a journey's towns that favours the roads
  through them, its road distance, and turn-by-turn directions while driving, on the device
Verb: earn (the way to where there is something to notice, and the towns the road really passes; the drive is part of the outing, 0206)
Touches: Never "Several ways ranked by minutes; 'fastest' as a label", "Nagging: off-route alarms, 'time for a walk', re-engagement
  pushes", "Fitness numbers: pace charts" (a speed is one), "Data leaving the device without a tap", "All-day tracking", "A capture
  behind a menu, a drawer or an extra tap"; Always "A route is a suggestion; drifting is never nagged", "Guidance is structural",
  "Restraint in motion, colour and copy"; Shapes "Several routes to one point, Apple Maps style: out (Open in Maps hands that job to
  the phone's maps app)" and "Suggested routes: one way ... no 'fastest' and no minutes compared; drifting never nagged";
  "Offline maps: not now" (0020); 0017 (routes are computed on the device behind RouteSource), 0029, 0058 and 0195 (Open in Maps),
  0095 (no minutes compared), 0121 (nothing starts on arrival), 0206, 0207, 0210
Verdict: aligned if reshaped
Shape: one way, never several and never set against another; no minutes, no arrival time, no speed, nothing called fastest; what is
  said is a turn and a distance, at most once as it nears, and nothing when you leave the way (it is found again quietly, as on foot);
  no "recalculating", no "make a U-turn", no prompt to change route; guidance ends without a word when the town is at hand; Open in
  Maps stays beside it, for driving; tiles are read only for a journey the person asked for; nothing about the drive is stored but
  the trace it already is
Precedent: Apple Maps (several routes with times, spoken turns that go on when locked, an Avoid section; partly verified); Organic
  Maps (turn-by-turn on OpenStreetMap on the device, no account; unverified); Google Maps (arrival time, "faster route" prompts;
  unverified, the counter-example)
Criteria: RE1-RE34 below, with RE11a and RE20a
Open: none after decision 0213 (turns spoken from the tap with a mute; the capture stack unchanged; distance only; about 150 km)
```

The gate pushed back once before the owner chose: turn-by-turn while driving is the job the vision hands to the phone's maps app,
and it brings a driver's safety and "never nag" into the app. The owner chose it (decision 0212); the Shape above is what keeps it
this product's.

## Decisions

The owner's, Nov 18 (decision 0212):

- **Full driving directions**, on the device.
- **Tiles first, a pack later**: the engine reads roads through an adapter; the first is the map's own tiles at low zoom.
- **Roads through the towns**: one way; a motorway only where nothing comparable exists.

Taken as defaults, each the owner's to overrule:

- **D1. One way.** No alternative is offered, drawn or compared.
- **D2. Distance, never time** (0095, the outing journey's D3): "31 km by road"; no arrival time, no minutes to a turn, no speed.
- **D3. Turns are spoken from the tap on "Drive there", with a mute on the bar** (the owner, Nov 18, decision 0213): each turn once
  as it nears, and nothing else ever. On a phone, guiding does not ship before speech works.
- **D4. Leaving the way says nothing**: the way is found again after the same wait as on foot; nothing is spoken or shown about it.
- **D5. The drive ends where the town is at hand**: the engine stops at the road nearest the town's point; from there the session
  says "<Town> is here." and offers the way on foot, as today.
- **D6. What the tiles cannot know is said once**, when a drive's directions begin: the map holds no turn restrictions.
- **D7. The main roads only**: motorways down to tertiary roads and their links. A town's small streets are not driven by the engine.
- **D8. Nothing new is stored**: the road graph lives in memory for the page and the session; a cache of it is a later call.

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, the job "Guide a drive" (Earn), added with this spec. Precedent informs how, never what.

- **Apple Maps** (iOS 27): directions from a search or a press on the map, then Go or Steps; the route card lists several driving
  routes, each with its time and distance; spoken directions go on with the phone locked or another app open; Options has an Avoid
  section. Source: https://support.apple.com/guide/iphone/get-driving-directions-ipha84a94043/ios , read Nov 18, 2026 through a
  fetcher that summarised the article's body (not verbatim). **Partly verified**. A counter-example in part: routes ranked by time.
- **Organic Maps**: turn-by-turn driving on OpenStreetMap, on the device, with no account; voice optional. Source: from memory,
  unverified. **Unverified**.
- **Google Maps**: arrival time, spoken turns, "faster route available" prompts, rerouting said aloud. Source: from memory,
  unverified. **Unverified**. A counter-example: the prompt to change route.

Where the engine follows them: a turn and its distance at the top of the screen, the road drawn under you, guidance that goes on
when the screen is not looked at. Where it departs, and why: one route with no time on it (Never, "ranked by minutes"); no rerouting
said or shown, no faster-route prompt (Never, "Nagging"); no speed or limit (fitness numbers, and a count the driver did not ask
for); roads through the towns before the motorway (the interesting way, and a journey made of towns); no saved places or recents
(local, and nothing stored).

## Criteria

The owner's tasks, and finding them:

- **RE1.** "See the road I'll take": planning a journey toward a place draws the road between its towns on the page's map, in place
  of the straight line. *Finding criterion:* someone shown the page says where the drive goes.
- **RE2.** "Know how far the drive really is": a town's distance, and a journey's, is said by road ("31 km by road") wherever the
  road is known, and "away" only where it is not; the line that says distances are straight lines goes with it.
- **RE3.** "Be guided there": in a session that carries a journey, the bar between towns offers "Drive there", and tapping it shows
  the turn coming and how far to it until the town is at hand. *Finding criterion:* someone shown the session's screen between towns
  says how to get directions without leaving the app.

The road graph:

- **RE4.** Roads reach the engine through an adapter (`RoadSource`), with an in-memory source for tests; no dataset is hard-coded.
  The first source is the map's own tiles at a low zoom.
- **RE5.** The roads read are motorways, trunk, primary, secondary and tertiary roads and their links, and nothing smaller (D7). A
  one-way road is driven only its own way. They are read at the lowest zoom whose tiles carry a road's direction (z12 in the tiles
  measured: below it no road says it is one-way).
- **RE6.** Roads cut at a tile's edge are one road again in the graph: a route never ends at a tile edge that the road crosses. In
  the tiles measured the two halves lie up to about 10 m apart, and joined at that the roads are one part but for a fiftieth of them.
- **RE7.** Reading is bounded and can be stopped: a corridor about the way, a set number of tiles, one read at a time; a journey too
  long for the bound says so in one plain line and keeps the straight line and Open in Maps.
- **RE8.** Roads are read only for a journey the person asked for (a destination picked on the page, "Drive there" in a session),
  never on opening the app, a tab or the page. A read carries nothing but the tile path.
- **RE9.** The engine's core holds no word of an outing, a town or a chip, and no clock, timer or module state; it is a second
  `RouteSource` beside the one on foot, which is not changed.

The way:

- **RE10.** One way is found, never several; nothing is labelled, ranked or compared, and the same roads and points always give the
  same way.
- **RE11a.** (the steward's S8) The page says once, in words and with no figure, that the way keeps to the roads through the towns.
- **RE11.** The way favours the roads through the towns: a motorway is taken only where the way without it is longer by more than a
  set share; the rule is a fixed cost by kind of road, never a speed or a time.
- **RE12.** The way passes through a journey's towns in their order and ends at the road nearest each town's point; where no road
  lies within reach of a town's point, the town is still a chapter and its stretch stays a straight line.
- **RE13.** A way's length is its length on the road, said in the units setting; no time, arrival or speed is said anywhere.
- **RE14.** The towns a journey may take are those near the road found, not near the straight line; with no road found, the straight
  line's are used as today.
- **RE15.** With no way found (no road read, towns not joined by the roads read), the page says one plain line, draws the straight
  line as today, and keeps Open in Maps.

On the page:

- **RE16.** The road is drawn as one line through the towns, with no markers for turns, no numbers and no arrows; the walk in the
  town at hand is drawn as today.
- **RE17.** A journey's card says its distance by road beside its distance on foot, each in words with its unit, last on the card;
  cards are never ordered by a distance and none is compared with another's (S9).
- **RE18.** While the road is read, the page says so once in words; the journeys are offered without waiting for it. A card on
  screen keeps its towns: a journey whose towns come from the road is added, never swapped in under the reader (S9).

Guiding a drive:

- **RE19.** "Drive there" is on the session's bar between towns, beside Open in Maps and Pass by; nothing guides until it is tapped,
  and "End" stops it. Open in Maps asks the phone's maps app for driving directions, never walking, for a town a drive away; one
  line on the page says the maps app chooses its own road, which may not be the one drawn (S10).
- **RE20a.** (S4) While guiding, the bar holds the turn, the town and End, and nothing else to tap: Open in Maps and Pass by return
  when guiding ends.
- **RE20.** While guiding, the bar says the turn coming and how far to it ("Left onto Route 6. 2.4 km."), in at most two lines at
  320 px, with the road's name or number where the map has one; under it, the town it is headed toward. Nothing else is shown: no
  time, no speed, no limit, no lane, no count of turns.
- **RE21.** A turn is read from the road: a change of road at a junction, a fork, a roundabout, joining or leaving a motorway.
  Staying on the same road around a bend is not a turn. A roundabout's exit is said by its road where the map names it, and
  otherwise by its place in order ("the third exit"): the one ordinal the engine may say (S5). A road's name or number is said only
  where the tiles carry one, which at this zoom is the larger roads.
- **RE22.** Leaving the way is never flagged: no sound, word, banner or colour, and nothing says "recalculating", "off route" or
  "turn around". But a turn that is no longer true does not stay up (S1): off the way, the bar shows the town and no turn until a
  new way is found, and then the turn coming. The wait before finding again is a driving rule of its own, by distance, not the one
  on foot; finding again reads only the tiles the graph lacks.
- **RE23.** A turn passed is not said again and nothing marks it done; no list of turns is shown while moving.
- **RE24.** When the town is at hand the guiding ends by itself and the bar says the town is here, as today; no sound, no "arrived",
  no summary of the drive. The way ends at the main road nearest the town's point: where that is further from the point than the
  town's reach, the bar says how far the town still is and not that it is here (S3).
- **RE25.** (D3, decision 0213) Tapping "Drive there" starts spoken turns; a mute is on the bar. A turn is spoken once as it nears
  and never otherwise: nothing is spoken about leaving the way, the distance left, the time or the destination. Where a turn cannot
  be spoken (the web without speech, a phone before step 4), "Drive there" says in words that turns are shown, not said.
- **RE26.** (D6, S3) What the engine cannot know is said truthfully and at rest: on the page where the road is drawn, and once before
  the first turn, never beside it: the map holds no turn restrictions and no closures. A statement, with no "check" or "caution".
- **RE27.** The capture stack stays on the session's screen while guiding, one tap each, never under the bar.
- **RE28.** Guiding rides with the open session: a reload or a return to the screen finds it again, Stop ends it, and nothing of it
  is kept after. Only the towns' points are kept, as the journey's plan is (OJ48); no way, turn or road name is stored.

What it costs, and what it never does:

- **RE29.** Finding a way never holds the screen: it runs in steps that yield (a worker on the web), can be stopped, and a way not
  found within a set time is a failure said once (RE15).
- **RE30.** (S6) Nothing is sent but tile reads to the map's own host, and Open in Maps on a tap. Those reads are new and say more
  than today's: a strip of tiles from here to there tells the host where a journey begins, ends and runs, before it is driven. They
  are made only on the person's tap (RE8), in no order along the way, and this is said in `net/policy.ts` beside the host.
- **RE31.** No drive is recorded that the person did not start: guiding needs an open session, and starts none.
- **RE32.** Words: no sentence of the engine holds a time, a speed, a count of turns, an ordinal, "fastest", "shorter", "quicker",
  "best", "recalculating" or an imperative beyond the turn itself; held by the banned-word grep, whole words.
- **RE33.** With the phone locked or the app behind another, guiding goes on where turns are spoken (native only); otherwise the bar
  is right when the screen is next seen. Guiding posts and updates no notification of its own, and its background work ends with
  End, the town at hand or Stop (S7). A criterion only a phone can check.
- **RE34.** The road pack: the adapter's contract is the pack's (a road with its kind, its direction and its points); the pack
  itself is not in this slice.

## Surfaces (from the code)

- The outing page's map (`components/outing/OutingPage.tsx`, `WalkMap` `alternates`): the road in place of the straight link (RE1, RE16).
- The page's field and cards (`journeyWords.ts` `awayLine`, `STRAIGHT_LINE`, `cardSummary`): by road (RE2, RE17).
- The session's bar (`src/app/walk.tsx`, `useJourneyBar.ts`): "Drive there", the turn, End (RE3, RE19-RE28).
- Open in Maps (`nav/handoff.ts`, every host): a travel mode by distance, driving for a town a drive away; the walk screen's and
  Explore's own Open in Maps for a place on foot are unchanged (RE19).
- Navigate's ready screen, Explore's cards, "When I get there", Walk me back, the walk planner, scenic routes: no change. A road
  route is never offered for a walk.
- Chronicle and the replay: no change; a driven stretch is drawn as a ride, as today.

## Not in this slice

The road pack (chronicles-data) and any routing without a connection (0020); several routes, avoid options or a setting for
motorways; traffic, closures, tolls, lanes, speed limits; turn restrictions (the tiles have none); a time or an arrival; driving a
town's small streets to a door; guidance for transit or cycling; telling a car from a bus in the trace; streets and fog from a
driven trace and the session's name (decision 0206's own slices).

## Record

**Step 0, the measurement, 2026-11-18**: in `plan.md`. z12 is the zoom; the tiles can carry a road graph.

**Step 1, the engine's core, built 2026-11-18** on `claude/determined-wright-yg1fq9` (the owner's answers, decision 0213): `src/lib/roads/`
(`types`, `rules`, `fromTiles`, `graph`, `way`, `corridor`, `words`). Nothing a person sees changes yet.

**Passed.** Unit tests for RE4-RE7, RE9-RE13, RE29, RE32, RE34 (`src/lib/__tests__/roads/roads.test.ts`), over hand-made roads and
nine real z12 tiles of Zurich; committed failing first (`a28f1e7`). `npm test` (3,009), typecheck, lint, `check:docs`.

**Measured on the real tiles** (a desktop, not a phone): 5,594 roads cut to their tiles, 12,377 junctions, 98.6% of the road length in
one part; the graph built in 76 ms; a way of 20.9 km found in 6 ms, against 13.8 km in a straight line, on primary, secondary and
tertiary roads with no motorway.

**Not tested, and why.** The tiles' own source (the adapter over the fetcher) is step 2; a corridor of sixty tiles and a way of
150 km have not been run (the pinned data is nine tiles); the live host's tiles cannot be read from a cloud session; RE5's "links"
are flagged but not yet treated differently from their road.

**Native.** Nothing here has run on a device.

**Step 2, the road on the page, built 2026-11-18**: `roads/tilesSource.ts` (the map's tiles as a source), `roads/service.ts` and
`index.ts` (read a corridor, build the graph, find one way in turns), `roads/thin.ts`; `outing/useJourney.ts` asks for the road of
each journey toward a picked place; `OutingPage` draws it in place of the straight line and says "by road"; `nav/handoff.ts` takes
a travel mode.

**Passed.** Unit tests for RE1, RE2, RE4, RE5, RE7, RE8, RE15-RE19, RE29 (`roads/page.test.ts`, `navigation/handoff.test.ts`,
`outing/journeyWords.test.ts`), committed as todos first (`7db879d`). The journey `journey` (30 checks) serves z12 tiles with one
main road and checks: no road read before a place is picked (RE8); the map's host only, 24 tiles (RE7, RE30); the line handed to
the map is the road (8 points where the towns joined straight are 3; RE1, RE16); "24 km by road" on the field and last on the card
(RE2, RE13, RE17); the one line of how the way is chosen in place of the straight-line caveat (RE11a, RE18); Open in Maps for the
town asks for driving (RE19). The journey `outing` (no main road in its tiles) keeps the caveat with "Couldn't find the road."
(RE15).

**Deferred.** RE14, and RE18's second sentence (a journey whose towns come from the road): the towns are still those near the
straight line. The graph is built on the page in turns, not in a worker. Both are in `docs/DEFERRED.md`.

**Not tested, and why.** What is painted on the map (the e2e counts the points handed to it; the fake map shows no tiles); a
corridor of sixty tiles; the live host; any phone.

**Step 3, guiding, built 2026-11-18**: `roads/turns.ts` (turns from the road's geometry), `roads/drive.ts` (one fix: the turn
ahead, off the way, find again), `roads/useDrive.ts`; the plan's one flag `driving`; "Drive there" and "End" on the session's bar
(`outing/useJourneyBar.ts`, `src/app/walk.tsx`); the page's line beside the road (RE19's S10, RE26). Offered on the web only:
decision 0213 keeps guiding off a phone until turns are spoken (step 4).

**Passed.** Unit tests for RE20-RE23, RE25, RE26, RE28, RE32 (`roads/guide.test.ts`, `outing/journeyPlan.test.ts`), committed as
todos first (`fd6c885`). The journey `journey` drives the mocked GPS along its road: "Drive there" beside Open in Maps
and Pass by, nothing guiding before the tap (RE3, RE19); the one-time statement at the tap (RE25, RE26); End and nothing else to
tap (RE20a); the capture stack clear of the bar (RE27); "Right. 310 m." over "Toward North Scituate." (RE20, RE21), whole at
320 px; past the junction "On this road. 8.8 km." (RE23); off the way no turn and no word (RE22); found again after a reload, with
only the towns' points and the flag kept (RE28); End returns the other controls (RE19).

**Deferred** (in `docs/DEFERRED.md`): road names and numbers in a turn; roundabouts; finding again reads a whole corridor; the
road is not drawn on the session's map; the 20 s before a drive's fixes move the screen's position; RE24's "how far the town
still is" where the road ends short is the ordinary line between towns, with no check of its own.

**Not tested, and why.** RE22's finding again after 400 m off the way (the unit test holds the rule; the journey only leaves and
returns); RE24's end at the town (the plan's own rule, tested as OJ49, drops the flag; no journey drives nine kilometres); RE31
(guiding needs an open session: the bar exists only in one, by construction); real roads, real junctions, any phone.

**Step 4, spoken turns, built 2026-11-18** (decision 0214, the owner's "Proceed"): `expo-speech` behind `roads/speech.ts`;
`speakStep` (once per turn, within 400 m); the mute in words on the bar, kept as the plan's `muted`; "Drive there" on every
platform.

**Passed.** Unit tests for RE25 (`roads/guide.test.ts`, `outing/journeyPlan.test.ts`), todos first (`912ada9`). The journey
`journey`, with the browser's speech recorded: nothing spoken at the tap; "Right ahead." once as the turn nears; nothing more past
it or off the way; "Mute turns" becomes "Say turns" and is kept with the session.

**Not met.** RE33: nothing is spoken with the phone locked or the app behind another (the position is read only in front). RE25's
"a phone before step 4" clause is moot. Both in `docs/DEFERRED.md`.

**Native.** Guiding and speech are now offered on phones and have never run on one.
