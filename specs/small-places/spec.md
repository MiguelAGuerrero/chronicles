<!-- Repo first: from the owner's request of Nov 14 (Pikmin Bloom's postcards; decision 0182). Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The data side is chronicles-data's: handoff.md. -->

# Small places: time capsules, little libraries, plaques and the like, from OpenStreetMap

Nov 16, 2026 · @Miguel Guerrero

## Vision

Idea: OpenStreetMap contributes small places of its own, the kind Pikmin Bloom's postcards reach (a time capsule, a plaque), with reasonable defaults so menial points of interest that don't differ in experience don't clutter the UI: those are off by default, each its own subgroup of its category, to be switched on (the owner, Nov 14).
Verb: earn ("what makes a place itself": the small things a walk passes without noticing)
Touches: VISION.md Never, "Tallies such as '12 of 87'" (nothing counts these places or treats them as a set; a find is a memory, never a postcard); Always, "Restraint… the content is the novelty, not the chrome" (the repetitive types start off); decisions 0103 ("an unmapped class is left out, never guessed"; type decides), 0108 (OSM is a source that locates, not a community nominator), 0109 (`access=private|no` keeps a place out), 0110 (superseded in part: OSM locates for this table only; the bounded whispers hold), 0115 (an exception: these weigh in the bars only when switched on), 0144 (subsets are refinements), 0180 (storefronts: none of these is a storefront).
Verdict: aligned if reshaped
Shape: a pinned table of OSM types, each a subset of an existing kind with a default (decision 0182); unnamed places named by their type; bars weigh them by the size of the stop, only when switched on; nothing counted.
Criteria: SP1-SP22.
Open: none for the gate; the plan's questions are the owner's.

## What it is

The places archive (chronicles-data) reads OpenStreetMap's tags only to confirm Wikidata's places today (0110), so a time capsule or a public bookcase only OSM knows never reaches the app. This slice takes the archive's new classes for a fixed table of small types, turns each into a subset ("What I'm into") under the kind it belongs to, starts the repetitive ones off, names an unnamed one by its type, and lets the area cards' bars weigh them by how much of a stop they are, only for a reader who has them on.

## Decisions

