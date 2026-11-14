---
paths:
  - "src/lib/dark/**"
  - "src/lib/net/overpassGate.ts"
  - "src/lib/__tests__/after-dark/**"
  - "scripts/e2e/journeys/dark.js"
---
# After dark

Lit streets and places open after dark, as a fourth map layer, and a heads-up before a street mapped as unlit on a navigated walk (specs/after-dark DK1-DK17). The vision gate's reshaping of the owner's safety idea (Nov 14): crime data is out; what is mapped is shown, never a grade.

## What it is

- **Evidence only adds.** A way draws only when its `lit` tag says lit (`litOf`); `lit=no` and no tag draw nothing, so nothing is ever drawn as dark (DK3). A place draws only when its hours say open (`openAt`); closed, missing and unreadable draw nothing (DK4). Only `lit=no` feeds the heads-up.
- **Never a grade.** No number, count, comparison or safety word anywhere it speaks (DK11; `words.test.ts` holds the list, a street's own name exempt). Lines are one fixed width with no halo, fill or area (DK3); marks never cluster, carry a label, or answer a tap (DK4). The heads-up says "mapped as unlit", the map's tag, never a fact about the street, and wears the moon, never a car or a warning glyph (DK10).
- **No route reads it** (DK17): only the three screens with a Layers button, the map's types, `layers/notes.ts` and `walk/useRouteWarning.ts` import `lib/dark/`. `words.test.ts` fails on any other importer.
- **Sun** (`sun.ts`, core): the sunrise equation on the device, no library. `isDark` between sunset and sunrise; `readingAt` judges hours now after dark, an hour after tonight's sunset by day, nothing in a polar day ("No dark tonight").
- **Hours** (`hours.ts`, core): the common forms only (DK7); anything else is unknown, never open. The weekday and minute are arguments: the view reads the clock, core reads no timezone. `hoursReadHere` leaves the marks out where the map is likely another zone (45 min of solar time from you, or 150 from the device's offset with no position).
- **Truth vs cache:** `dark_tile` (SQLite migration 57, IndexedDB v22) keeps the tags as given, `DARK_CODE` and `read_at`; open is judged on read, never stored. Read again after 30 days (DK9); in `DERIVED_STORES`.

## Where the facts come from

- **Overpass only** (Overture has neither tag, checked Nov 14): `overpass.ts` is the only file that knows the query (lit ways with geometry; shops and the eating, drinking and show amenities with `opening_hours`, as centres; pharmacy and fuel left out) and the answer.
- **One gate for both layers** (`net/overpassGate.ts`): one back-off streak and pause, one count of 60 a day; after dark stops at 40, so walkability's fallback always has 20 (DK8). Both sources take the app's one gate (`walk/walkApp.ts` builds it; `dark/darkApp.ts` imports it).
- `reader.ts` (shell): the device first, one request at a time, a 20 s deadline, 2 min before a failed tile is asked again, an older kept tile beats none (DK14).

## Traps

- The e2e's fake Overpass answers the after-dark query by its body (`opening_hours` in it): `darkWorld.mode` is `mixed`, `unlit` or `busy`. The journey sets the browser's clock (`pg.clock.setSystemTime`) and a New York timezone.
- **Native, unverified:** the line and circle layers on MapLibre RN, migration 57, the Overpass read on a phone, the unlit line on a navigated walk.
