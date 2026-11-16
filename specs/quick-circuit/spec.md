<!-- Plan an outing (slug quick-circuit, prefix QC). Written in the repo first (2026-11-16) from the owner's session and their calls below.
     To be copied into the concept doc as a tab; the doc wins once it exists. -->

# Plan an outing: describe what you want to see, get one proposed circuit (QC)

Nov 16, 2026 · @Miguel Guerrero

The owner: "a quick start action, that you supply some preferences and the app auto-generates a circuit for you. It has a beginning
and end, and it's treated as a proposal ... an antique expedition ... it will select a couple of places and just put me on a route. I
don't know what these places are, and I can feel free to detour." Then, reframing it: "there shouldn't be an antiques entry ... a
surface that allows a user to describe the sorts of things they want to see and the app proposes one route ... part of the antiques is
to give an example of how a rich data set of stores can be leveraged to produce a circuit, which may not be possible from just points of
interest alone." Later: closing times, admission, other dimensions; not this slice.

From Explore, one control, "Plan an outing", opens a page. You say what you want to see by picking from a vocabulary (a search box over
chips: Antiques, Books). The app proposes one circuit from where you stand: a start, a few stops, an end. Stops are slots said by
kind ("An antiques shop, a short walk on"), named only when you tap one or reach it. Each slot can be swapped. Start begins an ordinary
walk that follows the proposal and never insists on it.

## Vision

```
Idea: A page opened from Explore where you describe what you want to see by picking from a fixed on-device vocabulary; the app proposes
  one circuit; antiques is one entry, an example of a rich store dataset making a route that points of interest alone cannot
Verb: earn (it helps the walker notice where a kind of place gathers and gives them a way through it; the stops are found on foot)
Touches: Never "Ratings, reviews, stars, 'best of'", "Popularity, trending, foot traffic", "Several ways ranked by minutes; 'fastest'",
  "Tallies such as '12 of 87'", "Nagging", "Data leaving the device without a tap"; Always "A route is a suggestion; drifting is never
  nagged", "Guidance is structural", "Counts are words", "Capture is one tap away"; Who it is for "wander a town with no plan",
  "not tourists working through a list"; 0044 (a mark is for an attraction), 0103 (significance is a gate, never a measure), 0108 (the
  gate reads no counts; community sources only nominate), 0115 (ordinary shops stay out of the places archive), 0127 (a route leans on
  places you pass, by kind, never named), 0102 and 0095 (a distance, never a time)
Verdict: aligned if reshaped
Shape: one proposal; a vocabulary of what a place is (never how good, dear, busy or open); stops by kind, named on a tap or on arrival
  from the data, never stored; a stores layer whose records hold what a shop sells and nothing a crowd says; Swap without wrap or repeat;
  hours not known and said once
Criteria: QC1-QC30 below
Open: the owner's calls of Nov 16 are in Decisions; a decision record for the stores layer (it amends 0115 and 0044) is the owner's
```

## Decisions (the owner, 2026-11-16)

