# Walk planner: plan (WP1-WP22)

Written 2026-11-06 for the owner's review. No code is written until they say go. What I read: `kindWalk/*` (the planner this grows
from), `nav/navigator.ts` and `useNavigation.ts` (arrival, `via`, `suggested`), `RoutePreview.tsx` and `scenic.ts` (the Go here
preview), `AtlasCard.tsx` and `KindStrip.tsx` (the button), `components/map/types.ts` (`route`, `alternates`, `fitBounds`),
`walkHerePlan` in `startPlan.ts`. Not read yet: `WalkMap.web.tsx` and `.native.tsx` internals beyond their prop types, and
`index.tsx`'s card hosting beyond `onWalkAt`, so those file names are proposals to confirm.

## The shape in one paragraph

The in-card panel goes. A kind's button now opens `PlannerDrawer`, a full-screen drawer over Explore (the area card's pattern).
It holds a `WalkMap` (real map) with the three routes (`route` highlighted, `alternates` faint, the highlighted one also drawn in
shaded stretches), three rows (each with its distance, a words line and a density strip), the settings (mode, distance, density,
walkability), Suggest more, and Start. The routes come from three presets over the kind's dense cells, planned from where the
walker stands. Start hands the chosen route to the existing path: `walkHerePlan` routes an open walk, or `useStartWalk` starts one.

## Files

New, `src/lib/walkPlanner/` (feature `walk-planner` in `scripts/features.js`; rule file `.claude/rules/walk-planner.md`):

| File | Layer | What |
|---|---|---|
| `presets.ts` | core | WP4, WP5: the three presets, each a function from the kind's dense cells and the walker to an ordered cell set; fixed order |
| `planner.ts` | core | WP4-WP6, WP8, WP10, WP11, WP13, WP20: three routes for a mode, a ceiling and a density, through `planKindWalk`'s primitives (best order, no retrace, whole-route length); the overlap rule (80%); Suggest more as a set of presets with a `round` that picks other cells |
| `exposure.ts` | core | WP14-WP16: density along a route (cells within 100 m of each metre), the strip's three grades, the map's shaded stretches, the words ("plenty along most of the way", "mostly near the end", how much is getting there) |
| `words.ts` | core | WP7, WP14: every sentence; the same banned-word grep as the kind walk's |
| `settings.ts` | core | WP10-WP12: mode, ceiling steps, density steps, defaults |
| `prefs.ts` | shell | WP12: adds `mode` and `density` to the kind walk's two settings (meta `kindwalk_mode`, `kindwalk_density`), a Store the views read |
| `plan.ts` (app) | shell | reads the area's tiles at the open (as `kindWalk/app.ts` does), calls the planner, reads walkability per route; nothing is kept |
| `usePlanner.ts` | view | the page's state: reading, three routes or a reason in words, the highlighted row |

Moved: `kindWalk/density.ts`, `plan.ts`, `suggest.ts`, `app.ts` become the planner's primitives (renamed under `walkPlanner/`, the
imports updated; `kindWalk/` keeps only what WP20 and WP21 still need). The tests under `__tests__/kind-walk/` that still hold are
kept and renamed by feature (`move-test`), the ones for retired criteria are retired in `features.js` (`RETIRED`).

