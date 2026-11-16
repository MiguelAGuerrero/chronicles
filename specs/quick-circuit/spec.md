<!-- Quick circuit. Written in the repo first (2026-11-16) from the owner's session and their calls below. To be copied into the
     concept doc as a tab; the doc wins once it exists. Prefix QC. -->

# Quick circuit: one tap proposes an outing for a kind of place (QC)

Nov 16, 2026 · @Miguel Guerrero

The owner: "a quick start action, that you supply some preferences and the app auto-generates a circuit for you. It has a beginning
and end, and it's treated as a proposal on how to accomplish a specific type of experience ... an antique expedition ... it will
select a couple of places and just put me on a route. I don't know what these places are, and I can feel free to detour and shape
the journey how I want to." Later, "multi-dimensional considerations" (hours, admission, other kinds of outing); not this slice.

From Explore, one tap on "Antiques" opens a page that proposes one circuit from where you stand: a start, a few stops that are antiques
shops, an end. The stops are said as slots ("An antiques shop, a short walk on") and are named only when you tap one or when you
reach it. Each slot can be swapped for another shop of the same kind. Start begins an ordinary walk that follows the proposal
and never insists on it.

## Vision

```
Idea: One tap plans a circuit (a start, an end, a few stops that can be swapped and wandered from) for one intent, antiques first;
  v1 knows no opening hours or admission and says so
Verb: earn (it helps the walker notice where a kind of place is, and gives them a way through it; the stops are found on foot)
Touches: Never "Several ways ranked by minutes; 'fastest' as a label"; "Ratings, reviews, 'best of'"; "Popularity, trending";
  "Tallies such as '12 of 87'"; "Nagging"; Always "A route is a suggestion; drifting is never nagged", "Guidance is structural",
  "Counts are words", "Capture is one tap away"; Who it is for "not tourists working through a list"; 0127 ("a route leans on places
  you pass, by kind, never named"); 0115 (ordinary shops stay out of the places archive; the tiles carry the shops); 0102 (the planner:
  a distance, never a time); 0095 (distance in words, no minutes compared)
Verdict: aligned if reshaped
Shape: one proposal, not several; the stops are slots said by kind and named on a tap or on arrival, so the outing stays a discovery
  and not a checklist; swap offers another place of the same kind; hours are not known and are said once; the walk is an ordinary
  walk with a suggested destination (distance only, drifting never nagged)
Criteria: QC1-QC24 below
Open: the owner's answers of Nov 16 are in Decisions; the entry's place and the loop default are the plan's (plan.md, "For the owner")
```

## Decisions (the owner, 2026-11-16)

- **Named stops they can swap**, then, after the gate's pushback, **named as you arrive**: a slot says its kind and how far it is; its
  name shows on a tap or when you reach it. 0127's "never named" is not amended: the stops are named by the walker's own act.
- **Opening hours and admission are out of v1**: the page says once that they are not known. The structure (a place has a window)
  is left for a later slice and is not designed here.
- **One intent first, antiques**, as the quick start. Antiques is data (an entry in a table of intents), so a second intent adds an
  entry and no planner code.
- **Loop or one-way is chosen each time**: neither is remembered between outings.

## Criteria

The owner's task, in their words, and finding it:

- **QC1.** "Start an antiques outing from where I am": from Explore, one tap on a control worded "Antiques" opens a page with one
  proposed circuit from the walker's position. *Finding criterion:* someone who was not told where it is finds it on Explore from the
  word and an icon people know (a shop or a compass), without opening a menu or a card first.
- **QC2.** The page shows Loop and One way, and the first proposal is a loop. The choice is not remembered: the page opens on Loop each
  time and writes no setting. One way replans without leaving the page.

The proposal:

