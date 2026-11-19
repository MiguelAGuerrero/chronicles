# Modes to layers: plan

For the owner's review before any code (spec: `specs/modes-to-layers/spec.md`, MD1-MD19; decision 0234). Nothing is built yet. This is a flow-sized change on the walk screen, so it is larger than a fix: roughly 14 source files.

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
| `src/lib/summary.ts`, `explore.ts` `passedAlong` | passes counted within `places_spans:<walk>`; a walk with only `explored:<walk>` reads as before; no derivation code bump (computed at replay, never cached) (MD9) |
| `src/lib/db/sqliteStore.ts`, `src/lib/db/index.web.ts` | `deleteWalk` removes the two new families (MD10) |
| `src/app/(tabs)/explore.tsx` | `useLayers('map')` (MD10) |

More than the usual eight: the owner's own call to take the mode out of the walk (decision 0234), so this is a slice, with this plan as its review.

## Data

- **New:** two meta families, `walk_layers:<walk>` (JSON of booleans, the walk's own layers; removed with the walk) and `places_spans:<walk>` (the start and end times Places was on; MD9). No SQLite migration, no IndexedDB version. `deleteWalk` (`sqliteStore.ts`, `index.web.ts`) removes both, as it removes `explored:<walk>`.
- **Retired, never deleted:** `explore_walk` and `start_mode` rows are left in place and unread; `explored:<walk>` and `walk_pass:<walk>` keep their meaning for walks recorded before this slice (passes counted since; the distance used); a new walk's passes are read from `places_spans:<walk>`.
- **Truth untouched** (MD14): walks, trace points, captures and finds are not changed. No `SNAP_RULES`, `STREET_CODE`, `LANDING_CODE` or `ATLAS_CODE` bump: the replay's rule is the same function over the same stamp.

## Tests per criterion

| Ids | File and name |
|---|---|
| MD1, MD13 | `src/lib/__tests__/layers/modesToLayers.test.ts`: `MD1/MD13: every map lists Places`; `MD13: the walk's key lists the layers on for the walk's own setting` |
| MD10 | same file: `MD10: map_layers is shared by Explore and the ready map; walk_layers:<walk> starts all off for every walk, survives a resume, goes with deleteWalk, and never reaches the next walk; a setting saved before reads as before for the map`; a shell test over `fakePorts()` (`createLayers`) |
| MD2, MD12 | `src/lib/__tests__/tabs/startPlan.test.ts` (changed: no mode in the plan, no `explore_walk` or `start_mode` written) and a source scan: no `exploring`, `Quiet` or `START_MODE_KEY` in the views |
| MD3, MD4, MD5, MD6, MD7, MD8, MD11, MD16 | `src/lib/__tests__/explore/placesOnWalk.test.ts`: the pure decisions (`pocketAlert`, `armedStill`, `visibleMarks` take `placesOn`), and the `walk` and `ready` journeys for what is seen |
| MD9 | `src/lib/__tests__/explore/passedByLayer.test.ts` (core): passes only inside the spans Places was on; none without a span; a toggle after the walk adds none; an old walk with only `explored:<walk>` reads as before (a fixture) |
| MD8 | `src/lib/__tests__/explore/placesOnWalk.test.ts`: `canArm`/arming needs a "?" card, so none with Places off; a shell test: plain capture finds nothing and is unchanged |
| MD17, MD18, MD19 | the same file (the storefront `remember` option follows Places or Storefronts; the Into row; the copy scan) |
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

## Triage of the steward's findings (S1-S7)

- **S1 (breach), accepted:** the live walk's layers belong to the walk and start off every time (MD3, MD10). The "two stores" default became a per-walk family.
- **S2, accepted:** passes are counted only within the spans Places was on (MD9); a quiet stretch stays quiet. The kinds read at replay are not frozen, as today (deferred; `walk_pass` freezes the distance only).
- **S3 (breach), accepted and verified in the code:** a find needs Capture here from a "?" card, and the armed line shows only while exploring, so MD8 now says a find needs Places on.
- **S4, accepted:** MD16 covers the armed line, the Found line and the open panel, plain ink.
- **S5, accepted:** MD19 (no copy of what is left; the ring only while previewed).
- **S6, accepted:** MD6, MD7, MD17, MD18; the home Explore button does not exist in the code today.
- **S7, noted** in the spec: nothing in the precedent supports "?" on the move.

## Defaults I took, for you to overrule

1. **The live walk's layers are per walk** (`walk_layers:<walk>`), not a saved setting of their own.
2. **Passes count only within the spans Places was on** (the alternative: from the first time it was turned on, simpler, but a stretch with it off would read as exploring).
3. **The pocket alert needs Places on** (it buzzes for a nearby "?"; with no "?" there is nothing to buzz about) and its row says so. The alternative: it works on its own over the same nearby places without drawing them.
4. **The range slider is always in the walk's options**, labelled for Places.
5. **The "Found:" line shows only while Places is on**, which is the only time a find can happen.
6. **`explore_walk` and `start_mode` retired**, their rows left unread.
