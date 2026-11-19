# Places layer: plan

For the owner's review before any code (spec: `specs/places-layer/spec.md`, PL1-PL12). Nothing is built yet.

## Files to touch

| File | Change |
|---|---|
| `src/lib/layers/registry.ts` (core) | A `places` entry (name "Places to find", icon `help-circle-outline` or the map's "?" glyph, `defaultOn: true`, legend row "A place waiting to be found", `maps: ['explore']`); `LayerDef` gains `maps?: readonly ('explore' \| 'navigate' \| 'walk')[]` (absent = every map); `layersFor(map)` |
| `src/lib/layers/state.ts` (core) | nothing new: `decodeLayers` already reads a missing id as its default (PL8) |
| `src/components/LayersControl.tsx` (view) | `LayersControl` and `LayersKey` take `map` and list `layersFor(map)` (PL1, PL9, PL12) |
| `src/app/(tabs)/explore.tsx` (view) | `layers.on.places` gates `split` (pins and dots), `waitingDots`, `discoveries`, the out-of-town stars, `waitingSaid`; the card's `waiting` prop is dropped; MiniMap's `waiting` follows the switch (PL2-PL5, PL11) |
| `src/components/atlas/AtlasCard.tsx` (view) | the "Waiting to be found" section removed (PL7); `KindRow` gets a `smallFinds` flag from the screen (PL6) |
| `src/components/atlas/KindStrip.tsx` (view) | `KindRow` shows "none · small finds nearby" when told to (PL6) |
| `src/lib/atlas/atlas.ts` (core) | `smallFindKinds(steps, marks, found, hidden)`: the kinds whose step is 0 and which have an unfound, shown mark (PL6); `waitingKinds` stays for `waitingLabel` |
| `components/walk/useReady.tsx`, `app/walk.tsx`, `StartSettings.tsx` (views) | pass `map="navigate"` / `"walk"` (PL9, PL12) |
| `scripts/features.js` | `places-layer` in the explore feature's `specs` and, while built, in `IN_PROGRESS` |

No more than 8 source files; no hard stop. No new dependency, no data-model, migration or navigation change: the setting is the existing Layers setting, which reads a missing layer as its default.

## Data

None new. The Layers setting (meta, JSON of booleans) gains one key, `places`, read tolerantly. No SQLite migration, no IndexedDB version, no `ATLAS_CODE`, `ATLAS_OWN`, `SNAP_RULES` or `STREET_CODE` change (PL11).

## Tests per criterion

| Id | File and name |
|---|---|
| PL1, PL9, PL10, PL12 | `src/lib/__tests__/layers/placesLayer.test.ts`: `PL1/PL9: layersFor('explore') lists places, 'navigate' and 'walk' do not`; `PL10: the legend row names the "?" in words, no digit`; `PL12: LayersKey lists by map`, a source scan of the three hosts for `map=` |
| PL8 | same file: `PL8: a setting saved without places reads on; no other layer's choice moves; an off places survives encode/decode` |
| PL6 | `src/lib/__tests__/explore/smallFinds.test.ts` (core): `PL6: a kind at step 0 with an unfound shown mark is a small find; a lit kind, a found mark, a hidden subtype never` |
| PL2, PL3, PL4, PL5, PL11 | `src/lib/__tests__/explore/placesLayerGate.test.ts`: a source scan (TypeScript syntax tree, shown to fail on hand-written snippets: `performance.md`) that every producer of `split`, `waitingDots`, `discoveries`, `waitingSaid` and the stars is gated by `layers.on.places`; the pure part (`areaMapMarks` unchanged) holds PL2 |
| PL7 | the gate test above: no `Waiting to be found` or `atlas-waiting` left in `AtlasCard`; no digit-in-copy (existing WT8 scans stay green) |
| PL1, PL2, PL3, PL4, PL5, PL6, PL7 (what is seen) | the `layers` journey (`scripts/e2e/journeys/layers.js`): the panel on Explore lists the row; switching it off removes the "?", dots and the screen reader's button; the card has no waiting chips and the MiniMap no "?"; the kind row's phrase with a small place and the switch on, absent with it off |

The old chips' checks in the `carousel` and `marks` journeys (`atlas-waiting`) are found by grep and rewritten to the new section's absence.

## The testing's size

**Small** (`docs/TESTING.md`): one control and one removed section. Journeys: `layers` (new checks), and, by grep for `atlas-waiting` / "Waiting to be found", the journeys that name the removed chips (`carousel`, `marks`, possibly `atlas`), once each, as the removal calls for. About 3 journeys; the `layers` one runs alone until green first. The full flow only if you ask.

## Deferred, and why

- A "Found" layer: out (a find is a memory; the card's Found list stays).
- Reweighing small places: yours, decided (SP12, 0183).
- The phrase for a kind with a light place when the switch is off: nothing, on purpose (the card says nothing of places).

## Native

No native file changes. The `?` and dots are drawn by the same props as today. The panel row is shared UI; its first run on a phone is an item in `docs/NATIVE_UNVERIFIED.md` ("Do: open Layers on Explore, switch Places to find off. Expect: every ? and dot leaves the map, the card's picture too"). Never run on a device.

## Cost

Reads and writes: none new (PL11). With the switch off, the waiting pins, dots and stars are not computed, so the map does less. n: tens to a few hundred "?" (`performance.md`); per camera settle, as today. Harness: `scripts/perf-explore.js` is unaffected (nothing added); the cost is the same or lower. No `DEFERRED.md` entry applies.

## Actions, with where to look (goal to control)

| Goal | How often | Control | Matrix | Adjacent apps | Where the owner will look first |
|---|---|---|---|---|---|
| Hide or show the places waiting | rare, from the map | A switch row in the Layers panel | matrix: a map's content options are a panel of switches (as Walkability) | Google Maps chips, AllTrails filters (spec) | the Layers button on Explore, top right; the panel; "Places to find", in ink, with an icon and the switch like its neighbours |
| Learn why Art says none yet a "?" shows | once | the words on the kind row, "none · small finds nearby" | words on the row, no control | none found | the card's Art row |

## Against precedent

Where we depart from every adjacent app: none keep "what is waiting" by kind on an area's summary, so the removal of the chips follows them. Where we depart: the layer is **on by default**, while the other layers are off to keep the map clear (ML, the owner, Nov 5). Reason: the "?" are the invitation to explore and the map shows them today.

## Defaults I took, for you to overrule

1. **On by default** (quieter alternative: off, so the map starts bare; it hides today's invitation).
2. **MiniMap follows the switch** (alternative: it keeps its "?" as the area's picture).
3. **The wording** "none · small finds nearby" (muted, same line as "none", never in the dots' place); the alternatives are no phrase at all, or "a little" in place of "none".
4. **The legend row** says "A place waiting to be found", with the "?" as its swatch.
5. The phrase shows only while the switch is on.
