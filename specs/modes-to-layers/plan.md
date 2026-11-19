# Modes to layers: plan

For the owner's review before any code (spec: `specs/modes-to-layers/spec.md`, MD1-MD16; decision 0231). Nothing is built yet. This is a flow-sized change on the walk screen, so it is larger than a fix: roughly 14 source files.

## What changes, in one paragraph

A walk is no longer quiet or exploring. `exploring` on the walk screen becomes "Places is on" (the walk's own layers setting); the start drawer's Mode control and the walk's Explore switch go; the "?" range and the pocket alert hang off Places; the strip chip off Storefronts; the replay's passed lines start at the first time Places was turned on in that walk (the `explored:<walk>` stamp, written then, as it is written now when Explore is first switched on). Layers are saved per kind of map.

## Files to touch

| File | Change |
|---|---|
| `src/lib/layers/registry.ts` (core) | `places` is listed on every map (`maps` dropped; PL9 amended, MD13); `defaultOn` becomes per kind of map |
| `src/lib/layers/state.ts`, `shell.ts`, `useLayers.ts` | two stores of one shape: `map_layers` (Explore and the ready map; Places on) and `walk_layers` (the live walk; every layer off); `useLayers(kind)` (MD10) |
| `src/lib/meta.ts` | declare `walk_layers`; `explore_walk` and `start_mode` leave `META` (their rows are left unread, MD12) |
| `src/app/walk.tsx` | `exploring` becomes `placesOn` from `useLayers('walk')`; the "This walk" Explore row and `setExplore` go (the first-on stamp moves to a layer change handler); strip chip from Storefronts; `summaryLabel` loses "exploring" (MD2-MD5) |
| `src/lib/explore/useExplore.ts`, `explore.ts` | the `exploring` option is `placesOn`; `pocketAlert` and `armedStill` read it; storefront reads `remember` when Places or Storefronts is on (MD4, MD5, MD7) |
| `src/lib/startPlan.ts`, `useStartWalk.ts` | no mode in the start meta; `StartMode`, `parseStartMode` and `START_MODE_KEY` go (MD12) |
| `src/lib/ready/shell.ts`, `src/components/walk/useReady.tsx` | no mode; the ring follows Places on the ready map (MD11) |
| `src/components/StartSettings.tsx` | the Mode radiogroup goes; the range row follows Places; "Passing a place" always; "What I'm into" row with Places or Sights (MD2, MD6) |
| `src/components/LayersControl.tsx` | the panel and key take the kind of map, not per-map lists (MD13) |
| `src/lib/summary.ts` | unchanged rule: it reads `explored:<walk>`; no derivation bump (MD9) |
| `src/app/(tabs)/explore.tsx` | `useLayers('map')` (MD10) |

More than the usual eight: the owner's own call to take the mode out of the walk (decision 0231), so this is a slice, with this plan as its review.

## Data

- **New:** one meta key `walk_layers` (JSON of booleans, same shape as `map_layers`). No SQLite migration, no IndexedDB version.
- **Retired, never deleted:** `explore_walk` and `start_mode` rows are left in place and unread; `explored:<walk>` and `walk_pass:<walk>` keep their meaning (passes counted since, and the distance used).
- **Truth untouched** (MD14): walks, trace points, captures and finds are not changed. No `SNAP_RULES`, `STREET_CODE`, `LANDING_CODE` or `ATLAS_CODE` bump: the replay's rule is the same function over the same stamp.

## Tests per criterion

| Ids | File and name |
|---|---|
| MD1, MD13 | `src/lib/__tests__/layers/modesToLayers.test.ts`: `MD1/MD13: every map lists Places`; `MD13: the walk's key lists the layers on for the walk's own setting` |
| MD10 | same file: `MD10: map_layers and walk_layers are separate; the walk starts all off; a setting saved before reads as before for the map`; a shell test over `fakePorts()` (`createLayers`), a write on one never moves the other |
| MD2, MD12 | `src/lib/__tests__/tabs/startPlan.test.ts` (changed: no mode in the plan, no `explore_walk` or `start_mode` written) and a source scan: no `exploring`, `Quiet` or `START_MODE_KEY` in the views |
| MD3, MD4, MD5, MD6, MD7, MD8, MD11, MD16 | `src/lib/__tests__/explore/placesOnWalk.test.ts`: the pure decisions (`pocketAlert`, `armedStill`, `visibleMarks` take `placesOn`), and the `walk` and `ready` journeys for what is seen |
| MD9 | `src/lib/__tests__/explore/passedByLayer.test.ts` (core): the stamp is written once when Places first turns on; `passedAlong` since that time; no stamp, none; an old walk's replay unchanged (a fixture) |
| MD14 | the existing recorder, trace and `readTrace` suites stay green unchanged; a source scan that no file under `recorder/` or `rides.ts` changed |
| MD15 | the existing WT8 and PL7 scans, run over the walk and ready screens |

A new journey `modes` (`scripts/e2e/journeys/modes.js`) holds the checks MD1-MD7 and MD11 on the web build.

## The testing's size (decision 0223)

**Flow.** The journeys that name what is removed or renamed, found by grep (`explore-walk`, `mode-explore`, `mode-quiet`): `walk` (8 hits), `ready` (7), `into` (5), `tabs` (5), `launch` (2), `days` (1), plus `nudge`, `marks`, `complexes`, `curiosities`, `small-places` and `subtypes` for the "?" they set up through Explore mode. The new `modes` runs alone until green, then these once each at the end, three at a time with `npm run e2e:batch`: about 25-30 minutes. The full flow only if you ask.

## Cost

- **Reads and writes:** no new read. The walk already builds its checklists on every walk; the marks are computed only while Places is on, which saves work on a walk with it off. One more meta write when Places first turns on in a walk (the stamp, as now).
- **n and when:** the "?" and range only while Places is on, per fix as now; no per-frame work added.
- **Harness:** `scripts/perf-walk.js` with Places off (the default) and on, before and after; the report gives both numbers. Native cost is device only.

## What is deferred

- A kind-level "What I'm into" per walk: it stays the one saved setting.
- Removing the stale `explore_walk` and `start_mode` rows from stores: left alone, unread.

## Native

The walk screen, the start drawer and the ready map are shared views; no native module changes. The walk's new Layers rows, and the strip chip and "?" on a phone, have never run on a device: items for `docs/NATIVE_UNVERIFIED.md`.

## Actions, with where to look first (goal to control)

| Goal | How often | Control | Matrix | Adjacent apps | Where you will look first |
|---|---|---|---|---|---|
| Show places on the walk's map | now and then, on the move | the Layers button's switch, "Places" | switch in a list row (matrix 14) | AllTrails layers before and during a recording (spec, unverified) | the Layers button on the walk map |
| Show the storefront street's chip | rarely | the "Storefronts" switch | the same | the same | the same panel |
| Set how far a "?" shows | rarely | the range slider in the walk's options, while Places is on | slider in settings | none found | "Walk settings", where it is now |
| Buzz when a place is near | rarely, a setting | "Pocket alert" in "Reminders and alerts" (off) | switch in settings | none found | "Reminders and alerts", where it is |

## Against precedent

Where we depart from every adjacent app: none keeps a quiet walk, so the quiet default is ours (a Never line is not involved; it is decision 0031's own, kept). Reason: the live walk is the capture surface (Always: capture one tap away; restraint).

## Defaults I took, for you to overrule

1. **Two stores, `map_layers` and `walk_layers`** (the alternative is one store with a per-map default table).
2. **`explore_walk` and `start_mode` retired** but their stored rows left unread (the alternative is removing them in a migration).
3. **The replay counts what a walk passed from the first time Places is turned on during it** (the alternative: from the start of every walk, which changes what a quiet walk's replay says).
4. **The walk's panel lists the same layers as Explore's**, Places and Storefronts included, in the same order.
5. **The "Found:" announcement** shows only while Places is on (a find on a walk with it off is kept and shown in the replay, nothing on screen), as a quiet walk's find is now.
