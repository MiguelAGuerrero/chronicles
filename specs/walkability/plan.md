# Walkability: plan (for the owner's review, nothing built yet)

Spec: `specs/walkability/spec.md` (WK1-WK20).

## Questions for you before I start

1. **Which OSM source?** OpenFreeMap's tiles have no sidewalk tags. Options:
   - **Overpass API** (recommended). A public service that answers a bounding box with ways and their tags.
     Free, no key, CORS-enabled, tag-complete. Public instances rate-limit and go down sometimes, so
     WK3/WK4 (back-off, `unknown` on failure) are not optional. The request sends the tile bounds only.
   - **Overture's transportation theme.** Same family as the places we already read (release follows
     Overture's, byte-range PMTiles). Its segments carry road class, speed limits and `footway`/`sidewalk`
     subclasses, merged from OSM. I have not yet confirmed that a transportation archive is published the
     way the places one is; a 30-minute spike would. If it is, this is the better fit (no new host, no
     rate limits, one cache story).
   - My plan: **spike Overture first; fall back to Overpass if there is no archive.** Either way the app
     sees one `WalkSource` adapter (`walk/types.ts`), so this is swappable. Say if you'd rather skip the spike.
2. **Which maps get the toggle?** The spec says the area card's map and the atlas page's map, since the
   Explore tab is an atlas now (0066). If you meant the walk screen's own map too (beside the fog), say so.
3. **Wording of `car`.** "Built around cars" (the spec's) vs "Hard on foot". Mine avoids a claim about the
   person; yours.

## Files

New (`src/lib/walk/`, nothing in `src/app/` changes except where noted):

| File | Layer | Does |
|---|---|---|
| `walk/types.ts` | core | `WayFacts`, `Band`, `WalkSource` (the adapter) |
| `walk/bands.ts` | core | `bandOf`, the speed/class table, sidewalk side parsing (WK5-WK8) |
| `walk/match.ts` | core | join ways to street segments with `EdgeGrid` (35°, 25 m), O(n log n) (WK6, WK10) |
| `walk/summary.ts` | core | `areaWords` from band shares (WK11-WK12); lines through `quietLines` |
| `walk/ahead.ts` | core | the route ahead's `car` stretches, 200 m lead, once per stretch (WK15-WK16) |
| `walk/source.<x>.ts` | adapter | Overpass or Overture; the only file that knows its schema (WK1, WK18) |
| `walk/reader.ts` | shell | `TileMemo`, one at a time, back-off, deadlines (WK2-WK4), like `activity/reader.ts` |
| `walk/useWalkability.ts` | view | the bands in view for a map; the switch state (meta `walk_layer`) |
| `components/map/WalkLayer.tsx` | view | the drawn stretches and legend (WK13-WK14) |

Touched: `lib/tiles.ts` (`WALK_CODE`), `lib/db/stores.ts` (`walk_tile` in `DERIVED_STORES`),
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
| `__tests__/walkReader.test.ts` | WK1, WK2, WK3, WK4, WK18 (shell test with `fakePorts()` and a fake source) |
| `__tests__/walkStore.test.ts` | WK2, WK19, WK20 (Db contract: purge, reload) |
| e2e journey `walk` (`scripts/e2e-web.js`, scenarios in `e2e-scenarios.js`, a fake source) | WK13, WK14, WK15, WK17, WK20 |

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
- **Public service etiquette.** If Overpass is the source, I'd send an identifying `User-Agent`-style
  client name (not the email) and honor 429s; heavy use belongs on a self-hosted instance, which is a
  later, bigger decision.
- **Decision record.** The owner's calls (words only, the OSM source, the two surfaces) go to
  `docs/decisions/0089-walkability.md` once approved.

## Order

1. WK5-WK10 pure (`bands`, `match`) tests first, then code.
2. WK11-WK12, WK15-WK16 pure.
3. Source adapter and reader shell (WK1-WK4, WK18).
4. Storage (WK2, WK19, WK20).
5. Layer and legend (WK13-WK14, WK17), then the warning (WK15).
6. Docs, `/docs-gc`, e2e journey `walk`.
