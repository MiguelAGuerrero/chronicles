# Plan: After dark (DK1-DK17)

You review this before any code. The architecture is settled by your answers of Nov 14: Overpass per tile, our own opening-hours reader, local sunset on the device, and a layer of its own. Everything marked **default** below is my choice, and you can overrule it.

## Files and what changes

**A new folder, `src/lib/dark/`** (the feature `after-dark`, rule file `.claude/rules/after-dark.md`):

| File | Layer | What it holds |
|---|---|---|
| `sun.ts` | core | Sunrise and sunset for a position and a day (the NOAA solar equations, about 60 lines, no library). `readingAt(at, now)` gives the time to judge (now after dark, sunset + 1 h in daylight) and the panel's words: "Open now", "Open after sunset", "No dark tonight" (DK5, DK6). |
| `hours.ts` | core | `parseHours(text)` reads the forms in DK7 into rules; `openAt(rules, weekday, minute)` gives open, closed or unknown. Anything outside DK7's forms is unknown. The local weekday and minute are arguments, so core reads no clock or timezone. |
| `overpass.ts` | core | The one query and its parser (DK8): `way["highway"]["lit"]` with its geometry, and shops plus amenities in an eating, drinking and late-service list (restaurant, cafe, bar, pub, fast_food, ice_cream, nightclub, cinema, theatre (pharmacy and fuel dropped by default, steward question 1)) that carry `opening_hours`, as centre points. It keeps the raw `lit` and `opening_hours` text and the way's name. |
| `types.ts` | core | `DarkTile` (the kept facts: ways and places, raw tags) and `DarkSource`. |
| `reader.ts` | shell | The device's cache first, then one request at a time, a 20 s deadline, 2 min before a failed tile is asked again, and a tile older than 30 days read again (DK9, DK14). Same shape as `walk/reader.ts`, tested over `fakePorts()`. |
| `draw.ts` | core | `darkDraw(tiles, reading)`: the lit ways as lines and the open places as points, with a `key` that changes only when the picture does (DK3, DK4, DK15). |
| `useAfterDark.ts` | view | Reads the tiles within 1.5 km of the map's centre while the layer is on and nothing while it is off (DK13). A one-minute tick re-judges the reading time, and the map is sent data only when `key` changes (DK15). |
| `darkApp.ts` | shell (instance) | The app's reader over the shared Overpass gate and `net.fetch`. |

**One Overpass gate for both layers (DK8).** Walkability's cap and back-off live inside `createOverpassSource` today, so a second source would get a second cap. They move into one `overpassGate` (`src/lib/net/overpassGate.ts`, a shell over the clock) that both sources take: one streak, one pause, one count of 60 a day. Walkability's behaviour is unchanged, and its existing cap and back-off tests (`walkNetwork`, `walkSourceChain`) are the guard. **Default:** after-dark reads stop at 40 of the 60 a day, so walkability's fallback always has 20 (DK8, steward S10). When the gate is paused, neither asks, as walkability does today.

**The heads-up (DK10)**: `walk/ahead.ts` and `walk/useRouteWarning.ts`.
- `carStretches`' matching of the route to ways becomes a helper that takes a test for which ways count. Car stretches use the street band, as now; unlit stretches use `lit=no` from the after-dark tiles. A `Stretch` gains the kind `unlit`. `warningLine` says "Next: <street> is mapped as unlit". Unlit stretches less than 200 m apart merge into one. The walk screen's line shows the moon for `unlit` in place of today's hard-coded car icon (`walk.tsx:1486`; DK10, steward S2, S3, S6).
- **Default:** `useRouteWarning` takes both switches and whether it is dark. Walkability's stretches are added while Walkability is on, unlit ones while After dark is on and it is dark at the walker. `mergeStretches` already lets a road's line win over an overlapping area's, and the unlit kind sits below both, so one line shows at a time. With After dark on and Walkability off, only unlit lines are said and no walkability tile is read.

