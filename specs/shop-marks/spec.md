<!-- Repo first: written from the owner's calls in a session (Nov 14-16, 2026), judged at the vision gate on Nov 14 and reshaped on Nov 16 when the owner folded it into the Storefronts layer (decision 0180). Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Circuits (a route across several towns through the shops of a kind, saved and revisited) are a later slice that reads this slice's data. -->

# Shop marks: the shops as data, and as marks inside the Storefronts layer (SM)

Nov 14-16, 2026 · @Miguel Guerrero

Chronicles knows shops only as a weight: they make a street a storefront street (decisions 0080, 0140, 0180) and are never drawn as places, never marks (decision 0044). The Storefronts layer (decision 0180, which was "Busy streets") shades the streets lined with places you walk into. A later slice, circuits, needs the shops themselves: a walker picks a kind of shop (thrift, antiques, books, records) and the app shapes a journey across several towns through the shops of that kind, which can be walked again another day for different wares. That cannot read the area around the walker, because it reaches towns the walker has never opened.

This slice stands up what circuits will read, and nothing more: **the data** (every named OpenStreetMap `shop=*` shop, built by a new adapter in chronicles-data into regional packs, each place with its shop type and a chain flag) and **the marks** (individual shops drawn inside the one Storefronts layer, on every map that has the Layers button, where a pack covers the map). Storefronts and shop marks are one concept seen at two distances: the street shading says where there is a lot, the marks say what stands there. It plans no route.

## Decisions (the owner's calls, Nov 14 and 16)

