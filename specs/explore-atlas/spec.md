<!-- Explore atlas. Written in the repo first (2026-11-03) from the owner's go-ahead on the "Explore Atlas" mock
     (https://claude.ai/artifact/WMfAxdTmaxGcyS63rJmXSa); to be copied into the concept doc as its own tab. The doc wins once it exists. -->

# Explore atlas (AT)

Explore stops being a lens over the map. It becomes an atlas of the areas near you:
a grid of same-scale tiles, one per neighborhood or town, each a small picture of
what is there, under a small map. It answers "what's around me, and what is each
place like?" before a walk. Planning (keeping areas for later) is a later slice.

## Decisions

- **The atlas replaces the drawer** (the owner, 2026-11-03, after two mocks and an
  adversarial review): a grid you can compare at a glance, never a swipe deck.
- **Presence, not quality** (the owner, 2026-11-03): bars say how much of a kind
  is there, never how good it is. They must mean the same everywhere, against a
  fixed baseline, never relative to the neighbors.
- **Familiarity is the only progress** (the owner, 2026-11-03): "New to you" or
  how many times you walked there. Nothing else counts.
- **Defaults for the open questions** (the owner said "proceed with reasonable
  defaults", 2026-11-03):
  - a town's bars describe the ring around its point (its centre), and its card
    says so;
  - the "How bars count" panel names the fixed steps, as an explanation of the
    scale, never a count of an area;
  - tiles show the mini-map, not your photos;
  - "Keep" (planning) is left out;
  - the long press on the map keeps What's good here and Walk here.

## Acceptance criteria

1. **AT1 · Near you, nearest first.** Explore lists the neighborhoods near your
   last known position, nearest first. The one you are in (or nearest within its
   reach) leads and says "You're here". Explore reads one fix as the app opens
   (NV16, the owner's call, Nov 3: Explore is now the opening tab). Until it comes,
   or when it fails, it shows the areas around where it last listed them, without
   "You're here"; with none at all, it says how to get a position (Find me) instead
   of an empty grid.
2. **AT2 · The hierarchy is the grid** (the owner, Nov 3: a switch between
   levels didn't work, because they nest). Explore opens on the town you are in:
   its name is the title, the neighborhoods near you are the grid, and "Towns
   nearby" follow. A town's tile opens its page: its own picture and bars, then its
   own neighborhoods (those within its reach that belong to it, not to the town
   beside it). The back pill low on the page, Back and Escape return; the title has no
   back arrow (the owner, Nov 4: two back buttons; decision 0077). A town with no
   neighborhoods on the map says it is one area.
3. **AT3 · A tile.** Each tile shows the area's name, how far it is (a walking
   time, or a distance once it is over an hour), "New to you" or "Walked N times",
   and the eight kinds in one fixed order (history, art, culture, green, views,
   food, shops, nightlife), each with 0 to 3 bars.
4. **AT4 · Bars mean the same everywhere.** An area's bars come only from the
   places inside an 800 m ring around its point, whatever its level, measured
   against fixed steps per kind. The same places in the ring give the same bars
   in any area, any town, any level.
5. **AT5 · No bars until the ring is read.** A tile whose ring hasn't been read
   in full under the current map build shows "Reading this area…" and no bars.
   Rings are read by themselves while Explore is open, nearest first, one at a
   time, with no button. A failed read is tried again no sooner than 2 minutes
   later.
6. **AT6 · Every tile is the same map at the same scale.** The tile's picture is
   the ring and what is in it: streets, busy streets (magenta), parks (green), the
   streets you walked (the trace's green), a "?" for each kind still waiting to be
   found, and a check for each find. The ring fills the same share of every tile.
7. **AT7 · No names before you find them.** Nothing on the tab names an unfound
   place: "Waiting to be found" shows kinds only. Finds are named.
8. **AT8 · The area's card.** Tapping a tile opens its card: the larger picture,
   the eight kinds with a word (none, some, plenty, lots) and bars, "How bars
   count", the busy streets, what's waiting, what you found, the areas next door
   with the walk from this area, and Walk to (its busiest street, else its
   point). The area you are in has no Walk to. Back, Escape, a tap outside and ✕
   close it.
9. **AT9 · The small map follows.** The map above the grid shows the areas'
   points, and the selected area's 800 m ring. Selecting a tile frames its area.
10. **AT10 · What I'm into.** A kind switched off in "What I'm into" shows no "?"
    on the tab. Bars still show every kind: they describe the area, not your
    filter.
11. **AT11 · Nothing is a score.** No "N of M", no count of places, on a tile or a
    card. How far it is and the walked count are the only numbers about an area.
12. **AT12 · Cache, not truth.** What the atlas reads is a cache tagged with the
    map build and its own rules version. A new build, or new rules, reads the
    areas again; clearing derived data clears it.
13. **AT13 · Screen readers.** Each tile is one button whose label says the area,
    how far, your familiarity, each kind present with its word, and the busy
    street. The card's sections are headers.
14. **AT14 · Towns.** The Towns level lists towns, villages and cities within
    12 km, nearest first (a village is a town in a rural place); their card says
    the bars are "around its centre".

15. **AT15 · The title floats over the map.** The map runs to the top of the
    screen, under the status bar, and the page's title and subtitle sit over it on
    a card lifted by a shadow: no empty band above the title.
16. **AT16 · A tile says what the area is like.** Besides its picture and bars, a
    tile has a line in words about what the area has most of ("Lots of history and
    food", "Plenty of green space", "A little of everything", "Quiet"), and its
    busiest street, in magenta, when it has one.

## Record

Built 2026-11-03 on branch `explore-atlas`: AT1-AT14 pass in `atlas.test.ts` and
the e2e's Explore section. Native has not run on a device.

### Round 3 (2026-11-03, the design review's fixes, the owner: "proceed with all of it")

- **Walk to:** a footer always in sight, "Walk to <area>", with "Starts you at <street>, its busiest street".
- **The card:** a sheet that opens at 58% of the screen and rises to 90% by its handle. On wide screens it is a side panel. Focus moves to its name. Next door says "11 min from <area>".
- **The long press:** its choices sit over the map in one row. They clear on any page change or when the tab is left. Below z10 it shows "Zoom in to look closer". A one-time hint says the long press exists.
- **Your town:** it is the title and the way into its page, never listed again; the others are "Other towns". Town tiles have a "See its neighborhoods" footer. A back pill sits low on a town's page.
- **Presence (decision 0067):**
  - presence as dots;
  - tiles show only the kinds present;
  - "none" at full ink;
  - "How the marks work" in words;
  - "Not much on the map here" in place of "Quiet".
- **Layout:**
  - tiles read name, character, one meta line, busy street, kinds;
  - areas are named on the small map (the nearest three, and the selected one);
  - three columns from 700 px, and map and list side by side from 1000 px;
  - the title is aligned with the grid.
- **Not done:** highlighting an area's dot as its tile scrolls to the top (`docs/DEFERRED.md`).

### Round 2 (2026-11-03, after the owner's look on an iPhone)

- The title over the map (AT15), the hierarchy in the grid in place of the switch (AT2), the character line and busiest street on tiles (AT16).
- The area card showed only its header on an iPhone's Safari: it is now sized in pixels measured by the screen, and the e2e checks its body sits inside it.

### Audit (2026-11-03): 14 findings, 11 fixed, 1 partly fixed, 1 deferred, 1 rejected

1. The atlas never follows you after the tab mounts: accept. A newer last fix on focus moves it; covered by the e2e flow and typecheck.
2. A build change while focused loops near reads: accept. `atlasStep` adopts the new build (`explore-atlas audit 2`).
3. A ring read that throws retries every 1.5 s: accept. It is marked failed and waits (`explore-atlas audit 3`).
4. Offline at focus never tries again: accept. The step waits and re-checks the build (`explore-atlas audit 4`).
5. The sketch cap keeps arbitrary streets: accept. The nearest are kept (`explore-atlas audit 5`).
6. Ring reads are heavy and compete: partly accept. Rings no longer rewrite the shared street and place caches, and they wait while the walk's explore read runs. Tile-level de-duplication across rings is deferred.
7. Next-door areas outside the list: accept. Next door and cards come only from the listed areas; covered by typecheck and the e2e.
8. A card left open takes Back and Escape on other tabs: accept. Leaving the tab closes it (`explore-atlas audit 8`, e2e).
9. Tile memo defeated: accept. The list, ring data and callbacks are kept stable; covered by review (no perf check added).
10. The card's picture crops on wide screens: accept. It is capped at its 4:3 width; covered by review.
11. Walk to a town navigation refuses: accept. Only within `NAV.maxM` (`explore-atlas audit 11`).
12. Villages appear as towns: reject. In a rural place the village is the town (Foster); AT14 now says so.
13. Old-build rows read whole on every focus: defer (`docs/DEFERRED.md`).
14. The plan and the code disagree on keys: accept. The plan is corrected.

UI notes taken: each level is framed once its areas are listed; the scrim is no longer a second Close for screen readers. Left as is: focus trapping on web and Android (as the other cards), and the title until towns are read.