**The layer (DK1, DK5, DK11, DK12)**: `src/lib/layers/`.
- `registry.ts` gains the fourth entry: `{ id: 'dark', name: 'After dark', icon: 'moon-outline' }`, legend rows "Lit streets" and "Open after dark", and the note from DK12. `SwatchKey` gains `lit` and `open`.
- `notes.ts`: the panel line under the switch is "Reading…", "Not available now", or the reading's words ("Open now", "Open after sunset", "No dark tonight").
- The words test that already checks no number on the panel also checks DK11's words.

**The maps (DK3, DK4, DK15, DK16)**: `components/map/types.ts`, `WalkMap.web.tsx`, `WalkMap.native.tsx`.
- An `afterDark` prop, and `darkGeoJSON` in `types.ts`.
- The web map adds one source with two layers. The lit line is drawn under the trace and above the walkability tint. The open mark is a small circle. The web map reports `data-dark="lit:N|open:M"` for the e2e.
- Native uses the same as a `ShapeSource` with a `LineLayer` and a `CircleLayer`.
- Only the three screens with a Layers button pass the prop, so Chronicle, the replay and a moment's place never get it (DK16).
- **Default colours** (yours to change):
  - The lit line is a pale warm yellow, about 3 px wide at about 45% opacity. It is warm because it says "light", and no other layer uses yellow: magenta is Busy's, the cool pair is Walkability's.
  - The open mark is a 5 px ring in the map's ink colour with a white centre, quieter than a "?" pin and never in a kind's colour, so it doesn't read as a find.

**Screens**:
- Explore (`src/app/(tabs)/explore.tsx`), Navigate ready (`src/components/walk/useReady.tsx`) and the live walk (`src/app/walk.tsx`) call `useAfterDark(centre, layers.on.dark)` and hand the drawing to the map and the line to `LayersControl`.
- The live walk also passes the switch and whether it is dark to `useRouteWarning`.
- The legend shows itself in `StartSettings` and the live walk's options card, because `LayersKey` is built from the registry.

**Hosts and words**:
- `net/policy.ts`: Overpass's reason becomes "the walkability fallback and after-dark tags". No new host.
- `docs/PRODUCT.md` gets a "Map layers" bullet for After dark.
- `docs/ARCHITECTURE.md` gets the folder and the gate.
- A decision record for your calls of Nov 14 (numbered at publish time).

## Data

- **New cache, no new truth.** A `dark_tile` store, keyed `x/y` at z14: the tile's lit ways (line, raw `lit`, name), its places (point, raw `opening_hours`), `read_at` and `code` (`DARK_CODE`, bumped when the query or parser changes). It is listed in `DERIVED_STORES`, so it is cleared with them.
- **SQLite:** migration 57 (`CREATE TABLE dark_tile`, ways and places as JSON text).
- **IndexedDB:** `VERSION` 22, with an `oldVersion < 22` step creating `dark_tile`.
- **`Db` gains** `putDarkTiles` and `getDarkTiles`. Each gets a contract case first (FC7), and the fake db, IndexedDB and SQLite implement them.
- Whether a place is open is never stored (DK9).

## Tests per criterion

New test folder `src/lib/__tests__/after-dark/`, new e2e journey `dark` (a fake Overpass answer of lit, unlit and unmapped ways and places with readable, unreadable and missing hours, and the browser clock set before and after sunset).