- **Not an antiques button, a describing surface** (the owner's reframe): a page from Explore where you pick what you want to see; antiques
  is one entry of a vocabulary, the worked example of what a rich store dataset allows.
- **A vocabulary on the device**, picked from (over the recommended): chips and a search box over a fixed table; no free text is read.
- **One page from Explore** (over the alternatives): one control, "Plan an outing".
- **Design the richer data first** (over tiles-first): the store dataset's contract and its reader are specified here; the pack is built
  by chronicles-data (`handoff.md`). Until a pack covers an area the tiles' shop subtypes serve the same table.
- **Loop first, One way on the page, not remembered**; **Swap: no wrap, no repeats**; **a new presence class `antiques` beside
  `boutique`** (the owner, Nov 16).
- **Named stops, but as you arrive** (the owner, after the gate's pushback, Nov 16): a slot says its kind and how far; its name shows on a
  tap or when you reach it; no name is stored (the steward's S1).
- **No opening hours or admission in v1**: the page says once that they are not known.
- **For the owner's decision record** (written after the go-ahead, `npm run book:next-decision`): a stores layer enters a shop by what it
  sells and by nothing a crowd says, amending 0115 ("ordinary shops stay out") and 0044 for this layer only; the places archive and
  marks are unchanged.

## Criteria

The owner's task, and finding it:

- **QC1.** "Describe what I want to see and get an outing": from Explore, one tap on a control worded "Plan an outing" opens a page where
  I pick what I want to see and one proposed circuit appears from my position. *Finding criterion:* someone who was not told where it is
  finds it on Explore from the word and an icon people know (a compass or a route), without opening a menu or a card first.
- **QC2.** The page opens with a search box and the vocabulary's entries as chips. Picking one or more makes the proposal; typing narrows
  the entries by their label and aliases (not by anything else) and picks nothing itself.
- **QC3.** The page shows Loop and One way, the first proposal is a loop, and the choice is not remembered: no setting is written, the page
  opens on Loop each time. One way replans without leaving the page.

The vocabulary:

- **QC4.** Entries are data (`outing/wants.ts`): each has an id, a label, aliases and the specialisms it matches. v1 ships Antiques and
  Books. Adding an entry adds a table row and its tests, no planner code (a fixture entry proves it).
- **QC5.** An entry's label and aliases say what a place is. None says quality, price, popularity, time or an opinion ("best", "cheap",
  "hidden gem", "quiet", "open late"), held by the banned-word grep over the table.

The proposal:

- **QC6.** The page proposes exactly one circuit, never several rows, and nothing is ranked or labelled fastest or best.
- **QC7.** The stops are stores whose specialism an entry matches, read around the walker. Each picked entry gets at least one stop when its
  places are within the ceiling; an entry with none is named in words ("Nothing for books close by.") and the rest still proposes.
- **QC8.** Two or three stops, said "a few", never a digit; with fewer than two reachable within the ceiling nothing is proposed and the
  words say why ("Few of those close by.").
- **QC9.** The same position, ceiling, entries and mode always give the same proposal: no randomness; a tie goes to the more southern, then
  the more western place; nothing orders stops by anything but position and the entry they serve.
- **QC10.** The ceiling is the planner's `kindwalk_budget` (2 km by default); the whole circuit, from the walker and in a loop back, stays
  within it and runs over itself by no more than a tenth (WP10, KW16). A one-way proposal ends at its last stop; a loop where it began.

The stores layer (the richer data):

- **QC11.** A store record holds an id, a name, a position, one or more specialisms from a closed list and its source, and nothing else:
  no rating, review count, price level, popularity, foot traffic, photo or "open now". Hours are reserved in the contract and not
  emitted in v1. A schema test over the adapter fails on any other field.
- **QC12.** A store enters by what it sells (a specialism from open data such as OpenStreetMap's shop tags) and by nothing a crowd says:
  the reading reads no rating, count of mentions, popularity or page views (as PP5-PP7 hold for the archive).
- **QC13.** A chain is never a stop (`chains.json`, whole leading words).
- **QC14.** The stores reader is an adapter (`outing/storesRead.ts`, the only file that knows the pack's schema), behind a `StoresSource`
  with an in-memory source for tests; no dataset is hard-coded (AGENTS.md). It reads by tile, like the places archive, and a read that
  fails or finds no pack leaves the tiles' shop subtypes serving the same table, with nothing said of it.
- **QC15.** A store in the pack and the same shop in the tiles are one stop (`mergePlaces`' rule: one place within 200 m for the same name
  and kind).
- **QC16.** Presence reads `shop=antiques` (and Overture's antiques) as the class `antiques` beside `boutique`: bars, weights, storefront
  streets and marks are unchanged, held by the readers' golden; `PRESENCE_CODE` is bumped.

The stops are discoveries:

- **QC17.** A slot reads "An antiques shop" (its entry's word) and how far it is from the one before, in words ("a short walk on"); it carries
  no name, number, rank or time.
- **QC18.** A tap on a slot names the shop on a card (name, kind and distance in words) and nowhere else. The card says nothing of hours.
- **QC19.** On the walk, within 60 m of a stop the walk screen says its name once, as an on-screen chip; the name is resolved from the data
  at that moment, is not kept as a find and is not a moment. Passing a stop unseen says nothing.
- **QC20.** The page says once, apart from the slots and cards, "Opening hours aren't known here." It is a statement with no imperative or
  modal ("check", "call ahead", "may be closed"). No slot or card says a shop is open or closed.

Swap and detour:

- **QC21.** Each slot has Swap, labelled "Swap this stop", never with a shop's name. It replaces that stop with the nearest other store of
  the same entry within the ceiling that the circuit does not hold and has not already been offered for that slot, and replans. It closes any
  open card, and the new slot is unnamed. With none it says "No other one within reach." and changes nothing. It does not wrap.
- **QC22.** Start begins an ordinary walk (or routes the open one) whose destination is the proposal: its stops as `via`, its path followed
  as planned, `suggested`, so the walk screen says distance only and never a time (WP19, WP24).
- **QC23.** Leaving the proposed path is never flagged: no alarm, banner or "off route" nag beyond what any suggested destination already
  does (a quiet re-route that rejoins the plan); a stop skipped is let go (WP9, WP25). Walk me back is still the shortest way.

What never leaks (the steward's S1-S8, accepted):

- **QC24.** No stop's name is in the walk's destination, the stored walk, anything handed to Maps or shared, the page's text or accessible
  names, or any map label or marker text: the destination holds positions only, and a name is resolved from the data at a tap or on arrival.
  On the page and on the followed walk the basemap's shop and POI labels are not drawn near a stop; stops are plain unlabelled points.
- **QC25.** No slot, accessible name or walk line carries an ordinal, "of N", a progress glyph or a remaining count; slots are not numbered;
  after a stop is reached nothing marks it done.
- **QC26.** The arrival line is an on-screen chip only: no haptic, sound, notification or accent colour; it never overlaps or displaces the
  capture stack and fades without a tap.
- **QC27.** The entry is one control in the map controls' existing style, with no badge, count or nearby-count text.
- **QC28.** No sentence of the page, its cards or the walk's line holds a count of stops or shops as a digit, minutes, hours of walking, an
  ETA, a pace, "best", "most", "top", "popular", "rated", "fastest", "shorter" or "longer" (the planner's banned-word grep, extended).
- **QC29.** Nothing is stored or sent: no new meta key, store or migration; the proposal is recomputed from the position and the data, never
  patched; the only network reads are the stores pack's tiles from the pages site the archive already uses.
- **QC30.** With no position the page says it needs one and proposes nothing (no simulation). With the page open the capture stack is visible
  and reachable in one tap, before or during a walk, or this spec records why it is not, as the planner's precedent (WP23) does; decided at
  test-first by reading `PlannerCapture` and `useHideTabs`.

## Surfaces (from the code)

- Explore tab (the entry; QC1, QC27): yes, `src/app/(tabs)/explore.tsx`, a control beside the map's controls.
- The outing page: a full-screen drawer over Explore, like `PlannerDrawer` (it shares its shell, `useHideTabs`, `PlannerCapture`).
- The area card's kind rows ("Suggest a walk", `KindStrip`): no. The vocabulary is not the atlas's eight kinds (decision 0102).
- "What I'm into" and the kind switches: no. A vocabulary entry is not a kind, and a switched-off kind does not hide a store here.
- Navigate's ready screen and the walk screen: the walk carries the arrival chip (QC19); the ready screen has no entry in v1.
- Chronicle, the replay, the recording bar: no change.

## Not in this slice

Opening hours, admission and closing times (the reserved field); more vocabulary entries; a detour via a named stop; the stores pack
itself (built in chronicles-data from `handoff.md`); other kinds of place in the same outing than stores. Recorded in `docs/DEFERRED.md`
when the slice is tracked.

## Record

(Filled in as the slice is built.)