- **Every named `shop=*` is ingested** into the pack (a shop with no name is not a record); the marks draw only a stated list of shop types for now (the ones presence already weights as `boutique`: antiques, second_hand, charity, gift, florist, boutique, jewelry, toys, outdoor, photo, stationery, clothes, bag, books, music, musical_instrument). The rest (supermarket, convenience, hairdresser, car repair and the others) stay in the pack, undrawn, for circuits or a later switch. No copy calls the drawn types "places to go" or the others "errands" (steward S1): the list is a mechanical rule, not a verdict.
- **Chains are ingested and flagged** (from `brand` and `operator` tags), never dropped. The tap card says it only when the record says so, worded as what the map data records, and says nothing otherwise: no brand tag does not prove a shop independent (the owner, Nov 14; wording per steward S2, for the owner to confirm).
- **The source is a new OpenStreetMap shop adapter in chronicles-data** (decision 0108): a `locates` source cut into regional packs on the CDN, with its contract pinned in the app.
- **A separate pack family** ("shops": files `shops-<region>-<date>.pmtiles`, tile layer `shops`), with its own manifest and contract schema, beside the places archive and never merged into it.
- **One Storefronts layer** (the owner, Nov 16): "busy streets always referred to the density of stores"; the two are not distinct concepts. The marks are not a layer of their own: the switch, name and id are 0180's, the street shading stays as it is, and the marks appear over it where a pack covers the map and the map is zoomed in.
- **Every map with a Layers button gets it**: Explore, Navigate ready and the live walk. The vision gate argued once for leaving the walk out (restraint); the owner kept it, so SM12 and the `ux-reviewer` pass guard it.
- **No labels, the name on a tap** (0115's rule for places out of town, applied here).
- **Nothing says busy** (0180's SF13 holds): a mark is a shop, never a storefront; the concept the layer shades is storefronts.
- **Circuits are a later slice.** This one adds no route, no walk planner input and no saved circuit.

## Vision

```
Idea: Ingest every named OSM shop=* shop through a new chronicles-data adapter into regional packs (shop type
  plus a chain flag), and draw the shops as marks inside the Storefronts layer on every map that has a Layers
  button (Explore, Navigate ready, the live walk), where a pack covers the map.
Verb: earn, thinly. The ingest is no surface. The marks show where shops are, which raises what you notice only
  while it stays structural. Its real job is to be the substrate for the later circuit slice.
Touches:
  - 0044, "Food, shops and nightlife stay in the place cache only to feed the landing's density." A shop is
    never a mark of Explore. The marks are drawn in a layer, but it is the first time shops are drawn as
    individual places, so the owner amends 0044 for the layer (precedent: 0115 and 0116 amended it for
    one-of-a-kind businesses, only through a structural signal; this ingests every named shop).
  - 0180: Storefronts is the density of places you walk into, never traffic. The marks are the same concept
    closer; nothing here says busy, and no line counts storefronts.
  - Never "Popularity, trending, foot traffic, other people's activity": not touched while no popularity or
    opening-hours signal is ingested.
  - Never "Tallies such as '12 of 87'": a merged mark tempts a numbered cluster. 0115's precedent is one
    same-size mark with no number. Layers rule: no number, count or percentage on the button, the panel or a
    legend.
  - Never "Ratings, reviews, stars, 'best of', rankings": not touched; the chain flag is structural (brand and
    operator tags), never editorial.
  - Never "Data leaving the device without a tap": not touched, as in 0103 (a pack read by tile from our own
    host, already in ALLOWED_HOSTS).
  - Always "Guidance is structural: where there is a lot, and what makes a place itself": a map of all shops
    says where, not what makes a place itself; it is a directory, which is why it is a substrate inside a
    layer, not a feature of Explore.
  - Always "Restraint in motion, colour and copy": a dense layer on the live walk is the risk (the gate argued
    once; the owner kept the walk).
  - Shapes: "Several routes to one point, Apple Maps style: out; Open in Maps hands that job to the phone's
    maps app." A general business map is the same territory; it fits only as the substrate for circuits.
  - 0117: showing a place is the value, its kind a bonus; no extra data is fetched to sort a place.
Verdict: aligned if reshaped
Shape: A data substrate (the pack) and marks inside the one Storefronts layer. Shop marks are same-size hollow
  rings, no number and no cluster count, no label naming a shop (the name appears only on a tap), no found or
  not-found state. They never join the atlas, checklists, presence, density, kinds, marks or Explore's chip
  and nudge. A record carries a shop type, a name, a position and a chain flag, and no rating, popularity,
  hours or description.
Criteria: SM1-SM18 below carry the gate's nine.
Open: none (the owner, Nov 14: a stated list of types only for now; no labels, the name on a tap; the walk
  kept. Nov 16: one Storefronts layer).
```

## Criteria

The owner's task, in their words: "the commercial storefronts themselves ... on the map, apart from Explorer mode, which is only interested in the presence of activity in an area" (Nov 14), and on Nov 16 "the two aren't distinct concepts": see the shops where the Storefronts layer shows where there are many.

**The task, and finding it**
- **SM1.** On Explore, the Navigate ready map and the live walk, with the Storefronts layer on and a shop pack covering the map, the listed shops of the area the map shows draw as marks over the street shading. **Finding:** someone who is not told where it is opens the map's Layers button, sees the one "Storefronts" switch and, once on, its one line saying "Shops from OpenStreetMap. Tap a mark for its name."; the drawers' legend names the marks ("Shop marks"). The cold find by the `ux-reviewer` places it. The panel holds switches and status lines only and the legend never sits over the map (the layers rule, Nov 5), so the legend row is in the two drawers that hold `LayersKey`.
- **SM2.** The marks add no switch and no setting: they follow the Storefronts layer, which is off by default. While it is off nothing is read, fetched or drawn for them. With no shop base set (`EXPO_PUBLIC_SHOP_MARKS_BASE` empty, as `PLACES_BASE` can be) the "Shop marks" legend row is absent, nothing is asked and the layer is the street shading alone: the marks are not offered before a pack exists (steward S4; the owner confirms).
- **SM3.** Every host of the Layers button draws them (Explore `(tabs)/explore.tsx`, Navigate ready `useReady`, the live walk `walk.tsx`), on web and on native, from the one Storefronts setting (turning it on in one map is on in the others). Where the meaning is said, per host: the panel's one quiet line on Explore and Navigate ready; the legend row in the two drawers that hold `LayersKey` (`walk.tsx` and `StartSettings`).

**The data**
- **SM4.** A pack record carries the shop type (the OpenStreetMap `shop` value), a name, a position and the chain flag, and nothing else. The reader keeps exactly those and drops any other field, so a rating, popularity, hours, description, phone, website or source field in a pack never reaches a place the app holds.
- **SM5.** The chain flag is true when the record says so; the reader never invents one. A record with no flag is read as not flagged. For one shop only the pack's flag is read: `chains.json` (0044's marks) is not consulted, so there is one definition of a chain here.
- **SM6.** Shops are read by tile from the shop pack through `lib/net`, from the region and file the shop manifest names, never stored in the place cache; the manifest is checked at most daily (meta `shop_marks_manifest`, `shop_marks_checked_at`); the app asks no host beyond the ones already allowed.
- **SM7.** Three states, each with its own words in the panel's quiet line under the Storefronts switch, and none with an alert or an error title: no region of the pack covers the map ("No shop marks here yet"); a covered area with no shops in it (no line: it is not a failure); a manifest or tile read that failed ("Couldn't read the shops"); and "Zoom in to see shops" while the map is too far out. The street shading's own "Reading…" and "Not available now" are said first (they are the layer's own state). The other layers and the map are unaffected and the switch stays as set. (Refines the gate's criterion 6, which said failures are silent as the archive's are: a layer the walker switched on and sees no marks from is told why; steward S4.)
- **SM8.** The app holds a pinned copy of chronicles-data's shop contract, and a test holds the reader and the type table to it; a new contract version fails the test until the app takes its copy.
- **SM9.** The app's table from shop value to what the marks draw is one list (presence's `SHOP_MARK_TYPES`): the listed types draw; any other value never draws (unknown values are not guessed). A test pins the list, so a new drawn type is a deliberate change. No copy, in the app or the pack, calls a drawn type worth going to or an undrawn type an errand; the legend tip names the source and "shop", not a list of types.