- **OpenStreetMap locates the small types** (the owner, Nov 14, decision 0182): "Yes, OpenStreetMap should contribute their places."
- **Defaults** (the owner, Nov 14, "Yes, as proposed"): off: Plaques and markers, Small memorials (benches, ghost bikes, Stolpersteine), Old stones (milestones, boundary stones), Wayside shrines and crosses; on: Time capsules, Little libraries, murals and sculptures, community gardens.
- **Unnamed places are named by their type** (the owner, Nov 14).
- **Ghost bikes and Stolpersteine are found places, off by default** (the owner, Nov 14).
- **Bars weigh them ¼, ½ or 1 by the size of the stop, only when switched on** (the owner, Nov 14; over counting them always).
- **A breakdown of a bar by type is its own later slice** (the owner, Nov 14).
- **A small memorial keeps its own name** (the owner, Nov 16, "Their own name"): a Stolperstein or a ghost bike is named as it bears it; an unnamed one reads "Memorial" (steward's silent question 1).
- **The bars' cache keeps counts and shares apart** (the owner, Nov 16, "Counts plus shares"; plan, Data, A).
- **The data side first, in chronicles-data, attached to this session** (the owner, Nov 16); built there as SL1-SL11 (its `docs/small-places/spec.md`, contract v3).
- **One OSM adapter, its role by class** (the owner, Nov 16, over two adapters).
- **A marker is a marker whoever lists it** (the owner, Nov 16): Wikidata's `marker` joins OSM's plaques in Plaques and markers, off by default.
- Defaults taken in the plan, for the owner to overrule: see plan.md, "Defaults to overrule".

## Criteria

The owner's task, in their words: "find small things like a time capsule while exploring", and "a plaque doesn't have to be on by default, but can be a refinement in the historical category as its own subgroup".

- **SP1** (the task): on an exploring walk, an archive time capsule within the range shows as a "?" and is named "A time capsule" when unnamed (its own name when it has one) within 60 m; a capture beside it finds it, and the replay says "Found: A time capsule".
- **SP2** (finding): in "What I'm into", under Monuments and memorials, a row named "Plaques and markers", indented as Community parks is under Parks, is switched off; someone told only "turn plaques on" finds it there.
- **SP3** the archive's small classes map to one kind each, pinned (Wikidata's `marker` with OSM's plaques, the owner, Nov 16): plaques, small memorials and old stones and wayside shrines in History (under Monuments and memorials, Monuments and memorials, Buildings and structures and Places of worship); time capsules in Viewpoints & oddities under Curiosities; little libraries in Culture under Community spaces; murals and sculptures as Public art itself and community gardens as Parks and gardens itself, with no switch of their own (the plan's default; steward S5).
- **SP4** an unknown class, or a known small class with a tag outside the table, is left out (never guessed).
- **SP5** an unnamed small place enters, named by its type as an unnamed viewpoint is ("A plaque", "A little library", "A time capsule", "A memorial", "An old stone", "A wayside shrine", "A statue", "Public art", "A community garden"); its card and find say that name once ("Found: A little library", never "A little library · Little libraries"); an unnamed place of any other archive class is still left out.
- **SP6** two unnamed small places of the same type in one ~10 m cell are one place.
- **SP7** on a fresh install, Plaques and markers, Small memorials, Old stones and Wayside shrines and crosses are off; Time capsules and Little libraries are on.
- **SP8** after the update, a reader with saved switches from before gets the same defaults; a parent they had switched off still hides its new subsets.
- **SP9** a subset switched on stays on after a reload and a new archive version; one switched off by the reader stays off.
- **SP10** a subset's row shows only while its parent is on, and is off and locked under a parent switched off (as Community parks).
- **SP11** an off subset's places show as no "?" on a walk, on Explore's map or in an area's "Waiting to be found"; switched on, they do.
- **SP12** an area's bars: a small place adds ¼ (plaques, small memorials, old stones, wayside shrines, time capsules), ½ (little libraries, community gardens) to its category only while its subset is on; four plaques in a ring light History's first dot with plaques on, and none with them off. Murals, sculptures, statues (1) and community gardens (½) have no switch of their own and count as their kind's places always, as the map's artworks and parks do (0115).
- **SP13** flipping a subset's switch changes the tiles' and the card's dots and the character line without reading the area again.
- **SP14** none of the small classes weighs toward storefronts, What's here? or a town's pockets.
- **SP15** no screen shows a number of small places, or a share of them found; the walk's card and the replay keep their bounds (one or two by name, then "a few places").
- **SP16** the walk planner and scenic routes do not lean on the small subsets (a route toward History is not pulled by plaques).
- **SP17** the app pins chronicles-data's contract v3 (PP17): its class names are exactly the app's archive table.
- **SP18** a small place and a map-tile place with the same name within 50 m are one place, the archive's (0103's merge holds for the new classes).
- **SP19** a community-named park whose only places in or near it are small places stays a community park, with those subsets on or off (steward S1; 0143's demotion holds).
- **SP20** passing a museum and three plaques says "Passed <the museum> without stopping": small places are named in the card's and the replay's passed line only when nothing else was passed (steward S2; the lows stay in).
- **SP21** an area's Found list shows the unnamed finds of one type as one row named by the type in the plural ("Plaques"), with no number (steward S3).
- **SP22** an unnamed small place reads with its article in a sentence ("Passed a plaque without stopping"), and two of one type as the plural ("Passed plaques without stopping") (steward S4).

## Steward (Nov 16, on the spec and plan)

- S1 (drift), a switched-off small place keeps a park a park: accepted, SP19.
- S2 (drift), plaques drown the lows in the passed line: accepted, SP20.
- S3 (drift), the Found list as a tally by repetition: accepted, SP21.
- S4 (tone), bare labels in sentences: accepted, SP22.
- S5 (drift), SP12 untestable for types with no switch: accepted, SP3 and SP12 amended to the plan's default.
- Silent 1, a Stolperstein's name is the victim's: the owner, Nov 16: their own name.
- Silent 2, an unfound unnamed place named for its kind (0143): rejected as a conflict. 0143 keeps the subset's label ("Community parks") off unfound places; "Time capsule" says what the thing is, as an unnamed artwork has read "Public art" since v1.

## Record

Not built. The plan waits for the owner.