| Id | Test |
|---|---|
| DK1 | `layers.test.ts` "DK1: the registry lists After dark with a moon, off by default, as one setting"; e2e `dark` "DK1: the After dark switch draws on Explore, Navigate and the live walk" |
| DK2 | the cold find in the UI review (step 9): the `ux-reviewer` given only the screenshots and "see where the streets are lit". No unit test: it is a finding test, recorded in the spec's record |
| DK3 | `draw.test.ts` "DK3: only ways tagged lit draw; no tag and lit=no draw nothing"; e2e `dark` "DK3: lit ways drawn, unlit and unmapped not" |
| DK4 | `draw.test.ts` "DK4: only places open at the reading's time draw; closed, missing and unreadable hours draw nothing; no name or kind is drawn" |
| DK5 | `sun.test.ts` "DK5: after dark the reading is now; in daylight an hour after tonight's sunset, with its words"; e2e `dark` "DK5: the panel line says Open after sunset by day and Open now after dark" |
| DK6 | `sun.test.ts` "DK6: sunrise and sunset within five minutes of the tables (equator, Allentown June and December, 60° N); polar day and night" |
| DK7 | `hours.test.ts` "DK7: the common forms read; past midnight; later rules win; month, week, date, PH, sunset times and comments are unknown" |
| DK8 | `overpass.test.ts` "DK8: the query holds the tile's bounds and only the two tag sets"; `gate.test.ts` "DK8: one cap and one back-off across both sources; walkability waits no longer than before" |
| DK9 | `reader.test.ts` (`fakePorts()`) "DK9: a kept tile is used until 30 days old, then read again; raw tags kept; open never stored"; `dbContract` "DK9: dark tiles put, got and cleared with the derived stores" |
| DK10 | `ahead.test.ts` (walkability folder, beside the car cases) "DK10: an unlit stretch of 100 m or more is said 200 m ahead, once, kept 15 s; walkability's line wins when both are due; only after dark"; e2e `dark` "DK10: the line shows on a navigated route along an unlit way after sunset, the route unchanged" |
| DK11 | `words.test.ts` "DK11: no number, comparison, safety or grade word in the registry entry, `layerNotes`' dark lines, `sun.ts`'s reading words and the heads-up template with a fixed street name" |
| DK12 | e2e `dark` "DK12: the legend in Navigate's start settings shows Lit streets and Open after dark with their tips and the note" |
| DK13 | `reader.test.ts` "DK13: nothing is asked or read while off"; e2e `dark` "DK13: no Overpass request for after dark while the layer is off" |
| DK14 | `reader.test.ts` "DK14: a busy or failed source draws no guess, keeps what was kept, waits two minutes"; e2e `dark` "DK14: Overpass refusing shows Not available now" |
| DK15 | `draw.test.ts` "DK15: the key changes only when the picture does, a closing crossed included"; e2e `dark` "DK15: no resend while reading the next tiles" |
| DK16 | e2e `dark` "DK16: Chronicle's map and the replay draw no after-dark data" |
| DK17 | `routeIsolation.test.ts` "DK17: no route module (walkPlanner, kindWalk, scenic, routing, nav) imports dark/, and the planner's stretches are never unlit", reading the import graph as `layers.test.ts` does |

## Deferred, and why

- **A place in another timezone** is judged on the device's clock: browsing a far town on Explore reads its hours in your own time. Core never reads the timezone, so fixing this means a timezone lookup by position, which is a data source of its own.
- **Public holidays, seasonal hours and `sunset`-based hours** are unknown, never guessed (DK7). A holiday calendar is country data.
- **The chronicles-data archive** as the source, if Overpass's load or the cap gets in the way (your call: Overpass now).
- **Words on the area card** ("Lit along its main streets"): only the map and the heads-up for now. A card line from mapped coverage risks reading as a grade.
- **How much is tagged** in your towns is unknown until the first run (Overpass is blocked from this cloud session). If Allentown shows almost nothing, the note already says why; whether to add Overture's lamp-post points or the archive is a later call.

## Native, never run on a device

- MapLibre RN's line and circle layers for the new source.
- SQLite migration 57 and the `dark_tile` reads and writes.
- The Overpass read through `net.fetch` on a phone.
- The heads-up's unlit line on a navigated walk.

Each goes into `docs/NATIVE_UNVERIFIED.md` as a Do/Expect item with its ids.

## Screens: goal, control, where you'll look

