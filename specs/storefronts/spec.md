<!-- Repo first: written from the owner's calls in a session (Nov 14, 2026), judged at the vision gate the same day. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Circuits (a route across several towns through the shops of a kind, saved and revisited) are a later slice that reads this slice's data. -->

# Storefronts: the shops as data, and a layer to see them (SF)

Nov 14, 2026 · @Miguel Guerrero

Chronicles knows shops only as a weight: they make a street busy (activity density, decision 0080) and are never drawn as places, never marks (decision 0044). A later slice, circuits, needs the shops themselves: a walker picks a kind of shop (thrift, antiques, books, records) and the app shapes a journey across several towns through the shops of that kind, which can be walked again another day for different wares. That cannot read the area around the walker, because it reaches towns the walker has never opened.

This slice stands up what circuits will read, and nothing more: **the data** (every OpenStreetMap `shop=*` storefront, built by a new adapter in chronicles-data into regional packs, each place with its shop type and a chain flag) and **a layer** (an off-by-default "Storefronts" layer on every map that has the Layers button), kept apart from Explore's presence and busy streets. It plans no route.

## Decisions (the owner's calls, Nov 14)

- **Every `shop=*` is ingested** into the pack; the layer draws only the places-to-go types for now (the ones presence already weights as `boutique`: antiques, second_hand, charity, gift, florist, boutique, jewelry, toys, outdoor, photo, stationery, clothes, bag, books, music, musical_instrument). Errand shops (supermarket, convenience, hairdresser, car repair and the rest) stay in the pack, undrawn, for circuits or a later layer switch.
- **Chains are ingested and flagged** (from `brand` and `operator` tags), never dropped. The tap card says "A chain" only when the record says so and says nothing otherwise: no brand tag does not prove a shop independent.
- **The source is a new OpenStreetMap shop adapter in chronicles-data** (decision 0108): a `locates` source cut into regional packs on the CDN, with its contract pinned in the app.
- **A separate pack family**, with its own manifest, regional PMTiles files and contract schema, beside the places archive and never merged into it.
- **Every map with a Layers button gets the layer**: Explore, Navigate ready and the live walk. The vision gate argued once for leaving the walk out (restraint); the owner kept it, so SF12 and the `ux-reviewer` pass guard it.
- **No labels, the name on a tap** (0115's rule for places out of town, applied here).
- **Circuits are a later slice.** This one adds no route, no walk planner input and no saved circuit.

## Vision

```
Idea: Ingest every OSM shop=* storefront through a new chronicles-data adapter into regional packs (shop type
  plus a chain flag), and add an off-by-default "Storefronts" layer on every map that has a Layers button
  (Explore, Navigate ready, the live walk), separate from Explore's presence and density.
Verb: earn, thinly. The ingest is no surface. The layer shows where shops are, which raises what you notice
  only while it stays structural. Its real job is to be the substrate for the later circuit slice.
Touches:
  - 0044, "Food, shops and nightlife stay in the place cache only to feed the landing's density." A shop is
    never a mark. The layer is not a mark, but it is the first time shops are drawn as individual places, so
    the owner amends 0044 for a layer (precedent: 0115 and 0116 amended it for one-of-a-kind businesses, only
    through a structural signal; this ingests every shop=*).
  - Never "Popularity, trending, foot traffic, other people's activity": not touched while no popularity or
    opening-hours signal is ingested.
  - Never "Tallies such as '12 of 87'": a clustered layer tempts a numbered cluster. 0115's precedent is one
    same-size mark with no number. Layers rule: no number, count or percentage on the button, the panel or a
    legend.
  - Never "Ratings, reviews, stars, 'best of', rankings": not touched; the chain flag is structural (brand and
    operator tags), never editorial.
  - Never "Data leaving the device without a tap": not touched, as in 0103 (a pack read by tile from our own
    host, already in ALLOWED_HOSTS).
  - Always "Guidance is structural: where there is a lot, and what makes a place itself": a map of all shops
    says where, not what makes a place itself; it is a directory, which is why it is a substrate and a layer,
    not a feature of Explore.
  - Always "Restraint in motion, colour and copy": a dense layer on the live walk is the risk (the gate argued
    once; the owner kept the walk).
  - Shapes: "Several routes to one point, Apple Maps style: out; Open in Maps hands that job to the phone's
    maps app." A general business map is the same territory; it fits only as the substrate for circuits.
  - 0117: showing a place is the value, its kind a bonus; no extra data is fetched to sort a place.
Verdict: aligned if reshaped
Shape: A data substrate (the pack) and one quiet layer. Storefronts are same-size marks, no number and no
  cluster count, no label naming a shop (the name appears only on a tap), no found or not-found state. They
  never join the atlas, checklists, presence, density, kinds, marks or Explore's chip and nudge. A record
  carries a shop type, a name, a position and a chain flag, and no rating, popularity, hours or description.
Criteria: SF1-SF18 below carry the gate's nine.
Open: none (the owner, Nov 14: places-to-go types only for now; no labels, the name on a tap; the walk kept).
```

## Criteria

The owner's task, in their words: "a separate layer on the map that addresses the commercial storefronts themselves ... separate from Explorer mode, which is only interested in the presence of activity in an area."

**The task, and finding it**
- **SF1.** On Explore, the Navigate ready map and the live walk, switching Storefronts on in the Layers panel draws the places-to-go shops of the area the map shows. **Finding:** someone who is not told where it is opens the map's Layers button, sees a "Storefronts" row with its own icon and a legend, and cannot mistake it for "Busy streets" (a different icon and words); the cold find by the `ux-reviewer` places it.
- **SF2.** The layer is off by default. While it is off nothing is read, fetched or drawn for it, and a fresh install's `map_layers` holds it off.
- **SF3.** Every host of the Layers button offers it and draws it (Explore `(tabs)/explore.tsx`, Navigate ready `useReady`, the live walk `walk.tsx`), on web and on native, from one setting (turning it on in one map is on in the others); the Start dialog's legend (`StartSettings`'s `LayersKey`) lists it like the other layers.

