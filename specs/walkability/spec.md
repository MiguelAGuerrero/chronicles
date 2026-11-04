<!-- Walkability. Written in the repo first (2026-11-04) from the owner's calls in the session on
     "a walkability index so we can mark areas that might need a car"; to be copied into the concept doc as a tab.
     The doc wins once it exists. DRAFT, updated 2026-11-04 with the owner's calls (Overture then Overpass; Explore and Navigate; icons with tooltips). -->

# Walkability (WK)

Each street segment is read for how it treats someone on foot: a sidewalk or a path beside it, a calm
speed, crossings, a road class made for people or for cars. The reading is a **band shown as an icon with a
tooltip in words**, never a number. Streets read as built around cars are drawn on a toggleable layer over
Explore's maps and the Navigate map, and the Navigate walk says so, quietly, before the way runs onto one. Areas are described in words from their
streets ("mostly easy on foot", "mostly built around cars").

"Built around cars" is what the map data says, not a ruling that a place can't be walked. OpenStreetMap
is thin on sidewalks in many places; **unmapped is not the same as absent**, and the app must never
claim a street is unwalkable because nobody mapped its sidewalk.

## Why

The owner wants to see, before and during a walk, where the map suggests a car is needed to get around
safely or efficiently, from sidewalks "or any other urban indication of pedestrian friendliness".
Today the app has none of it: the tiles are OpenMapTiles, whose `transportation` layer has no `sidewalk`
or `crossing` tag (`.claude/rules/streets-fog-snapping.md`), and `streets.ts` only uses mapped footways to
merge a sidewalk into its street.

## Decisions

- **Words, not a number** (the owner, 2026-11-04): the app computes bands and shows only words. This keeps
  AGENTS.md's "Nothing is a score". No percentage, count or 0-100 value is shown anywhere.
- **Data: Overture first, Overpass as the fallback** (the owner, 2026-11-04). Overture's transportation
  tiles (`transportation.pmtiles`, the same release and bucket as its places, read by byte range) carry
  each segment's class, speed limits and footways (`footway/sidewalk`, `footway/crosswalk`). Checked
  2026-11-04, release 2026-10-21.0: Zurich's z14 tile holds 666 sidewalk and 334 crosswalk segments,
  Phillipsburg's 14 sidewalks. Overture has no explicit "no sidewalk" tag, so on Overture alone `car` rests on
  class and speed. When Overture can't be read, the Overpass API supplies OpenStreetMap's own tags
  (`sidewalk*`, `maxspeed`, `crossing`). Both sit behind one `WalkSource` adapter; nothing is hard-coded.
- **Surfaces: the Explore maps and the Navigate map** (the owner, 2026-11-04): the area card's map, the atlas
  page's map, and the walk screen's map (Navigate), plus a warning while navigating.
- **Bands are icons with a tooltip** (the owner, 2026-11-04): a pedestrian mark for the index, a pedestrian
  with a cancel or a car for the worst band. Words are the tooltip and the accessible label.
- **Unit: the street segment** (the owner, 2026-11-04): the bands live on the segments the app already
  derives; areas are summarized from them.

## Bands

Four. Each has an icon (a pedestrian mark, built from the app's `Icon`) and words that are its tooltip and
accessible label. The icon differs by shape, never by colour alone.

| Band | Icon | Words (tooltip, label) | Meant |
|---|---|---|---|
| `foot` | the pedestrian | "Easy on foot" | a street made for people (pedestrian, living street, footway, path), or a street with a mapped sidewalk and a calm speed |
| `mixed` | the pedestrian with a caution badge | "Mixed" | a sidewalk on one side, a busier street with a sidewalk, or a calm street with nothing mapped |
| `car` | the pedestrian with a car badge | "Built around cars" | a fast or major road with no mapped way for people beside it, or mapped as having none |
| `unknown` | none | none | a road with too little tagged to say; drawn as nothing and counted as nothing |

## Acceptance criteria

### Reading the data

1. **WK1 · Facts come from Overture, by tile.** For every z14 tile a walkability read covers, the app reads
   Overture's transportation tile for it (byte ranges of `transportation.pmtiles`, the release the places
   already follow, AD6) and keeps each segment's class, subclass, speed limits, level and road flags, and its
   footways' kind (sidewalk, crosswalk, path). The request carries the tile and nothing else: no account, key,
   device id or position beyond the tile.
