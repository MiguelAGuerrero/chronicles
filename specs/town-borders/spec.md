<!-- Repo first: written from the owner's request in a session (Nov 4), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Town borders: the outlines, drawn

Nov 4, 2026 · @Miguel Guerrero

Town outlines (TO1-TO12, decision 0083) made the town you're in the one whose border you're inside, so Explore now says Whitehall at 2677 MacArthur Rd. The borders themselves were never drawn. The owner expected to see them, highlighted the way states are on a US map.

## Decisions (the owner's calls, Nov 4)

- **Where:** every map that shows a town: Explore's map, a town's page, Chronicle's map, the walk screen, and any screen that names a town or city (the replay and a day).
- **How it looks:** your town tinted, with a firm border; the towns around it drawn as thin border lines only.
- **Data:** borders are drawn from Overture's zoom-10 divisions tile (about 40 km across, 200-500 KB), read once and kept on the phone. The precise zoom-12 tiles still decide which town you're in (TO1).

## Criteria

1. **TB1** Explore's map draws the town you're in with a soft fill and a firm border, and the other towns around you as thin border lines. The tinted town is the one the title names, because it is the same outline. When the title's town comes from a label point (no outline known), nothing is tinted and no border is invented.
2. **TB2** A town's page draws that town tinted with its whole border, and its neighbors lined.
3. **TB3** Chronicle's map draws the towns your walks were in as regions, all in one tint, behind the stars, from zoom 8 up; below that, stars only. Every walked town looks the same however much it was walked: no shading by amount, no count (nothing is a score).
4. **TB4** The walk screen draws the borders around you as thin lines, the town you're in a little firmer, with no fill, so the trace, fog and route stay as they were.
5. **TB5** The replay and a day draw the towns that walk or day was in as tinted regions, the others lined.
6. **TB6** A border is drawn whole, never cut at a tile's edge: it comes from the zoom-10 tile (or tiles, for a town that spans two), and a town larger than the tiles read is drawn only as far as they reach. No circle or guess is ever drawn in place of a border.
7. **TB7** Borders read once are kept on the phone and drawn from there, offline too. A screen with no border kept or readable draws none, and works as before.
8. **TB8** Borders sit under everything else: streets, labels, the trace, fog, busy streets, pins, stars and the walker. The fill stays faint enough that the map's streets and labels read through it, in the colors test.
9. **TB9** Drawing costs little. Border shapes are built once per change of towns, never per frame, zoom or render. Shapes are simplified for drawing (vertices about 10 m apart at most), and a screen draws at most 40 towns.

## Routes and data

- No new routes or dependencies.
- The outline cache (`outline_tile`, TO12) also holds zoom-10 tiles, keyed by zoom: SQLite migration 18 and IndexedDB v15. Both clear the old rows, since it is a cache.
- Network: Overture's divisions archive, already read (decision 0083).

## Record (Nov 4)

Built on branch `claude/town-borders`; the owner's go-ahead on the plan, Nov 4.

| Id | Passed by |
|---|---|
| TB1 | `townBorders.test.ts` "TB1: ..." (Overture's real Whitehall, Catasauqua, Coplay, North Catasauqua); e2e `outlines` "TB1: Explore's map draws the town you're in tinted and its neighbor lined", "TB1, TB7: no outline known, no border drawn" |
| TB2 | `townBorders.test.ts` "TB2: ..."; e2e `outlines` "TB2: the town's page draws its border tinted" |
| TB3 | `townBorders.test.ts` "TB3: walked towns are one tint ...", "TB3, TB5: a walk's town areas become its tinted outlines" |
| TB4 | `townBorders.test.ts` "TB4: the walk screen's borders are lines only, the town you're in firmer" |
| TB5 | `townBorders.test.ts` "TB5: ...", "TB3, TB5: ..." |
| TB6 | `townBorders.test.ts` "TB6: a border is drawn whole ..." |
| TB7 | `townBordersShell.test.ts` (two TB7 cases); `dbContract.ts` z10 and z12 tiles under one x/y |
| TB8 | `colors.test.ts` "TB8: the border fill keeps streets and labels readable; the lines show on the base map" |
| TB9 | `townBorders.test.ts` "TB9: shapes are simplified to about 10 m and capped at 40 towns ..." |

- **Test-first, honestly:** TB1-TB6 and TB9 were written and seen failing (no module) before `areas/borders.ts`; the reader's z10 read was written just before TB7's tests, which passed on their first run.
- **Changed from the plan:** TB3 and TB4 have no e2e check (a journey would need a placed walk seeded into storage), and the web layer order is not checked by the e2e; both are in `docs/DEFERRED.md`. The replay and the day read their towns through `outlines.townsOf` (views read no db).
- **Not audited** (decision 0074: only when the owner asks). **Native, never run on a device:** `docs/NATIVE_UNVERIFIED.md` "Town borders".
