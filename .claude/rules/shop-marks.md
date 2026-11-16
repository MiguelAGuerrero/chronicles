---
paths:
  - "src/lib/shop marks/**"
  - "src/components/ShopCard.tsx"
  - "src/lib/__tests__/shop marks/**"
---
# Shop marks

The shops as data and a layer to see them (SM1-SM18, decision 0182, `specs/shop-marks/spec.md`): a shop pack family built in chronicles-data, read by z12 tile like the places archive but never stored or merged with the map's places, and an off-by-default "Shop marks" layer on the three maps that have a Layers button (Explore, Navigate ready, the live walk). It plans no route: circuits are a later slice that reads this data.

## What it is

- **The pack** (`contract/` in the tests folder is the app's pinned copy, SM8): one z12 tile layer `shop marks`; a record is a shop `type` (the OpenStreetMap shop value), `name`, `at` and, only when set, `chain: true`. Nothing else may reach a place (`read.ts` keeps those four, SM4). A shop with no name is not a record. `chain` is the build's, from brand and operator tags; the app never infers it and never reads `chains.json` (SM5, SM15).
- **What draws** is `SHOP_MARK_TYPES` in presence (the guard `presence-readers audit 1` forbids spelling a source's tags outside presence); `types.ts` imports it. A value not listed never draws and is never guessed (SM9). Kind words are the value read plainly (`typeWords`), not a table.
- **The shell** (`shell.ts`, the app's instance `index.ts`) reads the manifest at most daily (meta `shop_marks_manifest`, `shop_marks_checked_at`, the only things it writes, SM6, SM18) and answers with a state: `ok`, `empty` (a covered area with none), `uncovered` (no region over the map) or `failed`. `parseManifest(text, 'shops')` is the places manifest's reader with this pack's file prefix. Places live for the session in `useShopMarks` and are never stored.
- **The address** is `EXPO_PUBLIC_SHOP_MARKS_BASE` (`index.ts`); empty in production until a pack is published, and then `offeredLayers` leaves the row out and nothing is asked (SM2). `export:web` sets it to the harness's `/shop-marks-e2e/`.
- **The layer** (`layers/registry.ts`, `layers/notes.ts`): off by default, a row of its own with the icon `bag-handle-outline` (Busy streets keeps `shop-outline`). The panel holds a switch and one quiet line; the meaning is in the line and in the legend of the two drawers (`LayersKey`), never a legend over the map. The note names the source and never a list of types (steward S1).
- **The drawing**: circles only, one size and colour, no data-driven paint, no text layer (SM10, SM11, `map/types.ts` `shopMarkLayers`). Close marks merge into one of the same size (`thin`, no count). Below zoom 14 nothing draws (`NEAR_ZOOM`); on the walk maps only within 800 m of you (`WALK_NEAR_M`, a hard cut from you). Layer order is `shopMarkOrder()`: above the walked streets, under the route, trace, pins and dot.
- **The tap** (`read.ts` `nearest`, `pressTarget`, `pressAction`, in both map builds): a pin, a mark or a control is its own element and never reaches the map's tap. Of what is left a lone mark opens its card, a merged mark zooms apart, an open card only closes (and nothing falls through to the screen's own tap), else the screen's tap is as before. The card (`ShopCard`, `card.ts`) holds a name, a kind in words and, only for a flagged shop, "Marked as a chain on OpenStreetMap"; no action, no digit, nothing about independence (SM14-SM16).

## Traps

- **Kept apart from presence (SM17).** `boundary.test.ts` fails if presence, discovery, atlas, landing, explore, areas, walkPlanner or kindWalk import `shop marks`, or if a shop module touches the place cache or a derivation code. Shop marks import presence only for the list.
- **No state about a shop** (SM18): no visited, passed, found or done field in anything the reader returns; a moment captured beside a shop carries no reference to it.
- **The card's place.** Explore's card sits under the title and clear of the buttons' column; on the walk screens it sits under the navigation card (`at.insets.top + 152`) in `cardBox`, never over the capture stack. A short phone has little room there: the journey checks it.
- **The e2e's hook** `data-shop-marks` on the web map's container is the number of marks drawn, for tests only.
- Native, unverified: the circle layer and its source on MapLibre React Native, the press rule in the native map's `onPress`, the layer over the live walk's map at walking pace, and byte-range reads of the pack on a phone's network.
