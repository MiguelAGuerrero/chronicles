# Plan an outing: plan (QC1-QC42)

Written 2026-11-16 (second version, after the owner's reframe), for the owner's review before any code. It reuses the walk planner (0102)
and the places archive's reader pattern (0103, 0108) and adds no second planner and no second map.

## The idea in one paragraph

The planner already turns points into an ordered loop or one-way route (`fitOrder`, the legs, the ceiling and retrace rules, `destFor`,
`PlannerCapture`, the drawer shell). It lacks stops that are single places, a way to say what you want, a store dataset, a swap, and a late
name. This slice adds an `outing/` folder: a vocabulary table (`wants.ts`), a stores adapter with an in-memory source and a tiles fallback,
a picker and planner over them, one page, and one walk-screen chip. Nothing is stored. The store pack itself is built elsewhere
(`handoff.md`).

## Files

New, `src/lib/outing/` (each starts with `// @layer`):

| File | Layer | Holds |
|---|---|---|
| `candidates.ts` | core | `Candidate` (id, at, facets by dimension), `Want` (id, label, aliases, `match`, `slotWord`), `matches(want, candidate)`: across dimensions all, within one any (QC37, QC38) |
| `wants.ts` | core | `WANTS`: the table, Antiques and Books (`what: antiques`, `what: books`); `matchWants(query)` over label and aliases only (QC2, QC4, QC5) |
| `stores.ts` | core | `Store` (id, name, at, facets, src), the contract's `DIMENSIONS` (v1: `what` and its closed list), `isStore` (rejects any other field), `asCandidate` (QC11, QC12, QC40) |
| `storesRead.ts` | adapter | the only file that knows the pack's schema (as `archivePois.ts`): `storesFromPack`, and `StoresSource` with an in-memory source (QC14) |
| `storesMerge.ts` | core | the pack's stores and the tiles' shop places into one list: chains out, one place within 200 m for the same name and kind (QC13, QC15) |
| `pick.ts` | core | `pickStops(candidates, wants, from, ceilingM, offered)`: the candidates the picked wants match, ordered by position only; the tie rule; no quota per want (QC7-QC9) |
| `plan.ts` | core | `planOuting(input, leg)`: picks, orders with the planner's `fitOrder`, loop or one way, the ceiling and the retrace rule; reasons (`noPosition`, `few`, `noRoute`, `noLoop`, and the wants with none) (QC6-QC10, QC30, QC36) |
| `swap.ts` | core | `swapStop(plan, i, stores, offered)`: nearest other of the same want, not held, not offered for that slot; none says so; no wrap (QC21) |
| `words.ts` | core | slot line, distance-on words, the hours line, the reasons; banned-word grep (QC17, QC20, QC25, QC28) |
| `dest.ts` | core | `outingDest(plan)`: a `Waypoint` like `destFor` (`via`, `path`, `suggested`, `loop`), positions only (QC22, QC24) |
| `arrival.ts` | core | `stopWithin(dest, fix, said)`: which stop is within 60 m, once (QC19) |
| `settings.ts` | core | `DEFAULT_CHAINS` (off) and `isChainsPref` (QC41) |
| `prefs.ts` | shell | `createOutingPrefs(ports)`: the one switch, "Include chains", in meta `outing_chains` (as `kindWalk/prefs.ts`); a Store the page reads (QC41) |
| `service.ts` | shell | `createOutingService(deps)`: reads the tiles and the pack around the walker (the planner's `read` plus `StoresSource`), calls `planOuting`; resolves a stop's name on a tap and on arrival; keeps nothing (QC24, QC29) |
| `useOuting.ts` | view | the hook the page calls |

Touched:

- `src/lib/walkPlanner/planner.ts`: export `fitOrder` (one word) and nothing else.
- `src/lib/presence/presence.ts`: `shop/antiques` gives `['boutique', 'antiques']`; `PresenceClass` gains `antiques` (weight and storefront as `boutique`, no category, so bars and marks cannot move); `PRESENCE_CODE` bumped, `PRESENCE_CARRIED` set only if the readers' golden shows nothing derived changed; Overture's antiques the same (QC16). The goldens are re-captured and listed in the spec.
- `src/lib/discovery/chains.json` (data): Goodwill, Salvation Army, Savers, Value Village, Half Price Books and Books-A-Million join the `shops` list, so `isChain` knows them; shops are never marks, so no derived data changes (checked by the goldens).
- `src/lib/meta.ts`: `outing_chains` (owner `outing`, `onOff`), the slice's one new key (QC29, QC41).
- `src/lib/discovery/archiveManifest.ts`: the manifest may name a stores pack per region (`stores` beside `archive`); absent in older manifests, as `hashes` was (QC14). The pack is read by tile through `net/tileReader`.
- `src/lib/nav/useNavigation.ts` (or the walk screen's chip row): the arrival chip, from `arrival.ts` and the service (QC19, QC26).
- The page's `WalkMap` and the walk's map: the basemap's shop and POI labels dropped near a stop (QC24). Whether `WalkMap` can filter its basemap labels is the first thing to check at test-first; if it cannot, the page draws the route on a style without POI labels and the walk's map is a native, unverified gap in `docs/DEFERRED.md`.
- `src/components/outing/OutingDrawer.tsx`: the planner's drawer shell (`useHideTabs`, `PlannerCapture`, `WalkMap` with the proposal), the search box and chips, Loop/One way, the slots with Swap, the hours line, Start. `RouteRows` is not used: there is one proposal.
- `src/app/(tabs)/explore.tsx`: the entry control ("Plan an outing"), `outingOpen`, and the map stepping aside as the planner's does (NV4).
- `scripts/features.js`: a feature `outing` (source `src/lib/outing/**`, `src/components/outing/**`, journey `outing`, spec `quick-circuit`); the spec stays in `IN_PROGRESS` while built.
- `.claude/rules/outing.md` (new, `paths:` the folder, decision 0173), `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/decisions/` (the owner's record, below), `specs/quick-circuit/handoff.md` (the build's side).

## Data

No new truth, cache, meta key, store, SQLite migration or IndexedDB version (QC29). The proposal is recomputed on open. The stores pack is a
static file read by tile from the pages site the archive already uses; a failed read falls back to the tiles. The only change at rest is
presence's class (a code, not a schema); `PRESENCE_CODE` makes atlas and landing rows read again, as every presence change does.

## Tests, one per criterion (`src/lib/__tests__/outing/`, ids in the names, todo first)

| Id | Test (file) |
|---|---|
| QC1 | journey `outing`: the control on Explore, its word; one tap opens the page; picking an entry gives a proposal. The cold find: the `ux-reviewer`, given the picture and "plan an outing for antiques from where you are" |
| QC2 | `wants.test.ts` (alphabetical; typing narrows by label and aliases only, picks nothing; no match shows nothing and stores nothing); journey |
| QC3 | `plan.test.ts` (loop first; One way replans; no `fakePorts` meta write); journey |
| QC37-QC40 | `candidates.test.ts` (a fixture `how` dimension and a murals source plan with no code change; across narrows, within widens; an unknown dimension or value is ignored); journey (the first screen is the same with the fixture dimension) |
| QC41 | `prefs.test.ts` over `fakePorts()` (off by default; kept in `outing_chains`; read on load; a failed write leaves the store changed); `storesMerge` test (off excludes a chain, on includes it, a mark is never made of it); journey (the switch, default off) |
| QC42 | `wants.test.ts` (Thrifting matches second_hand, antiques, vintage; Antiques only antiques; with Books it widens); `stores.test.ts` (the three values are in the contract) |
| QC4 | `wants.test.ts` (a fixture entry plans with no code change; no field orders or weights); a grep that `plan.ts`/`pick.ts` hold no entry word |
| QC5 | `wants.test.ts` (the banned-word grep over labels and aliases) |
| QC6 | `plan.test.ts` (one proposal); journey (one route, no rows) |
| QC7 | `pick.test.ts` (two wants, the second far: plans, nothing said of the second); `words.test.ts` |
| QC8 | `plan.test.ts`, `words.test.ts` |
| QC9 | `pick.test.ts` (same inputs, same plan; the tie rule; a rating-like fixture field changes nothing) |
| QC10 | `plan.test.ts` on `__tests__/walk-planner/grid.ts` (hard ceiling; retrace a tenth; one-way ends at its last stop; a loop where it began) |
| QC11 | `stores.test.ts` (`isStore` rejects each forbidden field); `storesRead.test.ts` |
| QC12 | `storesRead.test.ts` (nothing read from a rating, count or popularity field; a fixture pack with them is read without them) |
| QC13 | `storesMerge.test.ts` |
| QC14 | `storesRead.test.ts` (the in-memory source; a failing read leaves the tiles); `archiveManifest` test (an old manifest without `stores`) |
| QC15 | `storesMerge.test.ts` (the pack wins by rule against a popular-looking fixture) |
| QC16 | `presence.test.ts` (the class pair); `readers.golden.json` re-captured |
| QC17-QC20 | `words.test.ts`; journey (no name in the page's text or accessible names; a tap shows the card; the hours line once) |
| QC19 | `arrival.test.ts` (within 60 m, once, none beyond) |
| QC21 | `swap.test.ts` (nearest other, not held, not re-offered, none says so, no wrap) |
| QC22, QC23 | `dest.test.ts` (shape equals `destFor`'s; `suggested`; Walk me back reads no `via`) |
| QC24 | `dest.test.ts` (serialised destination holds no place name); `mapStyle.test.ts` (no POI label layer near a stop); journey picture |
| QC25 | `words.test.ts` (no ordinal, "of", remaining count in any string); journey (glyphs and accessible names) |
| QC26 | `arrival.test.ts` (a source grep: no `feedback()`, notifier or accent token in the chip) |
| QC27 | journey (one control, no badge or count text) |
| QC28 | `words.test.ts` (the banned-word grep over `outing/words.ts` and the component's strings) |
| QC29 | `service.test.ts` over `fakePorts()` (no db write, no meta write, no pack read before a pick, the request holds the tile path only); `meta.test.ts` unchanged |
| QC30, QC36 | `plan.test.ts` (no position); journey (the capture stack while a walk records, none with no walk; Start disabled with its reason) |
| QC31 | `isolation.test.ts` (a grep over the importers of `outing/stores*`; `isMarkable` and the archive adapters read no store) |
| QC32, QC33 | the cold find (`ux-reviewer`); `words.test.ts` (whole words) |
| QC34, QC35 | `words.test.ts`; `plan.test.ts` |

The journey `outing` (new, `scripts/e2e/journeys/outing.js`) runs on the e2e's fake street grid with a fake stores pack served at
`EXPO_PUBLIC_PLACES_BASE`; a loop needs a grid, so the journey checks a loop there and the `noLoop` sentence where there is one street.
Journeys at the end: `outing`, `planner`, `atlas`, `ready` and those `check:e2e` names. Native has never run on a device.

## Native, unverified (added to `docs/NATIVE_UNVERIFIED.md`)

The entry and the drawer over Explore's map on a phone; the arrival chip while a route is followed; a loop's arrival with several stops; the
basemap's POI labels dropped near a stop; the stores pack's tile read on a device.

## Deferred (and why)

Opening hours, admission, closing times (the owner: v1 says it does not know); further vocabulary entries; other kinds of place in the same
outing; a time of day; a detour via a named stop; the walk screen showing the stops as slots; a find for a stop (shops are not marks); the
stores pack, which is chronicles-data's (`handoff.md`).

## Screen actions (goal, how often, control, matrix row)

- **Plan an outing**: goal, get a walk from here without choosing places; occasional, in front of Explore; a button worded "Plan an outing"
  with a compass icon in the map controls' style; opens a full-screen drawer (matrix: a primary action opens a page).
- **Describe**: goal, say what I want to see; each outing; a search box above chips (a short list of choices is chips; the box narrows them).
- **Loop / One way**: goal, shape the circuit; each outing; a two-state segmented control under the chips.
- **Swap**: goal, "not this one"; occasional; a labelled text button on each slot (never an icon alone, never a shop's name).
- **Tap a slot**: goal, see which shop; occasional; the slot is a button opening a card.
- **Start**: goal, begin the walk; the page's foot, as the planner's; a double tap starts one walk (planner audit 11).

Where the owner looks first: the entry on Explore, near the map's controls; the search box and chips at the top of the drawer; Start at its
foot. **Defaults taken that make a control quieter** (overrule any): the hours line is one plain line under the slots; the arrival name is a
chip, not a banner; Swap is text, not an inked button; v1's vocabulary has two entries, so the chips are two.

## For the owner

1. **Settled by the owner's Nov 16 message, recorded as decision 0194 (drafted, for the owner to confirm):** shops are presence, never points of interest;
   the stores pack ships; Books second; the engine extensible to dimensions. What follows is the question as first asked, kept for the record: a shop enters this layer by what it sells and by
   nothing a crowd says, amending 0115's "ordinary shops stay out" and 0044 for this layer and for `outing/` only (QC31); the vision's Shapes
   table gains a line for outings. Is "one layer, outing only" a lasting line or the start of a wider shift? Without the record the slice
   runs on the tiles alone and QC11-QC15 and QC31 are deferred.
   **Also yours:** the steward's silences: "describe what you want" is one bounded, unsaved planning step (the vision may call outings its one
   sanctioned plan), and a third or fourth entry would risk a shop directory (the plan ships two).
2. **The second vocabulary entry** is Books (a bookshop is a specialism OpenStreetMap tags and a shop 0127's code already files with
   boutiques). Another entry is a one-row change.
3. **The pack is chronicles-data's**: a contract, a source list and a handoff note are in `handoff.md`; the app side works on the tiles and
   an in-memory pack until a pack is published.
