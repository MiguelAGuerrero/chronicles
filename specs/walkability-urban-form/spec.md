<!-- Walkability, judged by the urban form of an area (UF). Written in the repo first (2026-11-05) after the owner tried the
     shipped walkability layer: it drew nothing a person could use, and called every area "mostly mixed" (Allentown, whose
     core is very walkable, included). Their calls are in the Decisions list. To be copied into the concept doc as a tab. The
     doc wins once it exists. Built 2026-11-05 (see Record). -->

# Walkability by urban form (UF)

Replaces how the app judges **where** is easy on foot (specs/walkability: WK5-WK10, WK13, WK14 and WK11's basis). The street-by-street
band from sidewalk tags is the wrong measure for this: OpenStreetMap maps sidewalks unevenly, so a dense, walkable grid with its sidewalks
unmapped reads as no better than a cul-de-sac. The judgement now comes from **how the ground is built**, which the map data states well:
how closely streets cross, how short the blocks, how much of it is arterial road, crosswalks and sidewalks where they are mapped, and how
many places sit along the streets. The result is a **tint over areas** of the map, not lines on streets, and words on the area card.

"Built around cars" is what the map data suggests, not a ruling that a place can't be walked.

## Why (found 2026-11-05 on Overture's real tiles, release 2026-10-21.0)

- Downtown Allentown's tiles map 610 sidewalk and 705 footway segments, yet of its road length 47 km read easy on foot, 124 km "mixed",
  **0 km** built around cars and 216 km "unknown" (parking aisles, alleys and driveways). The area line said nothing; the map drew 1,091
  faint "mixed" lines and no car stretch, so the legend's second symbol never appeared.
- How the urban form separates places, within 450 m (street junctions are Overture connectors that two or more streets share):

  | Place | Street junctions per km² | Arterial share of street | Crosswalks per km² | Sidewalk mapped per metre of local street |
  |---|---|---|---|---|
  | Allentown downtown | 57 | 0.60 | 77 | 0.97 |
  | Allentown residential grid | 35 | 0.00 | 38 | 0.11 |
  | Lehigh Valley Mall | 22 | 0.59 | 0 | 0.00 |
  | Upper Macungie suburb | 17 | 0.16 | 5 | 0.00 |
  | Zurich old town | 154 | 0.00 | 75 | 1.00 |

  The residential grid has almost no sidewalk mapped and is still dense and well connected. Junction density tells the mall and the suburb
  from the grid; sidewalk tags do not. (Counting every Overture connector, which includes each parking aisle and driveway, gave 1,405 per km²
  downtown and 531 at the mall: a car park looked like a street grid. UF3 counts street junctions only.)
- The rule below, run over a 10 km × 9 km window around Allentown (cells of 250 m, 25,000 ways, judged in 133 ms), gives one contiguous walkable
  core through downtown and the grids south and west of it (715 foot, 253 neither, 619 car cells), and car-oriented ground at the mall and
  the outer suburbs. Its thresholds are starting values pinned by five real fixtures (UF4).

## Decisions

- **Judged by the urban form of the area** (the owner, 2026-11-05): how closely streets cross, block length, crosswalks and sidewalks where
  mapped, arterial share, and how many places sit along the streets. A missing sidewalk tag never lowers a reading.
- **Soft tinted areas, both ends shown** (the owner, 2026-11-05): a green tint where it is easy on foot, a warm tint where it is built
  around cars, nothing between. Both of the legend's symbols appear on the map.
- **The card follows the area; the heads-up follows fast roads and car-oriented areas** (the owner, 2026-11-05).
- **Words, not a number** (specs/walkability, decision 0093): no score, share, rank or comparison is shown anywhere.
- **A layer, off by default** (the owner, 2026-11-05): the tint is the Walkability layer of specs/map-layers, switched from the one Layers button, off
  until chosen, one setting for every map.
- Everything else in specs/walkability holds: Overture first, Overpass second; nothing leaves the device but the tile request; the tooltips'
  icons and words. (Its own switch and button are replaced by the Layers panel, ML3-ML7.)

## The model

A **cell** is a square of about 250 m. Its **neighbourhood** is the ground within 450 m of its centre. Within it the app measures, from the
tiles already read:

- **Streets:** local streets (residential, living street, tertiary, unclassified) and arterials (primary, secondary, trunk, motorway).
  Service ways (alleys, parking aisles, driveways), paths, steps and anything unclassified are **not streets**: they count for nothing,
  neither in a length nor in a share.
- **Street junction density:** street junctions per km² (UF3).
- **Arterial share:** arterial length over all street length.
- **Crossing and sidewalk evidence:** mapped crosswalks per km², and mapped sidewalk length per metre of local street.
- **Place density:** the weighted places per km² the activity density already reads (specs/activity-density: Overture and OpenStreetMap places).

A cell is then one of: **foot**, **car**, **neither** (drawn as nothing), or **empty** (too little street to say: a park, water, open land).

## Acceptance criteria

### Reading the form

1. **UF1 · Cells.** The ground the layer covers is cut into cells of about 250 m, judged each from its 450 m neighbourhood. The same cell
   gets the same reading whichever other tiles have been read, once its neighbourhood's own tiles are (the WK10 rule, kept).
2. **UF2 · What counts as a street.** Only local streets and arterials are streets. A service way, path, step or way of unknown class adds
   nothing to a length, a density or a share, so a parking lot never makes a place look unknown or car-oriented by itself.
3. **UF3 · Street junctions come from the data.** A junction is an Overture connector that two or more **streets** share (local streets and
   arterials), counted once; a connector only a service way, parking aisle, driveway or footway meets is not one. For a tile read from Overpass, a
   junction is a node two or more streets share. Connectors sit partway along a segment, so they are read from the connectors the segments list,
   never from segment ends. A tile with no junction data (a cached tile from before) is read again, never guessed.
4. **UF4 · The rule, and what pins it.** A cell is **foot** when its street junctions are high (a starting value of 45 or more per km²), or
   middling (30 or more) with crossings or sidewalks mapped (15 crosswalks per km², or 0.3 m of sidewalk per metre of local street), and its
   arterial share is at most half, or at most three quarters where crossings or sidewalks are mapped (a downtown's main streets are arterial by
   class and still walkable). A cell is **car** when arterial road is more than 60% of its street (more than 85% where crossings or sidewalks
   are mapped), or when its junctions are low (under 30) with no crossing or sidewalk evidence. Anything else is **neither**. The starting values
   are changed only with the fixtures, which read as stated:
   - downtown Allentown (Hamilton Street at 7th) and the residential grid at 19th and Liberty, sidewalks mostly unmapped: **foot**;
   - Lehigh Valley Mall and an Upper Macungie cul-de-sac suburb: **car**;
   - Zurich's old town: **foot**.
5. **UF5 · Unmapped is not absent.** No sidewalk or crossing data in a neighbourhood never lowers a cell. Evidence only raises one.
6. **UF6 · Places lift the middle.** A cell the form rule leaves **neither**, whose neighbourhood holds many places per km² (a starting
   value of 150 weighted places per km²), becomes **foot**. Places never make a cell **car**, and never lift a **car** cell. With no places read, the cell is
   judged on form alone, and nothing fails.
7. **UF7 · Too little to say.** A neighbourhood with under 300 m of street is **empty**: drawn as nothing, counted as nothing.
8. **UF8 · Derived, never stored.** Cells are computed on read from the cached tile facts (specs/walkability WK9) and never stored. The tile
   facts grow by the junction points; `WALK_CODE` is bumped so an older cached tile is read again.

### What shows

9. **UF9 · A tint over areas.** With the Walkability layer on (specs/map-layers), each **foot** cell is tinted green and each **car** cell warm, softly, with the map's
   streets and labels readable through. **Neither** and **empty** are not drawn. Neighbouring cells of one reading read as one area (no visible
   seams between them). The tint draws beneath the trace, fog and pins.
10. **UF10 · The legend shows what is drawn.** The Walkability layer's legend, in the Layers panel under its switch, lists two rows, each a swatch of its tint beside its icon and its words ("Easy on
    foot", "Built around cars"). The pedestrian with a caution badge is no longer drawn on the map or in the legend. Both rows are visible
    whenever the layer is on and the panel is open; the status lines ("Reading…", "Not available now") and the credit stay.
11. **UF11 · Both ends appear in a real town.** On the Allentown fixture, the layer tints the walkable core green and the outer ground warm.
    The e2e journey checks both tints are drawn.
12. **UF12 · Nothing is a score.** No number, share, rank or comparison between places is shown or stored for display. The tooltips are the
    band's name and one clause in words (specs/walkability WK22, WK23).

### The area card

13. **UF13 · The card's line follows its cells.** The "On foot" line (specs/walkability WK11) is said from the cells inside the card's ring:
    "Mostly easy on foot" when foot cells are at least 60% of the cells that are not empty, "Mostly built around cars" when car cells are,
    "A mix of easy and car-oriented streets" when each is at least 25%, and nothing otherwise (neither-dominated, or mostly empty). Never a count.
14. **UF14 · Allentown says so.** The area card for downtown Allentown's neighborhood and its town both read "Mostly easy on foot" on the
    fixture; the card for the mall's surroundings does not.

### The heads-up

15. **UF15 · Two reasons to speak.** Along a navigated route the silent heads-up (specs/walkability-headsup) says so before a stretch of fast
    road built around cars (WH1, as shipped), and also as the route **enters** ground built around cars: a run of car cells of 300 m or more
    along the route. The second says "Next: an area built around cars" (with no street name; no digit), once per run, with every other WH rule
    (200 m ahead, silent, kept 15 s past, one at a time, never touches the route). A run that overlaps a fast-road stretch is said once, as the road.
16. **UF16 · The heads-up needs no switch.** As before it reads the route's tiles itself and does not need the layer on (WH10).

### What it needs

17. **UF17 · Reads stay as they were, plus two.** Cells need the same z14 tiles the layer already reads (specs/walkability WK2-WK4) and the
    places the area already reads (specs/activity-density AD3-AD8, by the same tiles and the same cache). Nothing is read while the layer is
    off and no card is open (WK4). The only new network request is Overture's `connector` layer, which sits in the transportation tile already read.
18. **UF18 · Cost.** Judging up to 12 tiles' cells takes under a second on a laptop and is O(n log n) in the ways, with a spatial index
    (AGENTS.md). Cells are recomputed only when the tile set or its facts change.
19. **UF19 · Failure says nothing.** If the tiles can't be read, or no cell is foot or car, nothing is tinted, the legend's status says
    "Not available now" only if nothing could be read, and nothing else changes (WK3).
20. **UF20 · Truth is untouched; local-only holds.** Walks, trace points and captures, and what a walk credited, are unchanged. No
    `SNAP_RULES` bump. After a tile is cached, nothing about walkability leaves the device (WK18).

## What is retired

- **WK13's line layer** (stretches drawn as lines), replaced by the tint (UF9). The `mixed` band is no longer drawn or named on a map.
- **WK5-WK8 as the map's and the card's basis.** The street band stays only where a single road is the point: the heads-up's fast-road
  stretch (UF15) and the tooltips' words.
- **WK11's basis** (street length per band), replaced by UF13.

## Not in this slice

- Routing that avoids car-oriented ground, or any "walk this way instead" (decision 0022).
- A score, rank or comparison of places, or "most walkable".
- Slope, lighting, surface, traffic volume, transit stops.
- The long press on a drawn stretch (specs/walkability WK14, deferred): there are no drawn stretches now; a long press on a tint is its own call.
- Native credits for the walkability data (as before).

## Record

**Built 2026-11-05**, on branch `claude/walkability-urban-form`, as the Walkability layer of specs/map-layers. Unit tests: `walkForm` (UF4-UF7,
the five real places), `walkJunctions` (UF3), `walkTint` (UF9, UF12), `walkSummary` (UF12-UF14), `walkAreaAhead` (UF15), `walkReader`,
`walkNetwork`, `walkOverture` (UF3, UF8), the Db contract (the `junctions` column). The e2e journeys `walkability` (UF3, UF9-UF14), `layers` and
`headsup` (UF15). Real fixtures: `scripts/fixture-walkability.mjs` writes `walkFixtures.json` from Overture release 2026-10-21.0 (about 450 KB).

Changed while building, so the criteria above read differently than as first written:
- **UF3: street junctions, not every connector, and not segment ends.** The first cut counted every Overture connector (1,405 per km² downtown,
  531 at the mall: a car park read as a grid), and a second idea, shared segment ends, found almost none because connectors sit partway along a
  segment. The criterion now counts connectors two streets share, read from the connectors a segment lists. The thresholds in UF4 moved to the
  right scale (45 and 30 per km², not 600 and 450).
- **UF4: arterial tolerance with evidence.** Downtown Allentown's main streets are arterial by class (0.60 share) with crosswalks and sidewalks
  mapped everywhere; with the first rule it read car. The arterial limits are looser where crossings or sidewalks are mapped.
- **UF17: reads.** The tile set is now 1.5 km around the map's centre (a cell's whole neighbourhood must be inside the tiles read), and the area card
  reads the ring plus one neighbourhood beyond it.

Not done, not proven:
- **UF6's places threshold (150 weighted places per km²) is untuned.** No real places fixture exists; the rule is unit tested with synthetic
  numbers, and the e2e's fake places never reach it. A real town may lift too many or too few middling cells.
- **The thresholds are pinned by five places.** A sixth can disagree. They are in one table, `walk/form.ts`.
- **The tint's look on a phone is seen only on the web build** (soft green and orange over the streets, no seams). Native has never run it.
- **UF18's 12-tile bound** is checked on 36 real tiles (133 ms for the judging, not the read).
- **Nothing here has run on a device** (`docs/NATIVE_UNVERIFIED.md`).