- **QC3.** The stops are places whose presence class is antiques (the tiles' `shop=antiques`), read around the walker. A stop is only a
  place the tiles carry; nothing is added from a rating, a count of visits, a popularity or a review field.
- **QC4.** The proposal has two or three stops, said "a few" and never as a digit; with fewer than two reachable within the distance
  ceiling it proposes nothing and says why in words ("Few antiques shops close by.").
- **QC5.** The same position, ceiling and mode always give the same proposal: no randomness and no order by anything but position
  (a tie goes to the more southern, then the more western place).
- **QC6.** The distance ceiling is the planner's `kindwalk_budget` (2 km by default); the whole circuit, from the walker and in a loop
  back, stays within it and runs over itself by no more than a tenth (the planner's own rule, WP10, KW16).
- **QC7.** A one-way proposal ends at its last stop; a loop ends where it began.

The stops are discoveries:

- **QC8.** A slot reads "An antiques shop" and how far it is from the one before, in words ("a short walk on"); it carries no name, no
  number, no rank and no time. Its name is not in the page's text, its accessible name or its map layer.
- **QC9.** A tap on a slot names the shop on a card (name, kind and distance in words) and nowhere else. The card does not say anything of hours.
- **QC10.** On the walk, within 60 m of a stop the walk screen says its name once, as an on-screen chip; the name is resolved from the
  tiles at that moment, is not kept as a find and is not a moment. Passing it unseen says nothing.
- **QC11.** The page says once, apart from the slots and cards, "Opening hours aren't known here." It is a statement: no imperative or
  modal ("check", "call ahead", "may be closed"). No slot or card says a shop is open or closed or that its hours are unknown.

Swap and detour:

- **QC12.** Each slot has Swap, labelled "Swap this stop", never with a shop's name. It replaces that stop with the nearest other antiques
  shop within the ceiling that the circuit does not hold, and replans the order. It closes any open card, and the new slot is unnamed.
  With none it says "No other antiques shop within reach." and changes nothing. Swap keeps no history and does not wrap: a place
  offered in place of a slot is not offered for it again (the steward's S2; the owner may lift this, plan "For the owner" 3).
- **QC13.** Start begins an ordinary walk (or routes the open one) whose destination is the proposal: its stops as `via`, its path
  followed as planned, `suggested` so the walk screen says distance only and never a time (as the planner's, WP19, WP24).
- **QC14.** Leaving the proposed path is never flagged: no alarm, banner or "off route" nag beyond what any suggested destination
  already does (a quiet re-route that rejoins the plan). A stop skipped is let go like the planner's passed-or-let-go (WP9, WP25).
- **QC15.** Walk me back is still the shortest way and is not changed by an outing.

Words and rules:

- **QC16.** No sentence of the page, its cards or the walk's line holds a digit count of stops or shops, minutes, hours of walking, an
  ETA, a pace, "best", "most", "top", "popular", "rated", "fastest", "shorter" or "longer" (the planner's banned-word grep,
  `words.test.ts`, extended to this file).
- **QC17.** Nothing is stored or sent: no new meta key, store or migration; the proposal is recomputed from the position and the
  tiles, never patched; nothing leaves the device.
- **QC18.** Antiques is data, not code: the planner and the page hold no word "antiques" outside the intents table and presence;
  adding an intent adds an entry and its tests.
- **QC19.** Presence reads `shop=antiques` (and Overture's antiques) as the class `antiques` beside `boutique`: the bars, weights,
  storefront streets and marks are unchanged, held by the readers' golden; `PRESENCE_CODE` is bumped.
- **QC20.** With no position the page says it needs one and proposes nothing (no simulation). With the drawer open the capture stack is
  visible and reachable in one tap, before or during a walk, or this spec records why it is not, as the planner's precedent (WP23)
  does; decided at test-first by reading `PlannerCapture` and `useHideTabs`.

The steward's review (S1-S8, 2026-11-16), accepted:

- **QC21.** (S1, S3) No stop's name is in the walk's destination, the stored walk, anything handed to Maps or shared, the page's text or
  accessible names, or any map label or marker text: the destination holds positions only, and a name is resolved from the tiles at
  the moment of a tap or of arrival. On the page and on the followed walk the basemap's shop and POI labels are not drawn near a stop;
  the stops are plain unlabelled points. Tested by serialising the destination (no place name in it) and by the map style's layer
  filter; the e2e picture checks it.
- **QC22.** (S4) No slot, accessible name or walk line carries an ordinal, "of N", a progress glyph or a remaining count; slots are not
  numbered; after a stop is reached nothing marks it done, and the walk screen never says how many stops remain.
- **QC23.** (S6) The arrival line is an on-screen chip only: no haptic, sound, notification or accent colour; it never overlaps or
  displaces the capture stack and fades without a tap.
- **QC24.** (S8) The entry is one control in the map controls' existing style, with no badge, no count and no nearby-count text.

## Surfaces (from the code)

Hosts of what this adds, from `grep`, and why each does or does not carry it:

- Explore tab (the entry; QC1): yes. `src/app/(tabs)/explore.tsx`, a control beside the map's controls.
- The outing page: a full-screen drawer over Explore, like `PlannerDrawer` (it shares its shell, `useHideTabs`, `PlannerCapture`).
- The area card's kind rows ("Suggest a walk", `KindStrip`): no. Antiques is an intent, not a kind of the atlas; the kinds stay the
  eight (decision 0102).
- Navigate's ready screen and the walk screen: the walk screen carries the arrival name (QC10); the ready screen carries no entry in v1.
- The recording bar and Chronicle: no change.

## Not in this slice (the owner's later direction)

Opening hours, admission and closing times; other intents; a stop chosen by what is near it; a detour via a named stop; a chosen
time of day. Recorded in `docs/DEFERRED.md` when the slice is tracked.

## Record

(Filled in as the slice is built.)
