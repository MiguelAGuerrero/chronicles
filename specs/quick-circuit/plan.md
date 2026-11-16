# Quick circuit: plan (QC1-QC24)

Written 2026-11-16, for the owner's review before any code. It reuses the walk planner (0102) rather than adding a second one.

## The idea in one paragraph

The planner already turns a set of points into an ordered loop or one-way route over the streets (`fitOrder`, the legs, the retrace and
ceiling rules, `destFor`, `PlannerCapture`, the drawer shell). What it lacks is stops that are single places, a way to swap one, and a
way to name one late. This slice adds a small `outing/` core that picks 2-3 antiques places and orders them with the planner's own
fitting, an intents table (antiques is one entry), one presence class, a page that is the planner's drawer shell with slots, and one
walk-screen line that names a stop within 60 m. Nothing new is stored.

## Files

New, `src/lib/outing/` (each starts with `// @layer`):

| File | Layer | Holds |
|---|---|---|
| `intents.ts` | core | `INTENTS`: `{ id, label, classes, slotWord, stops: [2, 3] }`; antiques is the only entry (QC18) |
| `pick.ts` | core | `pickStops(places, from, ceilingM, mode, swapRound)`: candidates by class, within the ceiling, ordered by distance then south, then west; no field but position and class is read (QC3, QC5) |
| `plan.ts` | core | `planOuting(input, leg)`: picks, then orders with the planner's fitting; a loop or one way; the ceiling and retrace rules; reasons (`noPosition`, `few`, `noRoute`, `noLoop`) (QC4-QC7, QC20) |
| `swap.ts` | core | `swapStop(plan, index, places, ...)`: the nearest other place of the class not held, wrapping, none says so (QC12) |
| `words.ts` | core | the slot line, the distance-on-from-the-last-point words, the one hours line, the reasons in words; banned-word grep test (QC8, QC11, QC16) |
| `dest.ts` | core | `outingDest(plan)`: a `Waypoint` like `destFor` (`via`, `path`, `suggested`, `loop`), positions only (QC13, QC21) |
| `service.ts` | shell | `createOutingPlanner(deps)`: reads the tiles around the walker (the planner's `read`), calls `planOuting`; keeps nothing (QC17) |
| `arrival.ts` | core | `stopWithin(dest, fix, said)`: which stop is within 60 m, once; the shell resolves its name from the tiles then (QC10, QC21) |
| `useOuting.ts` | view | the hook the page calls |

Touched:

- `src/lib/walkPlanner/planner.ts`: export `fitOrder` (a one-word change) and nothing else.
- `src/lib/presence/presence.ts`: `shop/antiques` gives `['boutique', 'antiques']`; `PresenceClass` gains `antiques` (weight and storefront as `boutique`, no category of its own, so bars and marks cannot move); `PRESENCE_CODE` bumped, `PRESENCE_CARRIED` set only if the readers' golden shows nothing derived changed (QC19). Overture's antiques category gets the same. The goldens are re-captured and listed in this spec.
- `src/lib/nav/types.ts`: no change. The names are not stored (steward S1): the arrival's shell reads the tiles around the fix and names the place nearest the stop.
- The page's `WalkMap` and the walk's map: the basemap's shop and POI labels are dropped near a stop in the circuit's style, the stops being plain points (QC21). Whether `WalkMap` can filter its basemap labels is the first thing to check at test-first; if it cannot, the proposal's page draws the route on a map style without POI labels and the walk's map is a native, unverified gap recorded in DEFERRED.
- `src/lib/nav/useNavigation.ts` (or the walk screen's chip row): shows the arrival line from `arrival.ts` (QC10).
- `src/components/outing/OutingDrawer.tsx`: the planner's drawer shell (`useHideTabs`, `PlannerCapture`, the map `WalkMap` with the proposal's route), slots, Swap, the Loop/One way pair, the hours line, Start. `RouteRows` is not used: there is one proposal.
- `src/app/(tabs)/explore.tsx`: the entry control, state `outingOpen`, and the map stepping aside as the planner's does (NV4).
- `scripts/features.js`: a feature `outing` (source `src/lib/outing/**`, `src/components/outing/**`, journey `outing`, spec `quick-circuit`); `IN_PROGRESS` while built.
- `.claude/rules/outing.md` (new, `paths:` narrowed to the folder, decision 0173), `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`.

## Data

No new truth, cache, meta key, store, SQLite migration or IndexedDB version (QC17). The proposal is recomputed on open from the tiles and
the fix. The only data change is presence's class (a code, not a schema); `PRESENCE_CODE` makes atlas and landing rows read again, as
every presence change does (PS9).

## Tests, one per criterion (`src/lib/__tests__/outing/`, ids in the names, todo first)

| Id | Test (file) |
|---|---|
| QC1 | journey `outing`: the control is on Explore with the word "Antiques"; one tap opens a page with a proposal. The cold find: the `ux-reviewer`, given the picture and "start an antiques outing from where you are" |
| QC2 | `loop.test.ts` (loop first; One way replans; no `kindwalk_mode` write by `fakePorts`); journey step |
| QC3 | `pick.test.ts` (only the class; a rated or busy fixture place changes nothing); `presence.test.ts` |
| QC4 | `plan.test.ts` (2-3 stops; fewer than two: reason `few`); `words.test.ts` |
| QC5 | `plan.test.ts` (same inputs, same plan; the tie rule) |
| QC6 | `plan.test.ts` (ceiling hard; retrace at most a tenth) on `__tests__/walk-planner/grid.ts` |
| QC7 | `plan.test.ts` (a one-way ends at its last stop; a loop ends where it began) |
| QC8 | `words.test.ts`; journey (no name in the page's text or accessible names) |
| QC9 | journey (a tap on a slot shows the card with "Hours unknown") |
| QC10 | `arrival.test.ts` (within 60 m, once, none beyond) |
| QC11 | `words.test.ts`; journey |
| QC12 | `swap.test.ts` (nearest other, not held, none, wraps) |
| QC13 | `dest.test.ts` (shape equals `destFor`'s plus names; `suggested`) |
| QC14 | `dest.test.ts` (the destination is suggested, so no off-route alarm; the planner's `passedStops` lets a skipped stop go) |
| QC15 | `dest.test.ts` (Walk me back reads no `via`) |
| QC16 | `words.test.ts` (the banned-word grep over `outing/words.ts` and the component's strings) |
| QC17 | `service.test.ts` over `fakePorts()` (no db write, no meta write); `meta.test.ts` unchanged |
| QC18 | `intents.test.ts` (a second fixture intent plans with no code change); a grep test that `planner.ts`/`plan.ts` hold no 'antiques' |
| QC19 | `presence.test.ts` (the class pair); `readers.golden.json` re-captured |
| QC20 | `plan.test.ts` (no position); journey (the capture stack on the page, with and without a walk) |
| QC21 | `dest.test.ts` (serialised destination holds no place name); `mapStyle.test.ts` (no POI label layer near a stop); journey picture |
| QC22 | `words.test.ts` (no ordinal, "of", remaining count in any string); journey (no glyph, accessible names) |
| QC23 | `arrival.test.ts` (the view calls no `feedback()`, notifier or accent token: a source grep) |
| QC24 | journey (one control, no badge or count text) |

The journey `outing` (new, `scripts/e2e/journeys/outing.js`) runs on the e2e's fake street grid; a loop needs a grid, as the planner's note
says, so the journey checks a loop on the grid and the `noLoop` sentence where it has one street. Journeys to run at the end: `outing`,
`planner`, `atlas`, `ready` and those `check:e2e` names. Native has never run on a device.

## Native, unverified (added to `docs/NATIVE_UNVERIFIED.md`)

The entry and the drawer over Explore's map on a phone; the arrival line while a route is followed; a loop's arrival with named stops;
presence's new class on a device's tiles.

## Deferred (and why)

Opening hours, admission and closing times (the owner, Nov 16: v1 says it does not know); other intents; a second kind of stop in one
outing; a time of day; a detour via a named stop; the walk screen showing the stops as slots; a find for a stop (shops are not marks).

## Screen actions (goal, how often, control, matrix row)

- **Start an antiques outing**: goal, plan a walk from here without choosing places; occasional, in front of Explore; a button worded
  "Antiques" with a shop icon, on Explore's map controls; opens a full-screen drawer (matrix: a primary action opens a page).
- **Loop / One way**: goal, shape the circuit; each outing; a two-state segmented control at the page's top (matrix: a choice of two
  is a segmented control).
- **Swap**: goal, "not this one"; occasional; a labelled text button on each slot (not an icon alone).
- **Tap a slot**: goal, see which shop; occasional; the slot is a button, opening a card.
- **Start**: goal, begin the walk; the page's bottom, as the planner's; a double tap starts one walk (planner audit 11).

Where the owner looks first: the entry on Explore, near the map's controls; Loop/One way and the slots at the top of the drawer; Start at its
foot. **Defaults taken that make a control quieter** (overrule any): the hours line is one plain line under the slots; the arrival name is a
chip, not a banner; Swap is text, not a button with ink.

## For the owner (the choices the code waits on)

1. **Where the entry lives.** Recommended: Explore, a control "Antiques" beside the map's controls. Alternatives: Navigate's ready screen beside
   Start; a row in "What I'm into".
2. **Loop first, with One way on the page, not remembered** (my reading of "choose each time"). The alternative asks Loop or One way before any
   proposal, which is two taps.
3. **Swap's limit.** Recommended: no wrap, and a place offered for a slot is not offered for it again, so Swap cannot be pressed round the town
   like a shop window (the steward's S2). The alternative keeps the wrap; names are still shown only on a tap.
4. **A new presence class `antiques` beside `boutique`** (no category of its own), so bars, marks and weights do not move. The alternative, a
   subset of Shops through the kind pipeline (0144), makes a "kind" the owner can switch in "What I'm into" and touches the atlas.
Settled, not a choice: **the steward's S1.** no name is stored; it is looked up from the tiles on arrival or on a tap. The cost is one
   tile read on the walk (the planner's `read`), and a name can differ if the tiles changed.
