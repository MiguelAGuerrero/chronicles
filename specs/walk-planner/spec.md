<!-- Walk planner. Written in the repo first (2026-11-06) from the owner's session after walking the kind walk in Bethlehem
     ("so this is suggested route history through a Bethlehem..."), then their calls below. To be copied into the concept doc
     as a tab. The doc wins once it exists. Decision 0102 (amends 0101). -->

# Walk planner: a page of its own for suggesting a walk through a kind (WP)

Nov 6, 2026 · @Miguel Guerrero

From a kind's "Suggest a walk" button on an area's card in Explore, a full-screen page opens over Explore. It plans three routes
from where you are, draws them on the map, shows for each how much of the kind it passes without saying where the places are,
and has settings that shape the routes. Choose one and it starts as an ordinary walk (or routes the walk you already have open).

The owner uses it while on a walk: they go to Explore "to see what's around", so the plan is from where they are now.

## Vision

```
Idea: a walk planner on its own page: a loop starting where you stand, three routes overlaid on the map each with its
  distance, each defined by a preset, with settings for distance and density, and later other kinds in the same route
Verb: earn (it helps the walker notice where a kind is concentrated, from wherever they are)
Touches: decision 0102 ("no 'shorter' or 'longer', no 'best' and no difference between rows", "a distance, never a time",
  no pin for a place not yet found); decision 0095 (several routes, distance only; "places not yet found are never named on a
  route"); 0101 (amended: one way becomes three); Never: "Several ways ranked by minutes; 'fastest' as a label", "Scores,
  streaks, completion, coverage" (the exposure is a shade and words, never a number), "Nagging"; Always: "Capture is one tap
  away on every screen you walk or capture from", "A route is a suggestion; drifting is never nagged", "Guidance is
  structural", "Counts are words"
Verdict: aligned if reshaped
Shape: three fixed presets named by what shapes them (not by pace or length); the distance a ceiling and a preference;
  exposure as a shaded route, a strip and words, no pin for an unfound place; "Suggest more" replaces the three without a
  history; Start routes an open walk or starts one
Criteria: WP1-WP22 below
Open: none (the owner's answers of Nov 6 below)
```

## Decisions

- **A page of its own** (the owner, 2026-11-06): a full-screen drawer over Explore, like the area card, so you return to where you
  were. Not a new route in the app.
- **The three presets** (the owner, 2026-11-06, the recommended names): through the densest part, across the area, around the edge.
  Each is a fixed set of parameters: the same inputs give the same three routes.
- **Where it starts** (the owner, 2026-11-06): a loop starts where you are now, also when a walk is already recording. Loop is the
  default mode; one-way is the other.
- **A preference and a ceiling** (the owner, 2026-11-06): the distance is how far you are willing to go. Where the kind fills less
  ground, the route is shorter, and the page says so.
- **No pin for a place not yet found** (the owner, 2026-11-06, agreeing with the gate): the feel for the commitment comes from
  density, in a shaded route, a strip and words. Pins on the planner only, and only for places already found and features the map
  draws.
- **The real map** (the owner, 2026-11-06): the planner draws on the walk screen's map (`WalkMap`), not a sketch.
- **Other kinds in the same route** (the owner, 2026-11-06): after this iteration, from the same page. The opened kind is
  pre-selected; this iteration plans for it alone.
- **The two bug fixes first** (the owner, 2026-11-06): one continuous route and one distance (KW16, KW17) were deployed on their own.
- **A complete walk through every point of interest, which doubles back**: deferred, its own architecture (decision 0102,
  `docs/DEFERRED.md`).

## Acceptance criteria

### The page

1. **WP1 · A kind's button opens the planner.** On an area's card, a kind's "Suggest a walk" button opens the planner as a
   full-screen drawer over Explore. Closing it (the close button, a pull down, Escape or Back) returns to the card as it was. No
   new route or modal opens, and nothing is read until the button is tapped.
2. **WP2 · What is on it.** The planner shows the map with the routes, a row for each route, and the settings below them.
3. **WP3 · From where you are.** The routes are planned from the walker's position, also while a walk is recording. With no
   position it says so in words and plans nothing.

### The three routes

