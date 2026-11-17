<!-- Plan an outing, destination first (slug outing-journey, prefix OJ). Written in the repo first (2026-11-17) from the owner's session.
     Not a tab of the concept doc yet; the doc wins once it exists. It amends specs/quick-circuit (QC), which stays the record of what shipped. -->

# Plan an outing, destination first: name where you're headed, say what you like, pick a journey (OJ)

Nov 17, 2026 · @Miguel Guerrero

The owner, on the page that shipped (QC): "a little bit underwhelming ... I almost expected something like a Maps UI, where I can input
the location I want to, and then have settings for how that journey should look like, or what I would want on the way ... get an intuition
for all the towns, cities, or other divisions I would pass through ... not exactly a trip planner ... a choose your own adventure sort of
feel. I would swipe through suggestions, pick the one that feels right ... a preview of how that journey would look like on the map. And
overall travel commitment, and a brief summary of the route itself." On the chips: "thrifting, bookstores, etc. seems very odd and
specific"; "chips that define the characters and qualities of what I would want, not necessarily exhaustive ... the app tries its best to
route a comfortable amount of points of interest ... a summary of what's included in each journey, as well as what each town offers."
On shops: "I wanted to go thrifting across different towns and be surprised by what I find ... unify these two ideas of points of
interest and storefronts."

The page becomes the map. You name a destination (or none), pick chips that say the character of what you'd like on the way, and swipe
up to three journeys, each leaning a different way. A journey is the towns between here and there, in order, each with a line on what to
expect and a chapter: a walk among a few stops, or one stop by the road. Start begins an outing that records the whole way (decision
0197); between towns the phone's maps app does the driving.

