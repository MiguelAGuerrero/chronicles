---
paths:
  - "src/lib/storefronts/**"
  - "src/components/StorefrontCard.tsx"
  - "src/lib/__tests__/storefronts/**"
---
# Storefronts

The shops as data and a layer to see them (SF1-SF18, decision 0182, `specs/storefronts/spec.md`): a storefront pack family built in chronicles-data, read by z12 tile like the places archive but never stored or merged with the map's places, and an off-by-default "Storefronts" layer on the three maps that have a Layers button (Explore, Navigate ready, the live walk). It plans no route: circuits are a later slice that reads this data.

## What it is

- **The pack** (`contract/` in the tests folder is the app's pinned copy, SF8): one z12 tile layer `storefronts`; a record is a shop `type` (the OpenStreetMap shop value), `name`, `at` and, only when set, `chain: true`. Nothing else may reach a place (`read.ts` keeps those four, SF4). A shop with no name is not a record. `chain` is the build's, from brand and operator tags; the app never infers it and never reads `chains.json` (SF5, SF15).
- **What draws** is `STOREFRONT_SHOPS` in presence (the guard `presence-readers audit 1` forbids spelling a source's tags outside presence); `types.ts` imports it. A value not listed never draws and is never guessed (SF9). Kind words are the value read plainly (`typeWords`), not a table.
- **The shell** (`shell.ts`, the app's instance `index.ts`) reads the manifest at most daily (meta `storefronts_manifest`, `storefronts_checked_at`, the only things it writes, SF6, SF18) and answers with a state: `ok`, `empty` (a covered area with none), `uncovered` (no region over the map) or `failed`. `parseManifest(text, 'storefronts')` is the places manifest's reader with this pack's file prefix. Places live for the session in `useStorefronts` and are never stored.
- **The address** is `EXPO_PUBLIC_STOREFRONTS_BASE` (`index.ts`); empty in production until a pack is published, and then `offeredLayers` leaves the row out and nothing is asked (SF2). `export:web` sets it to the harness's `/storefronts-e2e/`.
- **The layer** (`layers/registry.ts`, `layers/notes.ts`): off by default, a row of its own with the icon `bag-handle-outline` (Busy streets keeps `storefront-outline`). The panel holds a switch and one quiet line; the meaning is in the line and in the legend of the two drawers (`LayersKey`), never a legend over the map. The note names the source and never a list of types (steward S1).
- **The drawing**: circles only, one size and colour, no data-driven paint, no text layer (SF10, SF11, `map/types.ts` `storefrontLayers`). Close marks merge into one of the same size (`thin`, no count). Below zoom 14 nothing draws (`NEAR_ZOOM`); on the walk maps only within 800 m of you (`WALK_NEAR_M`, a hard cut from you). Layer order is `storefrontOrder()`: above the walked streets, under the route, trace, pins and dot.
- **The tap** (`read.ts` `nearest`, `pressTarget`, `pressAction`, in both map builds): a pin, a mark or a control is its own element and never reaches the map's tap. Of what is left a lone mark opens its card, a merged mark zooms apart, an open card only closes (and nothing falls through to the screen's own tap), else the screen's tap is as before. The card (`StorefrontCard`, `card.ts`) holds a name, a kind in words and, only for a flagged shop, "Marked as a chain on OpenStreetMap"; no action, no digit, nothing about independence (SF14-SF16).

## Traps

- **Kept apart from presence (SF17).** `boundary.test.ts` fails if presence, discovery, atlas, landing, explore, areas, walkPlanner or kindWalk import `storefronts`, or if a storefront module touches the place cache or a derivation code. Storefronts import presence only for the list.
- **No state about a shop** (SF18): no visited, passed, found or done field in anything the reader returns; a moment captured beside a shop carries no reference to it.
- **The card's place.** Explore's card sits under the title and clear of the buttons' column; on the walk screens it sits under the navigation card (`at.insets.top + 152`) in `cardBox`, never over the capture stack. A short phone has little room there: the journey checks it.
- **The e2e's hook** `data-storefronts` on the web map's container is the number of marks drawn, for tests only.
- Native, unverified: the circle layer and its source on MapLibre React Native, the press rule in the native map's `onPress`, the layer over the live walk's map at walking pace, and byte-range reads of the pack on a phone's network.