| Action | Goal, how often, situation | Control | Matrix row | Where you'll look first, and what you'll see |
|---|---|---|---|---|
| Turn After dark on or off | See lit streets and open places; occasional, before going out or as it gets dark | A switch in a row of the Layers panel, with its name and a moon | 14 (a switch in a list row, effective immediately) | The Layers button on the map you're on: a fourth row under Town borders. The same panel is on Explore, Navigate and the walk |
| Read what the layer shows | Know what the yellow line and the ring mean; rare | Legend rows with tooltips, in the walk's settings drawers | 19 (inline status near the thing), as Walkability's legend | Navigate's start settings and the walk's options, under the other layers' legends. On Explore the panel line says "Open now" or "Open after sunset", and the legend isn't there (as today) |
| Notice an unlit stretch ahead | Know before you reach it; passive, while navigating after dark | The heads-up line, as Walkability's | 19 (a status that needs no action) | Where the "Next: an area built around cars" line shows today |

**Precedent:** walkability's switch, legend and heads-up (`docs/research/ui-teardown.md` has no after-dark precedent; maps apps put lighting in no layer list, which is why the note says what it is).

**Defaults that make it quieter** (yours to overrule):
- off by default, like every layer (0097);
- the lit line at about 45% opacity;
- the open mark small and in ink, not a colour;
- no sound or vibration on the heads-up;
- no legend over the map (Nov 5's call).

## Steward (Nov 14): 10 findings, 9 accepted, 1 accepted in part

| Id | Finding | Triage |
|---|---|---|
| S1 high | Lit lines at town zoom merge into a "safe zone" glow, and Explore never shows the caveat | **In part.** Accepted: one fixed width, no halo, blur, fill or area (DK3), and "Only what is mapped" on the panel line on every screen (DK1, DK5). Rejected: drawing only from z15. Explore's neighbourhood view sits near z14.5 (smooth-switches), so the layer would vanish where you plan. A 3 px line at 45% doesn't blend into a fill. The UI review checks that from the pictures |
| S2 medium | The heads-up line wears the car icon | Accepted into DK10: the moon, never a car, caution or warning glyph |
| S3 medium | A map switch turns on alerts nobody mentioned, and they repeat on a patchy route | Accepted: a legend row says so (DK12), and stretches less than 200 m apart merge (DK10) |
| S4 medium | Nothing stops lit data from steering routes | Accepted as DK17, with an import test |
| S5 medium | DK11 can't be tested as written and has gaps | Accepted: street names exempt and the template tested with a fixed name; the word list widened; the tooltips written out in DK12; every source of words named in the test |
| S6 low | The heads-up states a tag as fact | Accepted: "Next: <street> is mapped as unlit" |
| S7 low | The Verb line says "comfortable" | Accepted: "where streets are mapped as lit and what is open" |
| S8 low | Open marks are wrong in another timezone | Accepted into DK4: past 90 minutes of solar offset from the device, no marks, and "Hours read only near you". The device offset is an argument, so core reads no timezone. The far-town lookup stays deferred |
| S9 low | Clustered marks could show a count | Accepted into DK4: no clustering, no label, a tap does nothing |
| S10 low | DK8 contradicts itself under one cap | Accepted: after-dark stops at 40 of 60 (DK8) |

**The steward's questions, put to you:**
1. **Pharmacy and fuel** in the open-mark list read as a list of safe havens. **Default:** drop them, and keep food, drink and culture (restaurant, cafe, bar, pub, fast food, ice cream, nightclub, cinema, theatre).
2. **Tapping a ring** does nothing (DK4). **Default:** keep it that way. A mark that opened a place would make it a kind of find.
3. **Privacy:** on a live walk, the tile requests trace your route to Overpass at the scale of a 2 km square, as walkability's fallback already does. **Default:** accept it, as 0093 did.
4. **Ring or found mark:** checked from the pictures in the UI review.
5. **Twilight:** **default** sunset, as you chose; civil twilight would start "dark" about 30 minutes later.