1b. **WK1b · Overpass answers when Overture can't.** If Overture's tile can't be read (unreachable, release
   gone, 10 s deadline), the same tile is asked of the Overpass API for its ways with their `highway`,
   `sidewalk`, `sidewalk:left/right/both`, `maxspeed`, `lanes`, `crossing`, `footway`, `foot` and `access`
   tags. The request carries the tile's bounds and nothing else. A tile read from Overpass is marked as such,
   and is read from Overture again on a later read. If both fail, WK3.
2. **WK2 · Cached per tile, once per build.** A tile's data is stored on the device, tagged with the
   source's build and `WALK_CODE`, and read from there afterwards. While the app is open a tile is
   requested at most once, however many reads cover it (a failed request is forgotten, so a later read
   tries again).
3. **WK3 · Offline and failure never fail a read.** If the source can't be reached, times out (10 s) or
   answers with an error, the walk, replay, Explore and navigation behave as before and every segment
   without data reads `unknown`. The area is marked as read without sidewalk data and read again on a
   later read, after a wait (2 min and 100 m, like route reads).
4. **WK4 · Reads stay small and polite.** One tile request at a time; at most 12 tiles per read; a tile is
   asked for only when something needs it (an overlay on, a route ahead, a card opened), never for the
   whole of a walk. The source's rate limit answers (429, 504) back off instead of retrying at once.

### Judging a segment

5. **WK5 · A segment's band follows its tags.** `bandOf(segment facts)` is a pure function with a fixed
   table: pedestrian ways and living streets are `foot`; a street with `sidewalk` both/left/right/separate
   at a speed of 50 km/h (30 mph) or less is `foot`; with a faster speed, or on a primary or secondary
   class, `mixed`; `sidewalk=no|none` (both sides) on a class of secondary or above, or any road at
   70 km/h (45 mph) or more with no mapped way beside it, is `car`; motorways, trunks and their ramps are
   `car` unless a separate path runs beside them; a service road, track or unclassified road with nothing
   tagged is `unknown`.
6. **WK6 · A separate path counts.** A footway or path mapped as its own way beside a street (running its
   way within 35°, within 25 m, the rule `streets.ts` uses for sidewalk merging) counts as that street's
   sidewalk on that side, as does a `sidewalk=separate` tag.
7. **WK7 · Unmapped is not absent.** A street with no sidewalk tag at all is never `car` by that alone. On
   a calm residential class it is `mixed`; on anything busier it is `mixed` unless its speed or class
   makes it `car` by WK5. The words never say "no sidewalk" for an unmapped street.
8. **WK8 · Crossings and bridges are read.** A mapped crossing within 30 m of a segment's end lifts a
   `car` crossing street's band to `mixed` for the 60 m around it. A footbridge or tunnel that links two
   `car` stretches is its own `foot` segment and never takes the road's band (bridges and tunnels leave the
   ground, NB1).
