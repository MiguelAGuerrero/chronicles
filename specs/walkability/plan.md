# Walkability: plan (for the owner's review, nothing built yet)

Spec: `specs/walkability/spec.md` (WK1-WK23).

## Calls taken (the owner, 2026-11-04)

- **Source:** Overture's transportation tiles first, the Overpass API as the fallback. The spike is done:
  `transportation.pmtiles` exists for release 2026-10-21.0 beside places and divisions, with `segment`
  features carrying `class`, `subclass`, `speed_limits`, `road_flags`, and `footway/sidewalk` and
  `footway/crosswalk` segments (Zurich z14: 666 sidewalks, 334 crosswalks; Phillipsburg: 14 sidewalks).
  Overture has no "no sidewalk" tag, so `car` on Overture alone rests on class and speed (WK8b); Overpass tiles
  can use `sidewalk=no`.
- **Where:** the Explore maps (area card, atlas page) and the Navigate map.
- **How bands show:** an icon (pedestrian; with a caution badge; with a car badge) and a tooltip in words.

Still mine to pick, change if you disagree: the worst band uses the **car badge** rather than a cancel, since a
cancel reads as "you can't walk here" and the data can't say that (WK21); the middle band's badge is a caution
mark; the words stay "Built around cars" as the tooltip and label.

## Files

New (`src/lib/walk/`, nothing in `src/app/` changes except where noted):

| File | Layer | Does |
|---|---|---|
| `walk/types.ts` | core | `WayFacts`, `Band`, `WalkSource` (the adapter) |
| `walk/bands.ts` | core | `bandOf`, the speed/class table, sidewalk side parsing (WK5-WK8) |
| `walk/match.ts` | core | join ways to street segments with `EdgeGrid` (35°, 25 m), O(n log n) (WK6, WK10) |
| `walk/summary.ts` | core | `areaWords` from band shares (WK11-WK12); lines through `quietLines` |
| `walk/ahead.ts` | core | the route ahead's `car` stretches, 200 m lead, once per stretch (WK15-WK16) |
| `walk/overtureSegments.ts` | adapter | Overture's `segment` schema (the only file that knows it): a tile's facts (WK1) |
| `walk/overpass.ts` | adapter | the Overpass query and answer, the only file that knows its schema (WK1b, WK18) |
| `walk/sourceChain.ts` | shell | Overture then Overpass, one `WalkSource`; marks where a tile came from (WK1b) |
| `walk/reader.ts` | shell | `TileMemo`, one at a time, back-off, deadlines (WK2-WK4), like `activity/reader.ts` |
| `walk/useWalkability.ts` | view | the bands in view for a map; the switch state (meta `walk_layer`) |
| `components/map/WalkLayer.tsx` | view | the drawn stretches and legend (WK13-WK14), on the Explore maps and the walk map |
| `components/WalkBandIcon.tsx` | view | the pedestrian with a caution or car badge (WK21) |
| `components/Tooltip.tsx` | view | an inline popover on hover, focus, tap or long press; never a `Modal` (WK22) |
| `walk/bandWords.ts` | core | each band's words and one-line reason, no numbers (WK22, WK23) |

Touched: the walk screen's map and strip (the switch and the warning), `lib/tiles.ts` (`WALK_CODE`), `lib/db/stores.ts` (`walk_tile` in `DERIVED_STORES`),
`lib/db/index.native.ts` (a new entry in `MIGRATIONS`), `lib/db/index.web.ts` (`VERSION` 16, an
`oldVersion < 16` step), `lib/meta.ts` (`walk_layer`), the area card and atlas page (switch + layer),
`nav/useNavigation.ts` or the walk strip (WK15 line), the map credits (WK17).

## Data

- **Cache, not truth.** One new store, `walk_tile` (key `z14/x/y`; `build`, `code`, `fetched_at`, the
  compact `WayFacts[]`). In `DERIVED_STORES`, so `purgeDerived` clears it. Bands are never stored (WK9).
- SQLite: new migration (next number after the current last); IndexedDB: `VERSION` 15 to 16.
- No change to `SNAP_RULES` or `STREET_CODE` (WK19). `WALK_CODE` is new.

## Tests per criterion

| Test file | Criteria |
|---|---|
| `__tests__/walkBands.test.ts` | WK5, WK6, WK7, WK8, WK9, WK10 (pure, a fixture of ways and segments from the Zurich/Phillipsburg tiles) |
| `__tests__/walkSummary.test.ts` | WK11, WK12 (no digits in any line) |
| `__tests__/walkAhead.test.ts` | WK15, WK16 |
| `__tests__/walkOverture.test.ts` | WK1 (a fixture tile built with `mvtFixture.ts`'s encoder, since the bucket is not guaranteed from tests) |
| `__tests__/walkSourceChain.test.ts` | WK1b, WK8b (Overture fails, Overpass answers; both fail) |
| `__tests__/walkBandWords.test.ts` | WK22, WK23 (words per band, no digits) |
| `__tests__/walkReader.test.ts` | WK2, WK3, WK4, WK18 (shell test with `fakePorts()` and a fake source) |
| `__tests__/walkStore.test.ts` | WK2, WK19, WK20 (Db contract: purge, reload) |
| e2e journey `walk` (`scripts/e2e-web.js`, scenarios in `e2e-scenarios.js`, a fake Overture archive served by byte range, like AD's) | WK13, WK14, WK15, WK17, WK20, WK21, WK22 (hover shows the tooltip) |

## Deferred, and why

- Routing around `car` stretches: its own slice (0022 defers suggested routes).
- Amenity and block-length signals: they need a separate judgement of weights; the table is built to take them.
- Replay mention, native credits.

## Native (never run on a device)

The layer on the native map (line layers over `ShapeSource`), the warning strip, migration N and the native
cache write path. All go in `docs/NATIVE_UNVERIFIED.md`.

## Risks I want you to know about

- **Sidewalk coverage varies a lot.** Dense European cities are well mapped; many US suburbs are not. WK7
  and the legend line (WK14) are how the spec stays honest about it. Expect some `mixed` where the street is
  in fact fine.
- **Public service etiquette.** Overpass is the fallback only, so its load is small; I'd send a generic client
  name (not the email) and honor 429s. Heavy use would belong on a self-hosted instance, a later decision.
- **Overture's bucket is a third-party host the app already uses** (places, divisions); no new host for the
  primary path. Overpass is a new host and the first network call that isn't a tile or an archive.
- **Decision record.** The owner's calls (words only, the OSM source, the two surfaces) go to
  `docs/decisions/0089-walkability.md` once approved.

## Order

1. WK5-WK10 pure (`bands`, `match`) tests first, then code.
2. WK11-WK12, WK15-WK16, WK22-WK23 pure.
3. Overture adapter, Overpass adapter, source chain, reader shell (WK1-WK4, WK1b, WK18).
4. Storage (WK2, WK19, WK20).
5. Icon and tooltip (WK21-WK22), then layer and legend on the three maps (WK13-WK14, WK17), then the warning (WK15).
6. Docs, `/docs-gc`, e2e journey `walk`.
