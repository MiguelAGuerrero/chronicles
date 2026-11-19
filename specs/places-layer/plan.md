# Places layer: plan

For the owner's review before any code (spec: `specs/places-layer/spec.md`, PL1-PL12). Nothing is built yet.

## Files to touch

| File | Change |
|---|---|
| `src/lib/layers/registry.ts` (core) | A `places` entry (name "Places", icon `help-circle-outline` or the map's "?" glyph, `defaultOn: true`, legend row "A place waiting to be found", `maps: ['explore']`); `LayerDef` gains `maps?: readonly ('explore' \| 'navigate' \| 'walk')[]` (absent = every map); `layersFor(map)` |
| `src/lib/layers/state.ts` (core) | nothing new: `decodeLayers` already reads a missing id as its default (PL8) |
| `src/components/LayersControl.tsx` (view) | `LayersControl` and `LayersKey` take `map` and list `layersFor(map)` (PL1, PL9, PL12) |
| `src/app/(tabs)/explore.tsx` (view) | `layers.on.places` gates `split` (pins and dots), `waitingDots`, `discoveries`, the out-of-town stars, `waitingSaid`; the card's `waiting` prop is dropped; MiniMap's `waiting` follows the switch (PL2-PL5, PL11) |
| `src/components/atlas/AtlasCard.tsx` (view) | the "Waiting to be found" section removed (PL7) |
| `src/lib/atlas/atlas.ts` (core) | `MARKS_EXPLAINED` gains one sentence (PL6); `waitingKinds` stays for `waitingLabel` |
| `components/walk/useReady.tsx`, `app/walk.tsx`, `StartSettings.tsx` (views) | pass `map="navigate"` / `"walk"` (PL9, PL12) |
| `scripts/features.js` | `places-layer` in the explore feature's `specs` and, while built, in `IN_PROGRESS` |

No more than 8 source files; no hard stop. No new dependency, no data-model, migration or navigation change: the setting is the existing Layers setting, which reads a missing layer as its default.

## Data

None new. The Layers setting (meta, JSON of booleans) gains one key, `places`, read tolerantly. No SQLite migration, no IndexedDB version, no `ATLAS_CODE`, `ATLAS_OWN`, `SNAP_RULES` or `STREET_CODE` change (PL11).

## Tests per criterion

| Id | File and name |
|---|---|
| PL1, PL9, PL10, PL12, PL13 | `src/lib/__tests__/layers/placesLayer.test.ts`: `PL1/PL9: layersFor('explore') lists places, 'navigate' and 'walk' do not`; `PL10: the legend row names the "?" in words, no digit, none of find/left/remaining/unfound (PL7)`; `PL13: with the layer on, a hidden kind still hides its marks`; `PL12: LayersKey lists by map`, a source scan of the three hosts for `map=` |
| PL8 | same file: `PL8: a setting saved without places reads on; no other layer's choice moves; an off places survives encode/decode` |
| PL6 | `src/lib/__tests__/explore/placesLayerGate.test.ts`: `PL6: the marks explanation says a small place can wait where a kind reads none, with no digit or "find"; a kind row's text does not read the layer` (source scan, shown to fail on a snippet) |
| PL2, PL3, PL4, PL5, PL11 | `src/lib/__tests__/explore/placesLayerGate.test.ts`: a source scan (TypeScript syntax tree, shown to fail on hand-written snippets: `performance.md`) that every producer of `split`, `waitingDots`, `discoveries`, `waitingSaid` and the stars is gated by `layers.on.places`; the pure part (`areaMapMarks` unchanged) holds PL2 |
| PL7 | the gate test above: no `Waiting to be found` or `atlas-waiting` left in `AtlasCard`; no digit-in-copy (existing WT8 scans stay green) |
| PL1-PL7, PL13 (what is seen) | the `layers` journey (`scripts/e2e/journeys/layers.js`): the panel on Explore lists the row; switching it off removes the "?", dots and the screen reader's button; the card has no waiting chips and the MiniMap no "?"; the kind row identical with the switch on and off; a kind switched off still hides its "?" with the layer on |

The old chips' checks in the `carousel` and `marks` journeys (`atlas-waiting`) are found by grep and rewritten to the new section's absence.

## The testing's size

**Small** (`docs/TESTING.md`): one control and one removed section. Journeys: `layers` (new checks), and, by grep for `atlas-waiting` / "Waiting to be found", the journeys that name the removed chips (`carousel`, `marks`, possibly `atlas`), once each, as the removal calls for. About 3 journeys; the `layers` one runs alone until green first. The full flow only if you ask.

## Deferred, and why

- A "Found" layer: out (a find is a memory; the card's Found list stays).
- Reweighing small places: yours, decided (SP12, 0183).
- A row phrase for a kind with a light place: dropped (the steward's S1, S2); one sentence in "How the marks work" instead.

## Native

No native file changes. The `?` and dots are drawn by the same props as today. The panel row is shared UI; its first run on a phone is an item in `docs/NATIVE_UNVERIFIED.md` ("Do: open Layers on Explore, switch Places off. Expect: every ? and dot leaves the map, the card's picture too"). Never run on a device.

## Cost

Reads and writes: none new (PL11). With the switch off, the waiting pins, dots and stars are not computed, so the map does less. n: tens to a few hundred "?" (`performance.md`); per camera settle, as today. Harness: `scripts/perf-explore.js` is unaffected (nothing added); the cost is the same or lower. No `DEFERRED.md` entry applies.

## Actions, with where to look (goal to control)

| Goal | How often | Control | Matrix | Adjacent apps | Where the owner will look first |
|---|---|---|---|---|---|
| Hide or show the places waiting | rare, from the map | A switch row in the Layers panel | matrix: a map's content options are a panel of switches (as Walkability) | Google Maps chips, AllTrails filters (spec) | the Layers button on Explore, top right; the panel; "Places", in ink, with an icon and the switch like its neighbours |
| Learn why Art says none yet a "?" shows | once | "How the marks work" (the existing information button on the card's kinds) | words only, no control | none found | the card's "How the marks work" |

## Against precedent

Where we depart from every adjacent app: none keep (**Unverified**: three of the four lines in the spec are from memory, and the verified one, Pikmin Bloom, has no area summary; the steward's S5) "what is waiting" by kind on an area's summary, so the removal of the chips follows them. Where we depart: the layer is **on by default**, while the other layers are off to keep the map clear (ML, the owner, Nov 5). Reason: the "?" are the invitation to explore and the map shows them today.

## Triage of the steward's findings (S1-S6, all accepted)

- **S1, S2:** the row phrase is dropped; "How the marks work" carries one sentence. The card's wording never follows the switch. PL6 rewritten; the `smallFinds` core function and the `KindStrip` change are gone (two files fewer).
- **S3:** a `## Amended` section names WT7, WT8, WT11 and 0132. Whether the card keeps a kinds-only line is question 2.
- **S4:** the layer is "Places", legend "A place worth the stop"; PL7 holds the words out.
- **S5:** the precedent sentence above carries its Unverified mark.
- **S6:** PL13: kinds and "Other places" still hide, the layer sits above them.

## Questions for you (decisions the plan would otherwise take)

1. **On by default?** Recommended yes (the other layers are off, but the "?" are today's invitation).
2. **Keep a kinds-only line on the card** (for example "Art and green wait on the map", no count), or let the dots, the map's "?" and the screen reader carry it? Recommended: no line (simplicity, your motive); the Never table's nearest fit then lives on the map.
3. **MiniMap follows the switch?** Recommended yes: one switch governs every "?".