4. **WP4 · Three, fixed.** Three routes are shown at once, in a fixed order that does not depend on length or quality: through the
   densest part, across the area, around the edge. The same inputs give the same three routes.
5. **WP5 · Each preset's rule.** "Through the densest part" passes the cells of the kind in density order. "Across the area" passes
   the dense cells along the area's widest direction, end to end. "Around the edge" passes the dense cells furthest from the
   densest, in order around it.
6. **WP6 · Different streets and directions.** No two routes share more than 80% of their length. Where fewer than three differ
   that much, fewer are shown and the page says why in words.
7. **WP7 · Names say what shapes them.** A preset's name and every line on the page use no time, pace, "brisk", "quick", "shorter",
   "longer", "best", "fastest" or superlative.

### Mode and settings

8. **WP8 · Loop or one-way.** A setting chooses a loop (the default) or a one-way trip. A loop starts where the walker stands and
   ends there; a one-way trip ends at the route's last stop.
9. **WP9 · A loop is not "arrived" when it starts.** Starting a loop does not arrive at once: arrival counts only after the stops
   have been passed.
10. **WP10 · The distance is a ceiling.** A setting, in steps in the displayed unit (km or miles), default 2 km. No route is longer
    than it. Where the kind fills less ground than the ceiling, the route is shorter and the page says so in words.
11. **WP11 · Density.** A setting, in words ("anywhere", "where there is some", "where there is plenty"). A route that passes less of
    the kind than the setting asks for is not offered; when none is, the page says so in words.
12. **WP12 · Settings are kept and act at once.** Each setting is stored, and changing one plans the three again.
13. **WP13 · Suggest more.** A button replaces the three with three different routes (none sharing more than 80% with one shown
    before the press). The page keeps no history and shows no count, "was" or earlier route. With nothing more it says so in words.

### The feel for the commitment

14. **WP14 · Each row.** A row gives its own distance in the displayed unit and a line in words of how much of the kind the route
    passes and where ("plenty along most of the way", "mostly near the end"), and says plainly how much of the route is only
    getting there. No time and no number but the distance.
15. **WP15 · A strip.** Each row has a strip from the route's start to its end, shaded where the kind is dense, with no number,
    percent or count.
16. **WP16 · The map.** The highlighted route is drawn shaded where the kind is dense, the other two faint. No pin or name for a
    place not yet found appears anywhere. Places already found, and features the map draws, may be pins, on the planner only.
17. **WP17 · Plain after starting.** The shading and pins appear on the planner only. Once started, the navigator map shows the plain
    route.

### Choosing and starting

18. **WP18 · Choosing.** Tapping a row, or its line on the map, highlights it, and a Start button starts the highlighted route.
    Nothing starts until Start is pressed.
19. **WP19 · An open walk, or a new one.** If a walk is recording, Start routes that walk (no second walk is started) and returns
    to it. Otherwise it starts a walk ready (0076). Capture stays one tap away on the planner while a walk is recording.
20. **WP20 · Every route is a good one.** Every route holds the kind walk's rules: continuous (KW16), one distance for the row and the
    bar (KW17), walkability said in words per route with the warn or don't-suggest setting (KW10, KW11).
21. **WP21 · An ordinary walk.** After Start there is no tour mode, tally, progress, off-route alarm, or time left on a walk started
    from the planner (KW7b); the quiet re-route keeps the stops ahead.
22. **WP22 · Local.** Nothing is read until the planner opens, the reads use the hosts already allowed, and nothing is kept but the
    settings and the ordinary pending destination (KW14).

## Amends the kind walk (decision 0102)

KW1 (the row opens the kind in place), KW4 (one way), KW5's single chain, KW8 and KW8b (Shorter, Longer, within 25%) and KW11b (one
chain) no longer hold and are retired in `scripts/features.js` when the code lands. KW15's button stays, and opens the planner. KW10,
KW11, KW14, KW16, KW17 and KW7b stand and are WP20-WP22.

## Out (deferred)

Other kinds in the same route; a complete walk through every point of interest (it doubles back; its own architecture in dense
areas); a route to a destination of the walker's (scenic routes' Go here); routing that avoids car-oriented streets.

## Record

Not started (2026-11-06): the spec and plan await the owner's review.
