# Presence and kinds: the plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/presence-and-kinds/spec.md` (PK1-PK17).

## The idea in one paragraph

Kinds stay the switches; the bars become a grouping over them that a place may belong to twice. One pure function,
`barsOf(place)`, says which bars a place lights: its own category, plus History for a museum or gallery the data already
calls historic (the archive's `museum` class, which only a listing produces, or a name word from `notable.json`). The
atlas's bars and the planner both read it, so a lit bar always has places to route through. The planner chooses its
cells from the places you pass when there are enough of them. A new kind, Community spaces, takes community centres
(by name only), arts centres and libraries.

## Files

| File | Layer | Change | Criteria |
|---|---|---|---|
| `src/lib/discovery/types.ts` | core | `Kind` gains `community`; `Place` gains optional `alsoBars?: CategoryId[]`, set only by the archive adapter, never stored (archive places are never cached, PW1) | PK1, PK11 |
| `src/lib/discovery/bars.ts` (new) | core | `barsOf(place)`: `[category]`, plus `history` for kind `museums` when `alsoBars` holds it or `notableName(name)`; `PASS_BY` kinds and `passesBy(place)` | PK1-PK3, PK9 |
| `src/lib/discovery/archivePois.ts` | core | `ARCHIVE_ALSO = { museum: ['history'] }`, applied in `archivePlace`; the class table itself unchanged (no listing named, RP11) | PK1, PK16 |
| `src/lib/discovery/tilePois.ts` | core | `town_hall/community_centre` → culture, by name (in `MARK_BY_NAME` through its class); `kindFor` reads the subclass: `arts_centre`, `library` → `community`; `museum`, `gallery`, `art_gallery` → `museums` | PK11-PK14 |
| `src/lib/explore/explore.ts` | core | `KINDS` gains `{ id: 'community', label: 'Community spaces', icon: 'people-outline' }` (label for the owner), after Theatres | PK11, PK16 |
| `src/lib/atlas/atlas.ts` | core | `presenceSteps` counts by `barsOf`, once per bar per key; `ATLAS_CODE` a8; `CARRIED` emptied (the bars change at every level) | PK1-PK7 |
| `src/lib/walkPlanner/service.ts` | shell | the opened bar's places by `barsOf`; cells from `passesBy` places when they make `MIN_CELLS`, else all; exposure from all; `alsoPasses` by `barsOf` | PK8-PK10, PK17 |
| `scripts/places-coverage.ts` | script | `--gate` mode: per named area, the listed places held back for want of a sign they are open (by name) and History/Culture apart in words; never `%` | PK15 |
| `scripts/fixture-presence-sample.mjs` (new) | script | records the 152-area sample (seeded, the same draw as Nov 10): each ring's tile POIs and the Wikidata rows chronicles-data's classifier admits, as the adapters receive them | PK5 |
| `src/components/atlas/kinds.ts`, `ExploreSettings.tsx` | view | nothing expected: the switches list `KINDS`; the kind's icon comes from `KINDS` | PK11 |

No change in chronicles-data: its `museum` class and contract stay as they are.

## Data

- **No migration.** `alsoBars` lives only on archive places, which are never written to a store. A map museum's History
  comes from its name at read time. `checklist_item.kind` is text, so `community` needs no schema change; the IndexedDB
  store keeps whole objects.
- **Cache:** `atlas_area` rows recompute through `ATLAS_CODE` a8 with `CARRIED` emptied (PK7). Checklists are rebuilt by
  the existing build and archive checks; an arts centre already on a kept checklist keeps its old kind until its area is
  rebuilt (kept data, never patched).
- **Saved switches:** `explore_hidden` stores the kinds switched off, so `community` starts on (PK11).
- **Fixtures** (real data, recorded by script, never by hand): `__tests__/explore/presenceSample.json` (the 152 areas,
  about 400 KB expected; trimmed to the five findable categories), and `presenceTowns.json` (Coplay, Galena, Andalusia,
  Philadelphia's Old City: tiles' POIs, archive rows built from frozen Wikidata rows through the app's `archivePlace`).

## Tests (each written first as a todo)

| Ids | File |
|---|---|
| PK1-PK7, PK11-PK14, PK16, PK18, PK19 | `src/lib/__tests__/explore/presence.test.ts` (fixtures `presenceTowns.json`, `presenceSample.json`, recorded by `scripts/fixture-presence.mjs`) |
| PK8-PK10, PK17 | `src/lib/__tests__/walk-planner/presence.test.ts` (the planner's street grid) |
| PK15 | `src/lib/__tests__/explore/placesCoverage.test.ts` |

Each test is named by its id. The tests go through the existing entry points (`ringOf`, `placesFromTilePois`,
`archivePlace`, `createPlanner`, `parseHidden`, `rowCurrent`), so the todos type-check before any code exists.
PK18 adds a second argument to `parseHidden`: the kinds known when the choice was saved (meta `explore_kinds_known`,
written by `saveSettings`), so a choice saved before Community spaces existed follows Museums and galleries, and one
saved since is the walker's.

Red before: PK1, PK2, PK4, PK6 (Coplay's History 0; no museum lights History alone), PK7 (a7 rows current), PK8 ("few"), PK9 (one place you pass:
"few"), PK10 (only Culture along the route), PK11-PK14 (no kind), PK15 (no report), PK16 (no Community spaces), PK18
(the switch not followed), PK19 (the contract's notes). PK5 waits on its fixture, and holds today; PK3 and PK17 hold today
and pin what must not change. Each todo still runs first.

No e2e journey changes: the screens show the same dots and the same switch list from `KINDS`. `npm run check:affected`
will name the `atlas`, `grading`, `marks`, `planner` and `walk` journeys (they cover the files); they run once at the end.
The `walk` journey checks `kind-churches` in the switches, which stays.

## Deferred

- **Plazas and art walkways:** no data the app reads holds them (0117: no data fetched only to sort a place).
- **Food and Parks are lit in most areas**, and Food wherever nearly any other bar is: they say little when lit. A
  question for the owner, not this slice.
- **The planner ignores "What I'm into"** (today, before this slice): a History route may pass a museum the walker
  switched off. Whether 0115's "kinds shape Explore, Navigate and the kind walk" covers the planner's cells is the
  owner's question (steward, silent 1).
- **The gate itself** (chronicles-data's RD8): PK15 measures it once a v2 archive publishes; changing it is the owner's
  call on 0109.
- **The live archive is still v1** (the manifest is unchanged since Nov 10 05:35): PK1 and PK6 test the rule with frozen
  fixtures; on the phone the Kilns show only after a v2 archive publishes.

## Native

Nothing native is new. The planner and the bars are core and shell code that runs the same on both platforms; the
switch list is the existing view. Native remains unverified as before (`docs/NATIVE_UNVERIFIED.md` gains no item).

## Steward

Read Nov 10: three drifts and one tone finding, no breach; the gate's four criteria carried and testable.

| # | Finding | Triage |
|---|---|---|
| 1 | History for an archive museum means "listed" through a fact the app doesn't own; if chronicles-data admits museums another way, History changes meaning unnoticed | **Accepted**: PK19. The pinned contract's README names PK1; a new contract version already fails PP17, which is where the rule is revisited |
| 2 | The new kind brings back libraries and arts centres a walker hid by switching off Museums and galleries | **Accepted**: PK18; `community` starts off when the saved choice has `museums` off (`settings.ts` reads it once, on load) |
| 3 | PK8 as written promises a route through one place, calling it dense | **Accepted**: PK8 reworded; "few" stays honest below `MIN_CELLS` |
| 4 | The deferred note gave percentages | **Accepted**: in words |
| silent 1 | The planner ignores "What I'm into" | To the owner (Deferred) |
| silent 2 | Parks in `PASS_BY` | Kept: Green holds only parks, so no bar's lean changes; a park is walked through |
| silent 3 | Culture has no places you pass, so PK9 never applies to it | Kept: Culture's routes stay as today; murals stay in Art (the owner's "art walkways, murals" are Art's places you pass) |

Tests added: PK18 (`__tests__/explore/explore.test.ts`, `PK18: a saved choice with Museums and galleries off leaves
Community spaces off`); PK19 (`__tests__/explore/placesContract.test.ts`, `PK19: the pinned contract's notes name PK1
for the museum class`).

## For the owner (answered Nov 10)

1. The kind's label: **"Community spaces"**.
2. The lean: **places you pass choose the cells when they make the minimum**, else all the bar's places.
3. A plain community centre: **not a place to find**; only a notable name makes it one.
