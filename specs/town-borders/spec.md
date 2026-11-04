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
- The outline cache (`outline_tile`, TO12) also holds zoom-10 tiles, keyed by zoom: SQLite migration 17 and IndexedDB v15. Both clear the old rows, since it is a cache.
- Network: Overture's divisions archive, already read (decision 0083).
