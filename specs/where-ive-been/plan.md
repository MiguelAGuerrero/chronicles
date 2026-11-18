# Where I've been: plan (WB1-WB17)

For the owner's review before any code. Spec: `specs/where-ive-been/spec.md`. Decision record 0221 is written with the first code commit
(booked then with `npm run book:next-decision`).

## What the walker sees

- **The live walk's right column** loses the footsteps button and its black "4 unwalked nearby" pill. From the bottom it now reads
  Recenter (when you have panned away), Walk me back (when away from the start), the compass (when the map is turned): no gap where the
  footsteps button was. The grey veil and bold fog are gone with it; the faint fog and the ink "walked before" streets stay as they are.
- **The Layers button** (bottom left, the stacked-squares glyph, on the walk screen and Explore) gains a fourth row,
  **"Where I've been"**, with a footsteps icon and a switch, off at first. On: the lines of your earlier walks near you draw in a pale green,
  thinner than today's trace, with no white edge, under today's trace. Where two walks crossed the same street the line looks the same.
- **The legend** (the walk's settings, "On the map"): one row, the pale green swatch and "Your earlier walks".
- **The panel's status line** under the row while on: "Waiting for your position", "Getting your walks ready…", or "None of your walks pass
  here". Never a number.

## Files

| Where | What |
|---|---|
| `src/lib/pastLines/core.ts` (core, new) | `LINE_CODE`; `lineOf(walked, breaks, fills)` → runs of `LngLat[]` simplified within 5 m (Douglas-Peucker on metres) with its bounds and z12 tile keys; `nearLines(rows, centre, 5 km)`; `prepareOrder(missing, centre)`; `visibleLines(rows, hidden, openWalkId)`; `linesKey(rows)` (what is sent changes only when this does) |
| `src/lib/pastLines/shell.ts` (shell, new) | `createPastLines(p: Pick<Ports, 'db'>)`: `build(walk, fills?)` reads points, pauses, stills and kept gap decisions, never tiles; `prepare(centre, stop)` builds missing or stale lines one walk at a time; `near(centre)` |
| `src/lib/pastLines/index.ts` (instance), `usePastLines.ts` (view) | the app's instance; the hook `usePastLines(centre, on)`: re-reads only when the centre's area key or the set of lines changes, drops hidden (pending-delete) walks and the open walk, returns `{ lines, note }` |
| `src/lib/db/{types,migrations,sqliteStore,index.web}.ts`, `__tests__/fakes`, `__tests__/dbContract.ts` | `putWalkLine`, `getWalkLinesNear(tiles)`, `listWalkLineCodes()`, `deleteWalkLine`; `deleteWalk` takes the line too. SQLite migration 30 (`walk_line` + `walk_line_tile(walk_id, tile)` indexed on tile); IndexedDB `VERSION` 23, store `walk_line` with a multiEntry `tiles` index |
| the stop path (`lib/walk` stop shell) | builds the stopped walk's line once it is closed (WB8, WB14); no change to `snapWalk` |
| `src/lib/gaps/index.ts` (`decide`, `keepAllOffers`) | a decision drops the walk's line, so it is rebuilt with the kept stretch (WB14) |
| `src/lib/layers/registry.ts`, `notes.ts` | the `past` layer entry (WB4, WB11) and its status words (WB12); `SwatchKey` gains `past` |
| `src/components/map/types.ts`, `WalkMap.web.tsx`, `WalkMap.native.tsx` | `COLORS.past`, `PAST_STYLE` (opaque, narrower than the trace, no edge); a `past` line source in `LINE_SOURCE_IDS` between `fog` and `walked`; the `past` prop; `fogEmphasis` and the bold fog removed if nothing else passes them (the veil stays: the replay and a day use it) |
| `src/lib/nav/previewView.ts` | the past lines hide while choosing among routes, like the trace (fix preview-clutter) |
| `src/lib/stackSlots.ts`, `components/walk/layout.ts` | `EdgeSlot` loses `unwalked`: `locate` 0, `back` 1, `compass` 2 (WB2) |
| `src/app/walk.tsx` | the button, pill, `showUnwalked`, the count and their styles go; the compass's slot and focus hand-off (WB3); `usePastLines(live.here, on)` into `drawn` |
| `src/components/walk/useReady.tsx`, `src/app/(tabs)/explore.tsx` | `usePastLines` at each screen's layer centre (`fix`, `layersAt`) |
| `docs/` | `PRODUCT.md` (the button out, the layer in), `decisions/0221`, `.claude/rules/map.md` and `streets-fog-snapping.md` (the switch lines), `research/adjacent-apps.md` (Strava's personal heatmap), `ARCHITECTURE.md` (the new cache) |

## Data

- **New cache, not truth:** `walk_line(walk_id PK, code, west, south, east, north, runs JSON)` and `walk_line_tile(walk_id, tile)`, the z12
  tiles each line crosses, so "near the map" is an indexed read of a few tiles, never a scan of every walk. Rebuilt from the trace; `LINE_CODE`
  bumps rebuild every line. Not tied to the tile build (it reads no tiles), so `clearDerived` for a new build leaves it.
- SQLite migration 30 appended (29 today) (none edited); IndexedDB `VERSION` 23 with an `oldVersion < 23` step. All native writes go through the queue.
- A line carries recorded walked fixes and kept gaps only; a gap filled by itself is the app's guess and stays a break (WB7, steward S4).

## Tests (todos first, one commit)

| Id | Test | File |
|---|---|---|
| WB1 | e2e: no `unwalked` control, no "unwalked nearby", `data-veil` off, fog paint quiet on the live walk; fog and walked still drawn | `scripts/e2e/journeys/where.js` (new) |
| WB2 | unit: slots stack with no gap (`EDGE_INDEX` contiguous, back directly above locate); e2e: the column's boxes, ready and live, match across Start | `walk-screen/stackSlots.test.ts`; `ready.js` (its layout list loses `unwalked`) |
| WB3 | e2e: compass focus hand-off to Walk me back, else Recenter, else the map | `qol.js` (the check at line 814 updated) |
| WB4 | unit: the registry lists `past`, "Where I've been", off by default; e2e: the row and switch in the panel on walk and Explore; the cold find on the pictures | `layers/layers.test.ts`; `where.js` |
| WB5 | e2e: on in the walk, on in Explore, still on after a reload | `where.js` |
| WB6 | unit: `nearLines` keeps lines within 5 km, drops the rest; shell: nothing read while off; e2e: a walk walked, stopped, then a second walk shows the first's line in `data-past`; on Explore the main map has it and no tile map does | `layers/pastLines.test.ts`; `where.js` |
| WB7 | unit: `lineOf` breaks at rides, pauses, stills and unresolved, dismissed or self-filled gaps; draws kept ones | `layers/pastLines.test.ts` |
| WB8 | unit: `visibleLines` drops the open walk; e2e: the walk being recorded is not in `data-past`, and is after Stop | `pastLines.test.ts`; `where.js` |
| WB9 | unit: `PAST_STYLE` opacity 1, width under the trace's, no edge layer; the source sits between `fog` and `walked`; `COLORS.past` told apart from the trace and the ink by the palette's CIEDE2000 floor, its contrast on the base map under the trace's; e2e: fog paint the same with the layer on and off | `map/palette.test.ts` |
| WB10 | unit: no digit, `%`, date or "explored/covered/of" in the layer's name, legend or notes (the `check:vision` words too) | `layers/layers.test.ts` |
| WB11 | unit: one legend row "Your earlier walks", swatch `past`; e2e: in the ready drawer's "On the map" | `layers.test.ts`; `where.js` |
| WB12 | unit: `layerNotes` gives the three lines in words, null when off | `layers/layers.test.ts` |
| WB13 | unit: `visibleLines` drops hidden walks; contract: `deleteWalk` removes the walk's line and tiles | `pastLines.test.ts`; `dbContract.ts` |
| WB14 | contract: the four `Db` methods; shell: built at stop, dropped by a gap decision, rebuilt on a `LINE_CODE` change, a rebuild gives the same line | `dbContract.ts`; `layers/pastLinesShell.test.ts` |
| WB15 | shell: `prepare` builds one walk at a time, nearest first, stops when told, leaves a failed walk for next time | `layers/pastLinesShell.test.ts` |
| WB16 | unit: `linesKey` unchanged for the same rows; shell: `prepare` reports done once, not per walk; e2e: `perfCount` `past:send` does not grow over a minute of fixes, and the past source has no opacity transition | `pastLines.test.ts`; `where.js` |
| WB17 | shell: the fake ports' log has no tile read or fetch; source scan: `pastLines/*` imports no tile or fetch module | `layers/pastLinesShell.test.ts` |

The old checks naming the button change: `walk.js` N12 drops its "unwalked nearby" part (the fog check stays), `palette.js`'s
`palette-16-borders-walk-unwalked` step goes (the firm border over the veil it shot no longer happens on the walk), `previewClutter.test.ts`
loses `veil`/`fogEmphasis` from the walk's drawn set.

## Cost

- **Build:** one walk's fixes read once (1k-30k) and simplified, O(n); at Stop it rides on the snap already reading them. Backfill after an
  update: every old walk once, one at a time, only while the layer is on, yielding between walks. Inferred, not measured.
- **Draw:** the near read touches the z12 tiles of a 5 km reach (about four), then the rows that cross them; re-read only when the centre's
  area key changes (not per fix). Sent to the map only when `linesKey` changes (`perfCount` `past:send`, checked in `where.js`). A heavy area
  (hundreds of walks through one town) is a few tens of thousands of vertices after simplification; native's cost is a device check.
- Nothing per frame. The source on native is a `memo` component like `TraceSource`.

## Goal-to-control (`docs/research/ui-references.md`, matrix 2)

- **See where I've been / hide it.** Occasional: before setting out, or mid-walk choosing a turn. A switch in the Layers panel's list row
  (C1: a switch belongs in a list row, takes effect at once). Adjacent: Strava's heatmap is a map-layers choice too (from memory); Google's
  Timeline is a separate screen, one day at a time.
- **Unwalked streets near me** (removed): nothing replaces it; the trace and the faint fog say it (the owner).
- **Where the owner will look first:** the Layers button, bottom left, where Walkability and Town borders are switched; they will see the row
  by its name.
- **Defaults taken that make it quieter** (overrule any): off by default (0097); the footsteps icon (the removed button's glyph); the legend only
  in the walk's settings, not floating; the pale green; a 5 km reach.

## Against precedent

- Every earlier walk at once, no date filter (Timeline shows one day; Strava filters by date): the owner's call, no dates.
- One even tone where Strava brightens with repetition: the owner's call; drawn intensity would be coverage (Never).

## Deferred

- Simplification by zoom (one 5 m line at every zoom); revisit if a town of hundreds of walks is slow on a phone.
- A tap on a past line to open its walk; a date window.

## Native that will not run on a device

- The `past` source and layer order in `WalkMap.native.tsx`; SQLite migration 30 and the tile index; backfill timing on a phone with years of
  walks. Each an item in `docs/NATIVE_UNVERIFIED.md` (`native item add`).

## The steward (Nov 18): four drifts, one tone, no breach; all accepted

- **S1** Explore's same-scale rings could turn into coverage gauges (0066, Never coverage): **accept**. WB6 says only Explore's main map draws
  the layer, never a tile or the card's ring, and the layer is never clipped to an area.
- **S2** Every walk in one even tone over the faint fog is Fog of World without the number: **accept**. The owner's tone stands; WB9 keeps the fog's
  paint unchanged with the layer on and holds the past line's contrast under the trace's.
- **S3** Backfill filling the map outward reads as progress (restraint in motion): **accept**. WB16 allows one send at the start and one when done,
  with no animation.
- **S4** A gap filled by itself drawn as walked treats a guess as truth: **accept**. WB7 draws recorded fixes and kept gaps only. This also drops the
  write at the snap: the line is built at Stop.
- **S5** Return with nothing to return to: **accept**. The verb is earn; a tap that opens a line's walk is deferred as the layer's Return.
- **Silent, for the owner:** with the layer on, streets walked before show twice, as the ink line (always on) over the pale green. The plan draws
  the ink over the green as it is (the owner kept the ink). And the precedent for every walk at once rests on unverified lines only (Strava, Fog of
  World); both verified apps show a day or places.
