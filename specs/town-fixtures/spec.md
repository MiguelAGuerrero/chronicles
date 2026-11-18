<!-- A town's fixtures (slug town-fixtures, prefix TF). Written in the repo first (2026-11-18) from the owner's session; not a tab of
     the concept doc yet, and the doc wins once it exists. Nothing here is built. It needs a third pack in chronicles-data. -->

# A town's fixtures: what every settlement has, known ahead of time, as a layer of its own (TF)

Nov 18, 2026 · @Miguel Guerrero

The owner: "there has to be some delineation between municipalities' fixtures. So something that can be displayed on any area and
is not necessarily a point to find ... every area might have a visitor center or a plaza or something, right? These sort of things
that are staples in any developed community, town, or city. And I would want that to be known ahead of time. And the things to
discover within those is a separate ... Think of it like a separate pack or bundle that can be layered." Asked four things, they
chose: **describe and anchor**; **words only, no level**; **civic and gathering places**; **a stop, never a find** (decision 0222).

## Vision

```
Idea: The staples of a settlement (a visitor centre, a plaza, a town hall, a library, a market, a station) are told apart from the
  things to discover: known before you go, said in words on a town's card and marked on the map as a layer of their own, from a
  pack of their own; a place to begin from or pass, never a find
Verb: earn (knowing where a town's middle is and where to begin, before going), honour (a moment made at one keeps its place)
Touches: Never "Tallies", "Scores, levels, completion", "Counts on the Explore tab", "A list to work through"; Always "A find is a
  memory", "Restraint", "A gate of kinds, never a measure"; 0103 (a structured type decides), 0115 (places out of town), the map's
  layers (walkability, storefronts, borders), 0221 (kinds of stop)
Verdict: aligned if reshaped
Shape: what a town has is said in words and never counted, ranked or compared with another town's; no "level", tier or badge; a
  town with none says nothing, never "nothing here"; a fixture is not found, not listed as waiting and not part of any tally of
  what there is to see; the layer is drawn quietly, under the things to discover
Precedent: see "How adjacent apps do it"
Criteria: TF1-TF24 below
Open: four, at the end
```

The owner's phrase "asserts the level of a settlement" was put to them as a question, since a level is a score in this product's
terms: they chose words only.

## How adjacent apps do it

- **Apple Maps**: civic places (a town hall, a library, a post office, a station) are drawn on the base map with their own glyphs at every zoom they fit, with no switch for them and no list of a town's own. Source: from memory, unverified.
- **OpenStreetMap's standard map**: the same places are icons of the base map; a town's kind (city, town, village) is the size of its label and nothing else. Source: from memory, unverified.
- **AllTrails**: a trailhead page lists facilities (parking, toilets, a visitor centre) as a row of words and glyphs above the trail's description. Source: from memory, unverified. The nearest model for "what this place has, said ahead of time".
- **Foursquare / Swarm**: a town hall or a station is a place to check in to, counted and ranked. Source: from memory, unverified. The counter-example: a fixture as something to collect.

## Criteria

What a fixture is:

- **TF1.** A fixture is a place of a kind that a developed settlement is expected to have: a visitor centre, a town hall, a
  library, a post office, a plaza or square, a market, a main station. The list is closed, in the pack's contract, and drawn from
  the count of what OpenStreetMap holds in the US (chronicles-data's kind counts), shown to the owner before it is fixed.
- **TF2.** Practical amenities (toilets, parking, drinking water) are not fixtures.
- **TF3.** A kind is a fixture or a thing to discover, never both: the two lists share no kind. A place of a fixture's kind is
  never offered as something to find, anywhere.
- **TF4.** Fixtures reach the app through an adapter, from a pack of their own beside the places and stores packs, with an
  in-memory source for tests; none is hard-coded. A region with no pack shows none and says nothing.
- **TF5.** A fixture carries its kind, its position and its name where it has one; nothing a crowd says (no rating, no visits).

On a town's card:

- **TF6.** A town's card says what it has, in words, in one line: "A plaza, a library and a station." Kinds in a fixed order,
  each said once however many there are.
- **TF7.** The line holds no number, no "of", no tier, level, grade or badge, and nothing that sets one town against another.
  The card of a town with no fixture known has no such line: never "none", never "little here".
- **TF8.** The line is there for a town you have not been to, from the pack alone, before any outing: known ahead of time.
- **TF9.** Tapping the line shows the same fixtures on the card's own map; it lists no rows to work through.

On the map:

- **TF10.** Fixtures are a layer with its own switch in the map's layers, on at first, remembered as the other layers are.
- **TF11.** A fixture is drawn as a small glyph of its kind in the map's quiet ink, under the marks of things to discover and
  never in the accent or the colour of a find; its name shows only when it is tapped or at the zooms a street's name does.
- **TF12.** The layer is drawn for any area on screen, been to or not, and is not covered by the fog.
- **TF13.** Tapping a fixture opens a small sheet: its kind, its name, Open in Maps, and the way there on foot when it is in
  reach. No "find", no "mark", no count.
- **TF14.** The layer is read by tile and only for what is on screen; reads are bounded and can be stopped.

In an outing:

- **TF15.** A fixture can be where a journey's walk in a town begins, in place of the town's bare point, when one is at hand: a
  plaza or a visitor centre before a town hall, by a fixed order of kinds.
- **TF16.** A fixture can be a stop of a journey when its kind is among the kinds asked for (0221); it is named plainly, since it
  is not a discovery.
- **TF17.** A moment made at a fixture keeps where it was made, as any moment does (MC18). Nothing is said of the fixture having
  been visited.
- **TF18.** A fixture is never found: no find is made of one by a capture, by passing or by time spent, and none waits to be
  found.

What it never does:

- **TF19.** Nothing counts fixtures, in the app or in what is stored: no total for a town, a region or a person.
- **TF20.** A find already made of a place whose kind becomes a fixture is kept as the memory it is, shown as before in Chronicle;
  it is not un-found, and no new find of that kind is made.
- **TF21.** Nothing leaves the device beyond the pack's byte-range reads from the host the other packs come from.
- **TF22.** No notification, prompt or whisper is caused by a fixture, near or far.
- **TF23.** The words for kinds are the app's own, one table shared by the card, the sheet and the layer's legend.
- **TF24.** With the layer off, the card's line stays: the switch is the map's.

## Surfaces (from the code, to be confirmed in the plan)

- The map's layers (`src/lib/layers/registry.ts`: walkability, storefronts, borders): a fourth.
- Explore's area card (`components/atlas/AtlasCard.tsx`) and its words.
- The places adapters (`discovery/`), the kinds of "What I'm into" (`explore/explore.ts`: civic buildings, stations and others
  that move), finding (`.claude/rules/explore-marks.md`).
- The outing's areas and chapters (`outing/areas.ts`, `journeys.ts`).
- chronicles-data: a third pack and its contract.

## Open

1. **The list** (TF1): after the kind counts report. A church, a cemetery, a school and a park are each arguable as a staple.
2. **Which kinds move out of the things to discover** (TF3): civic buildings and stations are finds today; the owner's, kind by
   kind, with what it does to "What I'm into".
3. **Whether a fixture's glyphs belong on the base map's own style** or a layer over it: on the web the base style is the map
   host's; a layer over it is what the app controls.
4. **A town's "middle"** (TF15): whether the order of kinds is right, and whether it should change where journeys begin at all.

## Record

Nothing is built. Decision 0222. chronicles-data's kind counts now also count `place` (a plaza is `place=square`) and `railway`
(SK13), on its main; no run has reported yet.