8b. **WK8b · Overture's gap.** Overture says what is built, not what is absent: with Overture alone, a street
   is `car` only by its class and speed (WK5's second clause), never by "no sidewalk". Overpass-sourced tiles
   may use `sidewalk=no`.
9. **WK9 · Bands are derived, never patched.** Bands are computed from the cached tile facts and the
   street segments, in memory, and never stored per segment. A change to the table bumps `WALK_CODE`,
   which drops the cached tiles' derived results; the raw facts stay until the source's build changes.
10. **WK10 · Ids don't depend on which tiles loaded.** A segment gets the same band whichever neighbor tiles
    have been read. A segment whose own tile's data is missing is `unknown`, never taking a band from a
    neighbor's.

### Areas in words

11. **WK11 · An area is described from its streets.** A summary of a read area (a card's, a town's) is
    said in words from the share of street length in each band: "Mostly easy on foot", "A mix of easy and
    car-oriented streets", "Mostly built around cars", and nothing when most of it is `unknown`. The
    shares themselves are never shown. The words follow `lib/quietLines`.
12. **WK12 · Nothing is a score.** No walkability number, count, percentage, grade letter, rank or
    comparison between areas is shown or stored for display. No leaderboard, no "most walkable".

### What shows

13. **WK13 · A toggleable layer on the Explore and Navigate maps.** The area card's map, the Explore atlas
    page's map and the walk screen's map get a walkability switch (off by default, one setting for all,
    remembered, meta `walk_layer`), shown with the pedestrian icon (WK21). On, `car` stretches draw in a
    warm hue and `mixed` in a faint one over the streets, `foot` and `unknown` draw as nothing. The fog and
    trace stay readable over it (it draws beneath them). Turning it
    on reads the tiles the view covers (WK4); while they load the switch shows a quiet "Reading" state, and
    if the source is unreachable a quiet "Not available now" line (WK3).
14. **WK14 · The layer says what it is.** A legend of the two drawn bands as icons (WK21), and one line:
    "From OpenStreetMap and Overture. Where sidewalks aren't mapped, streets can read worse than they are."
    A long press on a drawn stretch names its street with the band's icon ("Main Street · built around cars").
15. **WK15 · A quiet warning while navigating.** When the Navigate route's way ahead crosses a `car`
    stretch of 100 m or more, the walk's strip says once per stretch, before the way reaches it (200 m
    ahead): the car-badge icon and "Next: a stretch built around cars on <street>". Silent: no sound, no haptic, no notification,
    no modal; it goes after the stretch is passed or after 15 s, whichever is later, and a stretch is
    said once per route. A route with no `car` stretch, or with no data (WK3), says nothing.
16. **WK16 · The warning never blocks the way.** It adds no button that changes the route, no
    "avoid" choice, and does not reroute. Route choice is unchanged by walkability in this slice.
17. **WK17 · Credit.** Where the app credits its map data, it also credits OpenStreetMap contributors and
    Overture Maps Foundation for the walkability data (Overture is already credited, AD16; Overpass tiles add
    nothing new). On web; native's own credits are deferred like AD16.

### Everywhere else

18. **WK18 · Local-only holds.** After a tile is cached, nothing about walkability leaves the device. The
    only request is WK1's, and it is the same kind as the map's own tile requests.
19. **WK19 · Truth is untouched.** Walks, trace points and captures, and what a walk credited as walked, are
    unchanged by walkability. It adds a derived cache and a layer; it changes no snapping rule (no
    `SNAP_RULES` bump) and `purgeDerived` clears it.
20. **WK20 · A reload keeps it.** The layer's switch state and every cached tile survive a reload; after a
    build change the tiles are read again (WK2).

### Icons and tooltips

21. **WK21 · A band is an icon.** `WalkBandIcon` draws a band as the pedestrian mark, with a caution badge for
    `mixed` and a car badge for `car` (the owner asked for a cancel or a car; the car is used, since a cancel
    reads as "no walking"). `foot` is the pedestrian alone; `unknown` draws nothing. Bands differ by shape, so
    they read without colour. Wherever a band is named (the switch, the legend, the long press, the warning),
    its icon stands with it.
22. **WK22 · Every band icon has a tooltip.** Hovering or focusing it on web, and tapping or long-pressing it on
    a phone, shows its words ("Easy on foot", "Mixed", "Built around cars") in a small popover beside it
    that closes on its own after 4 s, on a tap elsewhere or on Escape. The same words are its
    `accessibilityLabel`. The popover is inline, never a `Modal` (iOS can't present a Modal over a Modal) and
    takes its timing from `lib/motionTokens`.
23. **WK23 · The tooltip never scores.** The words are the band's name and, for `mixed` and `car`, one short
    reason without numbers ("a busy road with no sidewalk mapped"). No count, share, speed or percentage.

## Not in this slice

- Routing that avoids car-oriented streets, or "walk this way instead" (suggested routes are deferred, 0022).
- Any score, rank, "walk score" or comparison of areas.
- Amenity-based walkability (shops within reach, intersection density, block length) as signals. A later
  slice can add them to the table; the activity density already exists beside this.
- Street lighting, surface, slope, traffic volume.
- The replay's mention of a car-oriented stretch.
- Native credits for OpenStreetMap sidewalk data (as AD16).