Touched: `components/atlas/KindStrip.tsx` (the button calls `onPlan`), `AtlasCard.tsx` (drops the in-card panel and
`KindWalkPanel.tsx`), `src/app/(tabs)/index.tsx` (hosts `PlannerDrawer`, passes the walker's fix and the open walk), a new
`components/planner/PlannerDrawer.tsx`, `RouteRows.tsx`, `ExposureStrip.tsx`, `PlannerSettings.tsx`; `components/map/types.ts`,
`WalkMap.web.tsx`, `WalkMap.native.tsx` (a `routeGrades` prop: stretches of the highlighted route drawn thicker in the kind's
colour by grade); `lib/nav/navigator.ts` (`navStep`: a loop's arrival, WP9), `lib/nav/types.ts` (`Waypoint.loop`); `StartSettings.tsx`
(the two kind walk settings move to the planner; the Start dialog keeps only what a walk needs).

## Data

No truth, no cache, no migration. Two more meta keys beside the kind walk's two. The routes are derived on open and recomputed.
Nothing else is stored: the ordinary pending destination, as every navigated walk has (KW14).

## The loop's arrival (WP9)

`navStep` arrives within 30 m of the destination, and a loop's destination is where it began. A destination with `loop: true`
arrives only once the walker has been within 30 m of every `via` stop (`useNavigation`'s `viaPassed` already counts them) and is
back within 30 m of the end. A one-way trip is unchanged.

## Presets (WP5)

All three work over the kind's dense cells (`densestCells`, snapped onto streets), the same 400 m cells as the busy areas.
- **Densest part:** cells in density order, as the kind walk does today.
- **Across the area:** take the dense cells, find the pair furthest apart, order the cells by their position along that line, and pass
  them end to end.
- **Around the edge:** take the densest cell, take the dense cells furthest from it, and pass them in order of bearing around it.

Each is then fitted to the ceiling, which is hard and counts the whole route from the walker and, in a loop, the way back (a cell that
would break it, or make the route retrace over 10%, is skipped in the same fixed order; there is no 25% floor or tolerance). The
planner has its own planning function; `planKindWalk`'s tolerance does not carry over.

**Suggest different routes (WP13).** A press asks for round r+1 of the same presets and cells, never of lower-density cells: the
round turns the way round a loop, takes another street between the same cells (avoiding the legs of the routes on screen), or starts
at the next dense cell. The only state is the routes on screen, held in the page's component state and dropped on close or on a
setting change; the planner keeps no list of what it has shown.

## Tests, one per criterion (written first, as todos, named by id)

Unit, `src/lib/__tests__/walk-planner/`:

| Id | Test (file) |
|---|---|
| WP1 | `plannerPage.test.ts` (the page's state in core: closed, reading, shown): nothing is read until opened; close returns |
| WP2 | e2e only (what the screen shows) |
| WP3 | `planner.test.ts`: no position gives a "needs your position" reason and no routes |
| WP4 | `planner.test.ts`: up to three routes in the fixed order, the same on every call; a small-area fixture gives one route with Start available and a reason; nothing is highlighted at first |
| WP5 | `presets.test.ts`: each preset's cells on a fixture (the dense ones, across, around the densest) |
| WP6 | `planner.test.ts`: no two share more than 80%; where fewer differ, fewer are returned with a reason |
| WP7 | `words.test.ts`: the banned-word grep over the file and every sentence, plus the preset names |
| WP8 | `planner.test.ts`: a loop starts and ends where the walker stands; a one-way ends at its last stop |
| WP9 | `loop.test.ts`: `navStep` does not arrive at the start of a loop; arrives only after the stops and the return |
| WP10 | `planner.test.ts`: no route over the ceiling, counting the way there and, in a loop, the way back, for 40 seeded cases of both modes and a far start; a small area gives a shorter route and says so; out of reach says that |
| WP11 | `planner.test.ts`, `words.test.ts`: a route under the density is not offered; none gives the sentence |
| WP12 | `prefs.test.ts` over `fakePorts()`: both new keys stored and loaded; changing one calls the planner again (`usePlanner` core part) |
| WP13 | `planner.test.ts`: round two shares at most 80% with the routes on screen; the call takes only the routes on screen (no history); a route from two presses ago may return; across ten rounds the mean density grade does not fall; "nothing different" only when the routes cannot be replaced |
| WP14 | `exposure.test.ts`, `words.test.ts`: the words for plenty, some, little, near the start, near the end; the getting-there share |
| WP15 | `exposure.test.ts`: the strip's three grades by position along the route; no digit in its words; its text equivalent |
| WP16 | `exposure.test.ts`: shading is at cell resolution or coarser and unchanged when a place is found; on a fixture with an unfound and a found place on one street the pins equal the found set exactly, taken from captures and finds; the map props given to the planner carry no `pois` and no "?" marks; several found are one pin with no count |
| WP17 | `plannerPage.test.ts`: the navigator map props after Start carry no shading and no pins |
| WP18 | `plannerPage.test.ts`: nothing starts until Start; Start is off until a row is highlighted |
| WP19 | `startFromPlanner.test.ts` over `fakePorts()`: an open walk is routed (no second walk), replacing a set destination; none open starts one ready |
| WP20 | `planner.test.ts`: each route retraces at most 10% and its length is the navigated length (KW16, KW17 on every route) |
| WP21 | `loop.test.ts`: the destination carries `suggested` and no walk field; no time left (KW7b) |
| WP22 | `suggest.test.ts` over `fakePorts()`: nothing is read until opened, nothing is written |
| WP23 | e2e `planner`: with a walk recording the capture stack is on the planner and one tap opens capture; absent without a walk |
| WP24 | `startFromPlanner.test.ts`: Start plans again from the fix at that moment, with the same settings |
| WP25 | `loop.test.ts`: a stop the walker has passed by is dropped from `via`; a loop with a skipped stop still arrives |
| WP26 | `planner.test.ts`: a walker more than 5 km from the kind gets the sentence and no route |
| WP27 | `prefs.test.ts`: the four settings are on the planner; e2e `ready`: the Start dialog has no kind walk settings |

E2E, a new journey `planner` (`scripts/e2e/journeys/planner.js`, replaces `kindwalk` in `features.js`): WP1 (the button opens the
drawer, close returns to the card), WP2, WP4 (three rows, in order), WP6, WP7 (no banned word on the page), WP8 (loop and one-way),
WP10, WP12, WP13, WP14, WP15 (a strip per row), WP16 (the map draws the highlighted route shaded; no "?" pin), WP17 (the walk screen
after Start has no shading), WP18, WP19 (with and without an open walk), WP21 (the bar has no time left), WP23 (the capture stack on the planner with a walk recording). The `kindwalk` journey's
checks that still hold move into it; the rest are retired.

## Retired with the code (`RETIRED` in `scripts/features.js`)

KW1, KW4, KW8, KW8b, KW11b of the kind walk, with decision 0102 as the reason. KW5's chain is replaced by the presets; its test
stays for `presets.test.ts`'s first preset.

## Deferred, and why

Other kinds in the same route (the owner: after this iteration; the settings area is laid out for a kind chooser, nothing more); a
complete walk through every point of interest (its own architecture, decision 0102); pins for places the map draws on the preview (the
first cut shows found places only, taken from the walker's captures and finds, since the map already draws its own features).

## Native paths that will not run on a device

`WalkMap.native.tsx`'s `routeGrades` (new line layers on MapLibre RN); the planner drawer over the tabs with a second map instance;
`showWalk()` with a loop destination; the loop's arrival on a phone; the walkability reads for three routes' tiles. Each gets a
"Do / Expect" item in `docs/NATIVE_UNVERIFIED.md` with its ids.

## Risks I want your eye on

1. **A second map instance.** Explore's map sits under the drawer; a second `WalkMap` runs while it is open. I think the area card's
   drawer already covers the tabs, not unmounts them. I will check how the web build copes, and unmount the drawer's map on close.
2. **Cost of three routes.** The kind walk plans one route with up to eight cells; three presets share one leg cache (a route between
   two cells is computed once), so the cost is about the pairs among eight cells plus the walker, not three times it. I'll measure on
   the Bethlehem-sized grid before the journey.
3. **"Across the area" and "around the edge" in a small or lopsided area** can give the same cells as the densest. WP6 handles it:
   fewer routes, said in words.
4. **The density setting needs numbers behind its words.** Words are fixed (anywhere, some, plenty); the thresholds on the share of
   the route near the kind are mine to set in `settings.ts` and tune on real tiles. They are never shown.

## Steward triage (2026-11-06)

Accepted into the spec: S1 (WP23, the capture stack, with an e2e check and the stack absent without a walk), S2 (WP16: shading at the
cells' resolution or coarser, never narrower than a cell, unchanged by a find; found pins only from captures and finds, none from
tiles, no `pois` or "?" marks passed to the map, one pin with no count; WP13: rounds never move to less dense ground), S3 (WP13: only
the routes on screen are state; the old "skip the cells earlier rounds used" is replaced; the "how many routes" line is deleted),
S4 (the first preset is "through the middle"; the fixed order is by preset; WP7's banned words now include "densest", "most" and any
"-est"; WP20 retitled), S5 (WP14: the getting-there share in words only; WP15: three flat grades, low contrast, no end cap or fill
animation, a text equivalent), S6 (WP10: a hard ceiling that counts the way there and the way back, no 25% tolerance, "out of reach"
in words), S7 (WP4: up to three, one route a normal state), S8 (WP19, WP24, WP25: Start replaces a set destination and plans again
from the fix; a passed stop is dropped), S9 ("Suggest different routes"; density default "anywhere", its words never a number; `marks`
is not reused for found pins; the Start dialog change is WP27). WP26 answers the steward's question about a far walker.

Hidden criteria moved to the spec: the 100 m exposure window is dropped (cell resolution, WP16); the 10% retrace (KW16) and the exact
ceiling (WP10); the found-pin rule (WP16); the settings move (WP27). "Unmount the drawer's map on close" stays a plan item (see the
risks), not a user outcome.

Waits on the owner:
1. **A found stretch.** Density counts found and unfound places alike, so a stretch you have fully found still shades as plenty (stable,
   and it reveals nothing about what is left). The steward asks whether to keep that or fade it in words ("you have walked here"). I
   recommend keeping it: fading it would tell the walker how much is still unfound.
2. **The first preset's name.** "Through the middle" replaces "through the densest part", which the steward found to be a superlative
   beside WP7's ban. It is the dense core, not always the middle of the area. Another name?
3. **Which row is highlighted when the page opens.** The spec says none, with Start waiting for a tap, so the first row does not read as
   the recommended one. That is one extra tap; the alternative is highlighting the first.