**The drawing**
- **SM10.** Every shop draws as one mark of the same size and colour, a hollow ring (so its shape and not only its tone tells it from the walker's dot). At a zoom where marks would overlap, close ones merge into one mark of the same size with no number. No mark's size, colour or opacity varies with how many shops it stands for. Below a zoom (a stated constant) nothing draws and the panel's line says to zoom in.
- **SM11.** No map label names a shop, and the marks add no text to the map.
- **SM12.** The marks draw above the base map and the street shading and under the walker's dot, the trace, the route, capture pins, mark pins and the storefront street names; on the two walk maps (Navigate ready, the live walk) only within 800 m of you (as DC18); the capture stack and the controls stay uncovered.
- **SM13.** The Layers button, the panel, the legend, its tooltip and the layer's status lines (`layers/notes.ts`) show no number, count or percentage for the marks: the words grep (`layers.test.ts`, ML6) covers the legend rows and this slice's tests cover the notes, which it did not before.

**The tap**
- **SM14.** A tap on one unmerged shop mark (within the press's reach, and nothing nearer under the finger: a capture pin, a mark or the walker's own controls take the tap first) opens a small card with its name and its kind in words, and rings that mark while the card is open; with several in reach it picks the nearest and never lists them. A tap on a merged mark zooms in to separate it (as 0115's star does) and opens no card. A tap that closes the card does nothing else (it does not fall through to Explore's panel, long-press or zoom handling).
- **SM15.** The card says it is a chain only when the record is flagged, worded as what the map data records (for example "Marked as a chain on OpenStreetMap"; the owner confirms the words), and nothing otherwise: no card, legend or mark treats an unflagged shop as independent, local or unique. It holds a name, a type and that line and nothing more: no rating, hours, popularity, rank, count, description, source or id, and no action (no Walk here, no route; Open in Maps and circuits are later). It is a polite live region.
- **SM16.** The card sits in a fixed region of the map's top, clear of the capture stack, and never intersects the stack's box at any viewport the journey sets, a short phone included; it has a close control of at least 44 px. With the card open, capture stays one tap away on Navigate ready and the live walk, and starting a capture is not blocked by it (the vision's Always: capture is one tap away).

**Kept apart from Explore**
- **SM17.** Shop marks never enter presence, density, the Storefronts layer's street shading, the atlas, checklists, kinds, marks, "?" pins or Explore's chip and nudge: no module of `presence`, `discovery`, `atlas`, `landing` or `explore` imports the shop reader, reading them changes no cached place, area row or summary, and `PRESENCE_CODE`, `ATLAS_CODE` and `LANDING_CODE` are untouched.
- **SM18.** Nothing about a shop is saved to the owner's data: no table, column or meta key beyond the manifest's two, and a moment captured beside a shop carries no reference to it (a moment keeps its own place and time, decision 0155's journal untouched). No shop carries a visited, passed, found or done state, in this slice or in what the pack's reader returns; the decision record that amends 0044 says the same of any later layer or circuit (a shop is never marked done, and a circuit shows no "n of m").

## Not in this slice (deferred, recorded in `docs/DEFERRED.md`)

Circuits (planning, saving and revisiting); per-type switches and a chain filter in the panel; labels at high zoom; opening hours; a Walk here or Open in Maps action on the card; errand shops as a drawable set; shops outside the US region the first pack covers.

## Record (Nov 16, 2026)

**Built and tested on web:** SM1-SM18, each first a todo (`50e009d`, 18 of 18 by `check:test-first`; the branch was first called "storefronts", prefix SF, and renamed on Nov 16, `check:test-first` reads the history under both), then real with its code. Unit tests in `src/lib/__tests__/shop-marks/` (48) and the `shopmarks` journey, which runs the three hosts: Explore's panel and drawing, Navigate ready (marks, the card, a tap elsewhere closing it, a merged mark zooming apart, a reload keeping the setting) and the live walk (marks within 800 m, the card clear of the capture stack), over a fixture pack the harness serves at `/shop-marks-e2e/`. After the merge with main: `layers`, `dense`, `shopmarks` and the journeys `check:affected` named run on the merged build.

**Reshaped on Nov 16 (decision 0182):** the owner said Busy streets and storefronts are one concept (decision 0180 renamed it Storefronts), so the marks are not a layer of their own. The slice was merged with main, its separate layer, row, icon and `offeredLayers` were dropped, and the marks became a second drawing inside the one Storefronts layer: a legend row "Shop marks" in the drawers (only where a pack address is set), and the marks' line joined to the shading's own in the panel.

**Calls made while building (the owner to overrule):**
- The shop list lives in presence (`SHOP_MARK_TYPES`), because the presence guard forbids spelling a source's tags anywhere else; the plan had it in the slice's folder. The kind words are derived, not a table. A pressTarget key could not be `shop` for the same reason.
- `parseManifest` takes a file prefix, so the shop pack reuses the places manifest reader.
- The marks' status goes to the panel through a small store (`shopMarks/status.ts`), and the hook keeps its read state in a ref: a read that finishes with no shops must not re-render Explore (`dense` DC12: the first read lands inside the measured switch).
- The shared map zoom for the live walk lives in `useReady` (the live walk reuses the ready map, which reports its view only when it changes).

**UI review (decision 0145).** Cold find: both pictures place the first tap on the Layers button; it is an icon with no word, so what it offers cannot be told from the picture (a shared control, deferred). Review: accepted and fixed, each behind a regression test named `shop-marks ui N`: **ui 1** (marks a hollow ring, so shape and not only tone tells them from the walker's solid dot), **ui 2** (the shop whose card is open is ringed), **ui 4** (the line says what the marks are), **ui 7** (the card is a polite live region; the close control is named "Close"). Rejected: U3 the bag icon beside the storefront icon (moot: the marks have no row or icon of their own now), U5 ghost text behind the panel (existing panel behaviour), U6 the card's width (opinion; the placement is tested, SM16). Not done: pictures of the status lines and of merged marks, which the harness cannot yet frame (the lines are unit-tested for words and digits).

**Deferred:** see `docs/DEFERRED.md`, "Shop marks". **Native has never run on a device:** the circle and selected-ring layers, the press rule, the walk screen's layer and the pack's byte-range reads are in `docs/NATIVE_UNVERIFIED.md`, "Shop marks".