**The data**
- **SF4.** A pack record carries the shop type (the OpenStreetMap `shop` value), a name, a position and the chain flag, and nothing else. The reader keeps exactly those and drops any other field, so a rating, popularity, hours, description, phone, website or source field in a pack never reaches a place the app holds.
- **SF5.** The chain flag is true when the record says so; the reader never invents one. A record with no flag is read as not flagged.
- **SF6.** Storefronts are read by tile from the storefront pack through `lib/net`, from the region and file the storefront manifest names, never stored in the place cache; the manifest is checked at most daily (meta `storefronts_manifest`, `storefronts_checked_at`); the app asks no host beyond the ones already allowed.
- **SF7.** A missing, failed or empty pack draws nothing and the panel says so in a quiet line under the layer ("Not available right now"): no alert, no error title, the other layers and the map unaffected, the switch stays as set.
- **SF8.** The app holds a pinned copy of chronicles-data's storefront contract, and a test holds the reader and the type table to it; a new contract version fails the test until the app takes its copy.
- **SF9.** The app's table from shop value to what the layer draws is one list: the places-to-go types draw; errand shops and any value not in the list never draw (unknown values are not guessed). A test pins the list, so a new drawn type is a deliberate change.

**The drawing**
- **SF10.** Every storefront draws as one mark of the same size and colour. At a zoom where marks would overlap, close ones merge into one mark of the same size with no number. Below a zoom (a stated constant) nothing draws and the panel's line says to zoom in.
- **SF11.** No map label names a storefront, and the layer adds no text to the map.
- **SF12.** The marks draw above the base map and under the walker's dot, the trace, the route, capture pins, mark pins and busy names; on the two walk maps (Navigate ready, the live walk) only within 800 m of you (as DC18); the capture stack and the controls stay uncovered.
- **SF13.** The Layers button, the panel, the legend and its tooltip show no number, count or percentage for Storefronts (the existing words grep covers its rows).

**The tap**
- **SF14.** A tap on a storefront (within the press's reach, and nothing nearer under the finger: a capture pin, a mark or the walker's own controls take the tap first) opens a small card with its name and its kind in words; with several in reach it picks the nearest and never lists them. Tapping elsewhere closes it.
- **SF15.** The card says "A chain" when the record is flagged and nothing about independence otherwise; it holds no rating, hours, popularity, rank, count, description, source or id, and no action (no Walk here, no route; Open in Maps and circuits are later).
- **SF16.** With the card open, capture stays one tap away on Navigate ready and the live walk: the card never covers the capture stack, and starting a capture is not blocked by it.

**Kept apart from Explore**
- **SF17.** Storefronts never enter presence, density, Busy streets, the atlas, checklists, kinds, marks, "?" pins or Explore's chip and nudge: no module of `presence`, `discovery`, `atlas`, `landing` or `explore` imports the storefront reader, reading them changes no cached place, area row or summary, and `PRESENCE_CODE`, `ATLAS_CODE` and `LANDING_CODE` are untouched.
- **SF18.** Nothing about a storefront is saved to the owner's data: no table, column or meta key beyond the manifest's two, and a moment captured beside a shop carries no reference to it (a moment keeps its own place and time, decision 0155's journal untouched).

## Not in this slice (deferred, recorded in `docs/DEFERRED.md`)

Circuits (planning, saving and revisiting); per-type switches and a chain filter in the panel; labels at high zoom; opening hours; a Walk here or Open in Maps action on the card; errand shops as a drawable set; storefronts outside the US region the first pack covers.