A draft of the screens: `mock.html` beside this file (https://claude.ai/artifact/DZH98CQkpUuVmy2WnrinKj).

## Vision

```
Idea: Name a destination, say with chips what you want on the way (attractions and kinds of shop together), swipe through a few suggested
  journeys across the towns between, each previewed on the map with its commitment and a summary of the route and of each town, pick one,
  and let the app record it
Verb: earn (it helps the person out notice what lies between here and there, town by town, and what each town is made of); the outing
  it starts feeds honour
Touches: Never "Several ways ranked by minutes; 'fastest' as a label", "Ratings, reviews, stars, 'best of', rankings of places",
  "Popularity, trending, foot traffic", "Tallies such as '12 of 87'", "Nagging", "All-day tracking", "Data leaving the device without a
  tap", "A capture behind a menu, a drawer or an extra tap"; Always "A route is a suggestion; drifting is never nagged", "Guidance is
  structural", "Counts are words"; Who it is for "not tourists working through a list"; Shapes "Several routes to one point, Apple Maps
  style: out" (answered by 0095: a row per leaning, no minutes compared); 0194 (shops are presence, never points of interest; stops said
  by kind); 0121 (nothing watches for arrival before Start); 0127 (by kind, never named); 0195 (Open in Maps); 0197 (the session is an
  outing; a drive is part of it)
Verdict: aligned if reshaped
Shape: up to three journeys that differ by leaning, in a fixed order, never by time, length or rank; the app proposes the towns and the
  stops on foot and never the road (Open in Maps); stops by kind, named on a tap or on arrival; a town's line says what it is made of,
  never whether it is good or how many it holds; nothing marks a town or a stop done; chips say what a place is, never a quality; nothing
  is read about your position before you open the page and nothing is recorded before Start
Precedent: Apple Maps (a destination, then routes and avoid options; verified); Google Maps (stops added along a route; unverified);
  Roadtrippers (places along a drive by category; unverified); Komoot (a planned tour between points you pick; unverified)
Criteria: OJ1-OJ40 below
Open: the road's distance (the app has no road routing: a straight-line distance, said as such, or a road graph of its own); capture
  while moving at driving speed; whether a time is ever said beside a distance
```

## Decisions

The owner's, Nov 17:

- **Destination first, Maps-like**: you say where you are headed; the settings are about the journey, not a category of shop.
- **A journey across towns** (over a longer walk on foot): a drive toward a far place with stops to get out along the way.
- **Suggestions differ by character** (over alternative sets of stops, and over one proposal): a few whole journeys, each with its own
  leaning, never ranked or timed (0095 is the precedent). This replaces QC6 ("exactly one circuit") for a journey.
- **Capture and tracing as today**: Start begins a recorded session and the capture stack is one tap away; no prompt at a stop and no
  automatic moment.
- **Chips define character, not an exhaustive form**: the app fits a comfortable number of stops that match, and reports what each
  journey includes and what each town offers.
- **Points of interest and shops are one pool for an outing** ("unify these two ideas"): thrifting across towns is the motivating case.
- **The session is an outing; a drive inside it is recorded** (decision 0197).

Taken as defaults on the owner's "for the rest, proceed with reasonable defaults" (Nov 17, decision 0198), each theirs to overrule:

- **D1. The phone's maps app does the driving, for now.** The owner called for a road engine of the app's own as its own slice (0198);
  until it lands a town's distance is a straight line, said as "away".
- **D2. A town may be a single stop by the road** as well as a walk, because thrift shops often stand alone.
- **D3. Distance in words, never a time** (WP19, 0102, 0095 hold).
- **D4. Shops and attractions merge inside the outing only**; 0194 holds everywhere else (no shop becomes a mark or a find).
- **D5. Picking chips widens**: every chip adds to what a stop may be. This replaces QC38's "across dimensions narrows" between chips; a
  chip may still be a combination inside itself.
- **D6. The capture stack stays as it is while driving** until the owner decides otherwise (0197, open).

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, the job "Suggest a way on foot" (Earn), where the Google Maps and Roadtrippers lines were added
with this spec. Only the Apple Maps line is verified, and it does not show how several routes are listed: the swiped journeys, the town
line and the next-town bar rest on unverified precedent or none (the steward's S10). Precedent informs how, never what.

- **Apple Maps** (iOS 27): "Touch and hold anywhere on the map or enter an address in the search field, then tap the directions button",
  then "Tap Go or Steps for the route you want to take"; Options avoids "hills, stairs, or busy roads". The map is the page and the
  choices sit in a card over it. Source: https://support.apple.com/guide/iphone/get-walking-directions-iph8eae299d1/ios , read Nov 17,
  2026. **Verified**.
- **Google Maps**: a destination, then "Add stop" and a search along the route by category (petrol, food, coffee), results as pins on
  the route with the minutes each adds. Source: from memory, unverified. **Unverified**. A counter-example in part: minutes added rank
  the stops.
- **Roadtrippers**: a start and an end, then categories of place to show within a distance of the route; you add the ones you want to an
  itinerary. Source: from memory, unverified. **Unverified**. A counter-example in part: an itinerary is a list to work through.
- **Komoot**: a planned tour between points you pick, with surface, way types and a difficulty. Source: from memory, unverified.
  **Unverified**.

Where this page follows them: a search field over a full map, the choices in a sheet, the route previewed before committing. Where it
departs, and why: the app proposes the towns and the stops instead of taking them from you (choose your own adventure, not an itinerary);
journeys are told apart by leaning, never by minutes (Never, "Several ways ranked by minutes"); stops are said by kind until you tap or
arrive (0194); it does not route the road (D1).

## Criteria

The owner's tasks, and finding them:

- **OJ1.** "Tell it where I want to go": Plan an outing opens on a full-screen map with one search field over it, worded "Where to?".
  Typing a town's or a city's name lists matches, nearest first; picking one sets the destination and shows it on the map with how far
  away it is. A press and hold on the map sets a destination that the search does not know.
  *Finding criterion:* someone shown only the open page says where they would type a destination.
- **OJ2.** "Have settings for what I would want on the way": with a destination set, a sheet over the map shows the chips under a line
  worded "What you'd like on the way". *Finding criterion:* someone shown the page with a destination set says how they would ask for
  thrift shops.
- **OJ3.** "Swipe through suggestions, pick the one that feels right": with at least one chip on, the sheet shows the journeys as cards
  in one row that scrolls sideways, one in view at a time with the edge of the next showing; the map draws the journey in view.
  *Finding criterion:* someone shown the page says how they would see another suggestion.
- **OJ4.** "A preview on the map, the overall travel commitment and a brief summary": each card says the towns in order, what the journey
  includes by kind, and how much of it is on foot; the map shows its towns, the line between them and each town's stops.
- **OJ5.** "Get an intuition for the towns I would pass through": opening a journey shows each town in order with a line on what to
  expect there.

The destination:

- **OJ6.** The search is Explore's own, over the gazetteer on the device (towns and cities; GZ9): a query is never stored, logged or
  sent. A query with no match says one plain line and suggests nothing. This amends GZ16 ("never a Navigate destination") for this page
  only: the pick is a destination to plan toward, and is still not kept as a recent.
- **OJ7.** With no destination the page offers "Nowhere in particular", which plans around where you stand as the page that shipped does
  (a loop or one way within the ceiling, QC3, QC10).
- **OJ8.** Before a destination is set the sheet offers the towns near you by name, nearest first, as shortcuts; nothing orders them but
  distance.
- **OJ9.** A destination's distance is a straight line and is worded "away" ("27 km away"), in the units setting; no time, no ETA and no
  road distance is said anywhere on the page (D1, D3).
- **OJ10.** With no position the page says it needs one and proposes nothing (no simulation); the page reads a position only while it is
  open.

The chips:

- **OJ11.** The chips are one list holding kinds of attraction and kinds of shop together, each a row of the vocabulary table; none is
  marked as a shop or an attraction, and none is required.
- **OJ12.** On first opening, the chips that are on are those matching the kinds switched on in "What I'm into"; shop chips start off.
  The page's picks are not written back to those switches. This amends the QC surfaces line "'What I'm into' and the kind switches: no".
- **OJ13.** A chip's label and aliases say what a place is and never a quality, a price, a crowd or a time (QC5's banned-word list,
  whole words).
- **OJ14.** Each chip switched on widens what a stop may be; no chip is guaranteed a stop, and no sentence says a chip was or was not
  served (QC7, QC35). A chip whose data does not cover the towns read is still shown and says nothing.
- **OJ15.** Chips are in a fixed order (alphabetical by label), never by popularity or by how many places match.
- **OJ16.** "Include chains" stays one switch, off by default, kept as today (QC41), reached from the sheet.

The journeys:

- **OJ17.** At most three journeys are offered, one per leaning that the picked chips reach, in a fixed order of leanings; two that come
  out with the same towns and stops are one card. With one, there is no row to swipe.
- **OJ18.** A journey is named for its leaning in words ("Along the storefronts", "Past old places", "Through green"); no card carries a
  rank, a number, "best", "fastest", "shorter", "recommended" or a badge, and no two cards are compared.
- **OJ19.** The same position, destination, chips and data always give the same journeys in the same order: no randomness.
- **OJ20.** A journey holds the destination's town and the towns between, near the straight line from here to there, that each add a
  kind of place the journey does not yet hold: chosen for variety of kinds, never to a fixed number (the owner, Nov 17, decision 0198).
  How many towns a journey may take is a setting. No sentence says how many as a digit. A destination within the walking ceiling gives journeys of one chapter.
- **OJ21.** A card's summary is words: the towns in order by name, what it includes by kind, as the chips' own words ("second-hand
  shops, storefronts, old places"), and the distance on foot in all (the owner's "overall travel commitment"; the steward's S7 would
  move the figure off the card: the owner's call). It holds no quantity word about places (few, many, several, a number word) and
  singles out no landmark (the steward's S5, S6).
- **OJ22.** With chips on and nothing to propose, the page says why in one line ("Little of that between here and Kutztown.") and offers
  nothing else.

A journey, town by town:

- **OJ23.** A town's line says what it is made of, from what the atlas reads of it (its storefront streets, the kinds of place it
  holds, its green), in words built only from a closed table of the atlas's own words and its street names; it never says how many (no "few", "lots" or
  number word: what a town lacks is said by saying nothing), how good or how busy, describes no single place, and never names a place
  you have not found (the steward's S5, S6).
- **OJ24.** A town's chapter is said as one of two things: a walk among a few stops with its distance on foot, or one stop by the road
  (D2). A walk stays within the planner's ceiling and its retrace rule (QC10).
- **OJ25.** A stop's line holds only its chip's word and how far on it is, in words, and nothing that describes it; it is named only on a card you open by tapping it, and
  nowhere else (QC17, QC18, QC24). Stops are not numbered and nothing marks one done (QC25).
- **OJ26.** Each stop has "Swap", which works as today within its town (QC21). Each town between has "Leave this town out", which
  removes it and replans the rest; the destination's town cannot be left out.
- **OJ27.** The page says once that opening hours aren't known, and once that distances between towns are straight lines and Maps knows
  the road. Neither is an instruction.

Starting, and the way:

- **OJ28.** "Start the outing" begins a recorded session at once, wherever you are, with the journey as its plan; nothing is recorded
  before that tap (0197, 0036).
- **OJ29.** Between towns the session's bar names the next town and how far away it is, with "Open in Maps", which hands the town's own point to the phone's maps app, never a stop's position, so Maps names no stop (0195;
  the steward's S8; a lone stop by the road is the owner's call, D2). The app draws no road route and gives no turn. The bar can be put
  away for the session, names no town within reach of a chapter's stops, and goes with no line at the destination's town.
- **OJ30.** Within the walking ceiling of a town's stops, the session shows the way on foot through them, as a followed proposal does
  today (QC22): distance only, a quiet re-route, never an off-route alarm (QC23).
- **OJ31.** A town left behind without stopping is let go with no tap and no line: the bar follows where you are and never names a town
  behind you or says "back". "Pass this town by" on the bar does the same ahead of time. No town is marked done, counted or listed as
  left (the steward's S1).
- **OJ32.** Within 60 m of a stop its name is said once on a chip, as today (QC19, QC26): no sound, haptic, notification or action.
- **OJ33.** The capture stack is on the session's screen as on any, one tap each, never covered by the bar (D6).

What never leaks:

- **OJ34.** While a session is open, its saved destination holds the chapters' positions and town names and nothing else: no stop's
  name, chip, leaning or path. It is cleared at Stop, is never on the stored session, in a share or handed to Maps, and no stored field
  says a town or a stop was reached or passed: what is behind you is read from the trace (QC24, QC25, QC29; the steward's S2). The one
  setting stays `outing_chains`.
- **OJ35.** Network reads are the map's tiles and the stores pack's tiles for the towns of the journeys, made only after the person's own tap picks a destination (a chip that is on by default starts nothing by itself), and only for the
  journey in view; they carry nothing but the tile path (QC29). The page says once, in words, that looking ahead reads the map for those
  towns (the steward's S4).
- **OJ36.** A shop met through a journey is never a mark, a find, a landing item or part of the atlas (QC31, D4).
- **OJ37.** Reading is bounded per town (a set number of tiles) and can be stopped, never by a count of towns (0198); while a town is being read its line says so,
  and a read that fails leaves the town out and says one plain line, never an error code.
- **OJ38.** The planner's core still holds no word of a kind of place (QC37): attractions enter as a second source of candidates through
  the same types, proved by a test that plans a journey from a fixture of both.

- **OJ39.** While a session is open the outing page carries the capture stack, one tap each, never under the sheet, the cards or the
  search field at 320 px wide (QC30; the steward's S3).
- **OJ40.** An attraction reached through a journey is found by Explore's existing rules and no others; the arrival chip reads the same
  for a shop and an attraction and says nothing of finding (QC19; the steward's S9).

## Surfaces (from the code)

- The outing page (`components/outing/OutingDrawer.tsx`, hosted only by `src/app/(tabs)/explore.tsx`): rebuilt as the map with a sheet.
- Explore's entry control (`outing-entry`): unchanged (QC1, QC27).
- Explore's search sheet (`components/atlas/PlaceSearch.tsx`, `SearchSheet`): reused inside the page; Explore's own magnifier stays hidden
  while the page is open, as today.
- The session's screen (`src/app/walk.tsx`) and Navigate's bar: the next-town bar, Open in Maps, Skip (OJ29-OJ31); the arrival chip as
  today (OJ32).
- The area card's "Suggest a walk" and the walk planner (`PlannerDrawer`): no change; a kind's walk stays where it is.
- Explore's area card, Chronicle, the replay, the recording bar: no change.

## Not in this slice

A road route or road distance of the app's own; opening hours; a time beside a distance; streets and fog from a driven trace, driven gap
inference and the session's name in the app's words (each its own slice, decision 0197); a journey kept for later or shared; a second
dimension of shop (vintage against thrift); more than one destination.

## Record

**Step 1 built 2026-11-17** on `claude/determined-wright-yg1fq9` (the owner's go-ahead, decision 0198). Steps 2 and 3 are not started.

**Passed.** Unit tests for OJ7, OJ9, OJ11-OJ15, OJ17-OJ19, OJ21, OJ22, OJ25, OJ27, OJ35, OJ36, OJ38, OJ40 (`src/lib/__tests__/outing/`: `chips`,
`sources`, `journeys`, `journeyWords`, `service`); the journey `outing`, rewritten for the page (OJ1, OJ2, OJ7, OJ9, OJ11, OJ12, OJ14, OJ15,
OJ17, OJ18, OJ21, OJ35, and the first page's QC checks that still stand: 45 checks); `npm test`, typecheck, lint, `check:docs`,
`check:vision`.

**Tests first.** The core's tests were committed failing (`f691ead`) before its code. The service's journey test and the journey's
checks were written with their code.

**Changed from the first page, by default (the owner's to overrule).** The search box over chips is gone (eight chips; the field is the
destination's): QC2's journey checks went, its unit tests stand. The Loop / One way switch is gone and QC3 retired: a journey is a loop
when one can be made, else one way, and says which. A place far from you offers "When I get there" beside Start, as Explore's cards do.

**Not built in step 1.** OJ8 (the near towns as shortcuts: it loads the gazetteer on opening the page, 5.6 MB on the web; with step 2,
which reads it anyway); a press and hold on the map to set a destination (OJ1's second half); OJ16's "behind the pull-up" (the switch
sits under the chips); the attractions of the places archive (the tiles' own only); OJ39 has no check yet (the stack is the planner's,
shown while a session records); the cold find and the UI review (decisions 0167, 0145) have not run. The opened journey's sheet covers
part of its route on a small screen.

**Cold find** (the `ux-reviewer`, pictures only, Nov 17, nine tasks in the owner's words): eight found (where to, nowhere in mind,
thrifting, the commitment, which shop, a different stop, Go, changing the place, the last one late). **Not found: "see another
suggestion"**: every picture held one journey, already outlined, with a plural "Back to the journeys". Open, accepted, not yet fixed
(so step 1 is not done): C1 the journey has no state with several journeys (the harness's street has shops only: a fixture with
attractions, a picture and a check that the next card's edge shows); C2 "Back to the journeys" with one journey; C3 "Little of that in
Kutztown." is a dead end with no next step; C4 the field reading "Around here" does not look changeable, and the close button beside it
could be read as clearing it; C5 after a swap the rows read alike and nothing says which changed; C6 "One way" does not say whether
the way back is yours. The plan's UI review has not run.

**Native.** Nothing here has run on a device.
