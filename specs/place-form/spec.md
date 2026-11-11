<!-- Place form (PF): a plain-words description of how a place is laid out, so a person knows what they are walking into. Written in the repo
     first (2026-11-11) after the owner drove through Bethel, PA, an interchange, and the app listed places there as if it were a town.
     Their calls are in the Decisions list. To be copied into the concept doc as a tab. The doc wins once it exists. -->

# Place form (PF)

An area gets one short phrase about **how it is laid out**: a street grid, a town along a main street, a village along one road,
services at a highway exit. It tells someone before they go what shape of place they are heading into, so they can judge for themselves how to go about it (the owner's purpose,
2026-11-11). The words never advise: they say what the ground is, never what to do about it, and never whether it is good. They are
different **kinds** of place, not steps on a ladder.

It is the first of a family. A later description of a place (its age, its use) is another slice and another `/vision` gate; this slice
fixes the **rule for such words** (the Decisions list) and one set of them.

## Vision

Idea: a plain-words label for any town, city or neighbourhood that says how to explore it, so a person understands the shape of the area; first case Bethel, PA (an interchange the app listed places in as if it were a town), and the precedent for further classifications.
Verb: earn (Explore and Navigate: the shape of the ground, so the walker notices what kind of place it is and how to go about it).
Touches:
- Always, "**Guidance is structural**: where there is a lot, and what makes a place itself, never whether it is good." A word that grades a place ("not walkable", "poor") is editorial. The words here name a layout.
- Never, "Ratings, reviews, stars, 'best of', rankings of places" and "Scores, streaks, completion, coverage". A set of words ordered from walkable to not is a ranking in disguise: so the set has no order, no best, no worst, no number, no share.
- Decisions 0093 and 0096: walkability is judged by how the ground is built, never by a sidewalk tag's absence, in words, in a cool pair of tints, never a number. This slice follows them.
- Decision 0115 and RP20: "kinds filter what you see, never what exists"; reachability "is said, never filtered". So Explore says what kind of place it is and removes, thins and reorders nothing.
- Never, "Data leaving the device without a tap" (0005): the word is derived from tiles the app already reads. No new request, host or stored row.
- Always, "**Counts are words**" and "**Restraint** in copy": a clause on the card, no badge, no colour, no icon.
Verdict: aligned if reshaped
Shape: descriptive, unordered words; derived on read from facts already read, never stored; one line on the area card; Explore unchanged; no word where too little is known. Not a "walkable" tier and not a filter on places.
Criteria: PF1, PF2, PF3 (nothing leaves the device), PF7, PF8, PF9, PF11, PF12, PF13 and PF14 (Explore unchanged, no badge, colour or filter), PF17-PF20 carry it.
Open: answered 2026-11-11 by the owner: Explore **says it and shows everything**; **start with form words only** (a small fixed set), each later classification through `/vision` on its own.

## Decisions

- **Say it, show everything** (the owner, 2026-11-11): Explore keeps every place, "?" and find; the card says what kind of place it is.
- **Form words first, no general taxonomy** (the owner, 2026-11-11): a small fixed set of descriptive words derived from the map's own tiles. The rule for a word is PF1 and PF2; a later kind of classification passes `/vision` on its own.
- **Deterministic, from the tiles** (the owner, 2026-11-11): every word is calculated from facts the app already reads (streets, street junctions, places). If a word cannot be derived that way it is not in the set.
- **Test first against real places** (the owner, 2026-11-11): every rule is a test and is evaluated on real Overture tiles for real places, with an accuracy measured on places the rule was **not** tuned on (PF5, PF6).
- **The interchange is Bethel's case** (the owner, 2026-11-11): Bethel, PA, at its I-78 interchange, is "services at a highway exit", not a town.
- **Words, unordered, no default** (decision 0093 and the vision gate): where none fits, there is no word (PF8).
- **Four words; the mall and the cul-de-sac suburb get no word** (the owner, 2026-11-11) until a measure supports one.
- **The reads, the owner's default (2026-11-11, "proceed with your default", after the second review):** keep each place's category and confidence in the fixtures, and carry them through the
  walkability read (no new request) only if the calibration shows a measure that needs them, and add a read of Overture's **buildings** tiles for a building count (the same host and archive reader as the places; nothing
  stored; a buildings read that fails is no word, never a guess, PF17). Overture's exit nodes and industrial land use are not read in this slice.
- **The village word is kept only if a measure shows it** (the owner's default, 2026-11-11): if no measure separates the village places from the main-street towns on
  the calibration set, the word leaves the set (PF21).
- **Labels, the one-line cap and the go-ahead** (the owner's default, 2026-11-11): the plan's proposed words are the confirmed labels (the places the owner marked
  "?" accept either word named); the card holds one description line at most; tests first may begin.
- **The northeastern United States for now** (the owner, 2026-11-11, default: the evidence is Pennsylvania only): the line shows nowhere else until fixtures from elsewhere exist (PF18). Replaces "United States only".
- **The copy is "Around its middle: …"** (the owner, 2026-11-11), so the line is read as the ring's, never the whole area's (PF18).
- **The floor** (the owner's default, 2026-11-11, after the second review showed the first clause pair gave an effective 0.90): at least 80% of the held-out places right with a 95% lower bound of 0.70, and recall of 80% (PF6).
- **The first set is what the data in hand can show** (the steward, accepted 2026-11-11): the walkability read's `PlacePoint` is a position and a weight, so a word
  about shops on a car park or about houses cannot be derived from it. Correction after the second review: the underlying `OverturePlace` does carry a category
  and a confidence, which can be carried through with no new request; a footprint or a building count would be a new read. The words, the measures and the reads
  are reopened with the owner (plan: the second review).

## The model

Within a **ring** around an area's point (the card's 800 m, `ATLAS_RULES.ringM`) the app measures, from the tiles already read:

- **Streets:** local streets and arterials as in walkability (`walk/cells.ts`: UF2), and **highway**, motorway or trunk and their links, kept apart from the arterials.
- **Street junctions per km²** (UF3).
- **Places per km²** that count (activity density's weights, specs/activity-density).
- **Stretch:** how much more the ground's streets run along one line than across it (the principal axis of their lengths).
- **Whether places were read.** A ring whose places were not read (a failed read, or tiles only Overpass served) is not a ring with no places (PF17).

The word is a rule over these, pinned by real places (the calibration and held-out sets, plan.md). The starting list, which the fixtures may change:

The table is kept and printed in id order (alphabetical by id), never from dense to sparse (PF2).

| Word | What it is (what the measures show) | Real cases |
|---|---|---|
| A street grid | Streets close together in both directions, many places along them | Allentown downtown, Reading, Lancaster |
| A town along a main street | A few connected streets with a run of places, built up | Hamburg, Jonestown, Kutztown |
| A village along one road | Stretched along one road, few places | Friedensburg, Fredericksburg |
| Services at a highway exit | Mostly highway, a few places, few streets | Bethel (the interchange) |
| *(no word)* | Too little to say, none fits, or the places were not read | Fields, a park, a mall, a cul-de-sac suburb, an unread ring |

Not in the first set, and why: the owner's "shops set back behind car parks" and "houses on looping streets" name what stands on the ground (a car park, a
house), which the app's places (a position and a weight) and streets cannot show. A mall or a suburb gets **no word** until a measure supports one (the
plan's Deferred); the fixtures still hold them, so the rule is held not to call them a grid or a main-street town (PF7).

## Acceptance criteria

### The words

1. **PF1 · A fixed, descriptive set.** The words are one table, each a short clause naming a layout ("A village along one road"). None contains
   "walkable", "good", "bad", "best", "poor", "nice", a digit, or a comparison ("more", "less", "than", "most"). A unit test holds this: `check:vision`'s
   word list does not carry these words. Each word's inputs are listed beside it, and every input is a PF4 measure (a word whose measure needs a field the
   read does not carry is not in the table).
2. **PF2 · Unordered, with no default.** The table has no order a person could read as better or worse (it is stored and printed sorted by id,
   and a test checks that), and no word is what an area gets when nothing else fits: that is **no word**.
3. **PF3 · Derived on read, from open tiles, stored nowhere.** A word is computed from the tiles' streets, street junctions, places (with their category and
   confidence) and buildings. The buildings are one new tile read on the host and with the reader the places already use: no new host, no account, nothing
   sent but the tile request. No row is stored (the building count is measured and dropped, as the places are), and no `WALK_CODE` bump is needed. Two reads of the same tiles give the same word.
4. **PF4 · The measures.** (The starting list: counted places per km²; street junctions per km²; motorway and trunk share of street length; the largest chain of
   counted places, each within 80 m of the next, as a share of the places and as a length; buildings per km²; whether places and buildings were read. A measure joins or
   leaves the list by what the calibration set shows.) Each measure is defined once and tested before any rule uses it, on a small made-up ground whose answer is known: (places per km², street junctions per km², highway share of street length, stretch, and whether places
   were read) is computed by a function with a test on a small made-up ground whose answer is known, before the rule uses it.

### The accuracy, on real places

5. **PF5 · No wrong word on a calibration place.** On Overture's real tiles (release 2026-10-21.0) cut for the calibration set, every place gets the word the owner confirmed, one the owner
   accepted, or silence, never another word; and at least 80% of the places the owner gave an unambiguous word are named. The rule is learned from these places, so this checks that
   the learning kept its promise: it is not evidence of accuracy, which is PF6, on places the rule never saw.
6. **PF6 · Measured on places it was not tuned on.** The held-out set is cut and its words confirmed by the owner **before** the thresholds are
   pinned, and its fixture is added in a commit after theirs. The test reports its accuracy, its recall per word and the 95% Wilson interval of the accuracy, and holds the held-out set to the floor the owner set (the
   default taken 2026-11-11): at least 80% of the places right, a 95% lower bound of at least 0.70 (24 places: 22 right), and at least 80% of the places the owner gave a
   word (not silence) getting some word, so staying silent cannot pass it. The set is at least 20 places with at least 4 of each word. A place the owner marked "?" counts correct
   for the two words named and no other. The report also gives the lenient accuracy, per-word recall on the primary word and a voiced-wrong rate; the comparison with
   the calibration set is printed, not gated. A held-out
   miss is reported and never tuned away: a rule change after that needs a fresh held-out set.
7. **PF7 · No plainly wrong word.** Across both sets, these pairs are never confused, in either direction: a street grid and a village along one
   road; a street grid and services at a highway exit; a town along a main street and services at a highway exit. A mall and a cul-de-sac suburb
   get **no word at all**, whichever the word. The pairs are listed in the test by name, with no grouping of the words by size.
8. **PF8 · Too little to say.** A ring with under 300 m of street, or with too few places read to tell, has no word: farmland, a park, an
   unread tile. The fixtures include such places, and a ring whose tiles were not all read is no word, never a guess.
9. **PF9 · A missing sidewalk never makes a word.** Removing every sidewalk, crossing and footway from every fixture changes no word; adding
   them to a place that has none does not change its word. (Decision 0096: unmapped is not absent.)
10. **PF10 · The same word whichever tiles are read.** A ring whose own tiles are read gets the same word whichever further tiles are in
    (the UF1 rule); and a word never depends on the order the tiles were read in.
11. **PF11 · The words are the whole of what is shown.** No measure, count, share, rank or comparison between places is shown or stored for
    display. The only text derived from a measure is the table's clause; `npm run check:vision` runs over the copy (PF1's test carries the words it
    does not). The accuracy figures exist only in the report module (dev tooling, `placeFormReport.ts`) and the tests; no app code imports it (a layer test).

### Where it shows

12. **PF12 · On the area card, for a neighbourhood or a town.** The card says the word as one line beside the walkability line, read when the
    card opens from the device's cache like it (UF13), never for an area nobody opens. With no word, nothing is shown, no placeholder, no
    "unknown". While the read is still going nothing shows, never a flash of another word.
13. **PF13 · Explore is unchanged.** Every place, "?" mark, find, kind bar and busy street Explore shows is the same with and without a word.
    Nothing in `src/lib/explore`, `discovery`, `atlas` or `activity`, and no component except the card's one line, imports a place-form module (a
    layer test), and the e2e checks a card with and without a word shows the same places.
14. **PF14 · No badge, tint, icon or filter.** The word is text on the card. It adds no map layer, no pin, no icon, no colour and no setting
    (the Layers panel is as before). It never changes a route, the heads-up or a walk.

22. **PF22 · The centre can move.** Moving a place's centre 300 m in any of eight directions never turns its word into a plainly wrong one (PF7's pairs), and
    never gives a word to a place the owner labelled no word; the share of readings whose word changes is at most 25%. (Measured 2026-11-11 on the retuned rule: 15%,
    and a no-word place gained a word 8 times of 280: Park City, Upper Macungie, Penn State.) The compass-four wrong-pair check stays as the first part. The fixtures hold 300 m of data beyond the ring for this, and the centre is the point the atlas passes the card (an Overture locality point).

### Where the data is thin, and what the words say

17. **PF17 · No places read, no word.** A ring whose places were not read (the read failed or returned nothing, or its tiles were served only by
    Overpass) has no word, whatever its streets. Emptying the places of a fixture that has them changes its word only to no word, never to "A village
    along one road" or to any other word defined by few places: sparse coverage is not a layout.
18. **PF18 · The ring's, not the area's.** The line is worded as the ground around the area's middle ("Around its middle: …", the copy the owner
    chooses), never as a claim about the whole town or neighbourhood. Where the fixtures give no evidence (outside the places the calibration
    covers) the owner decides whether the line shows (plan, Questions); until then it shows nowhere outside the northeastern United States, the states the fixtures cover (the owner's default, 2026-11-11, after the reviewer pointed out that the evidence is Pennsylvania only).
19. **PF19 · No advice.** No copy, tooltip or accessibility label on the card says how to go about an area, what to do or avoid, or what to expect to
    find. The word says what the ground is.
20. **PF20 · The card renders the same for every word.** The kind rows, "Waiting to be found", the busy streets, the map's markers and the Walk to footer
    are identical for every word including none (a component test per word); the word reaches the card only through the one line that shows it.

21. **PF21 · The village word has to earn its place.** "A village along one road" stays in the set only if a defined measure separates the calibration set's villages
    from its main-street towns, found on the calibration set and held to the floor on the held-out set (PF6). If none does, the word is removed from the table, its places
    get no word, and the Record says why.

23. **PF23 · The held-out places are far from the calibration places and used once.** Every held-out point is at least 5 km from every calibration point, and no
    two held-out places share a municipality. The held-out set is evaluated once per rule: a rule change after a look needs a fresh set, and the Record logs each
    look (so far: one, 17 places, 2026-11-11, folded into calibration).
24. **PF24 · Uneven mapping silences, and never misleads.** Thinning a place's buildings and places to half, seeded, never gives a plainly wrong word, never gives a word to
    a place the owner labelled no word, and only ever turns a word into silence or, for at most three places, into a neighbouring word (grid and main street, main street and village, village and exit), never a plainly wrong one; at most half the words go silent. (Measured: Allentown's grid ring reads "a town along a main street" with half its places.) (Reframed 2026-11-11 by the
    second and third reviews and the owner's positives-only policy: silence is the designed response to doubt, so the fraction of words silenced is reported, 34% measured, and not gated.)
    Overture's building and place coverage is uneven (Reading maps about 430 buildings per km², Allentown 1,600).

25. **PF25 · Busy-street length.** The ring's busy-street length is the length of the strips the landing analysis finds (a named street at medium grade or above with a run of
    places along it, graded against the read's own high point), counted where the busiest point lies inside the ring. An unnamed street, places further than 40 m from the street, or
    no places give none. (The busy streets are the ones the Explore tab draws.)
26. **PF26 · Frontage.** The ring's frontage is the share, by weight, of its places within 40 m of a named street: the storefronts on a street. No named street, or no places, give none.
27. **PF27 · Five rings.** A ring is read from its centre and from 150 m north, east, south and west, the centre first; a ring with a tile unread, or too little street, is not measured.
28. **PF28 · The territories are learned, reproducible and pure.** Each word's territory is a box over the six measures (junctions, places and buildings per km², motorway share, busy-street length,
    frontage), learned from the owner's confirmed places by one deterministic procedure and committed as a table (`npm run learn:place-form` regenerates it, and a test holds the table equal to
    what the procedure makes of the fixtures). The box is built around a word's strictly confirmed places, widened by a margin, open on the sides where more or less does not change the word,
    and cut back until no place the owner confirmed as something else, or as no word, lies inside it. No reference place is carried into the app, and no app code imports the learner.
29. **PF29 · Obvious, or silent.** A ring has a word only when its measures lie inside exactly one word's territory and the ring read from each of the four shifted centres gives the
    same word at least three more times out of four (four of the five rings in all, the centre among them); a place inside two territories, a centre outside every territory, or rings that
    disagree have no word. (The owner's policy, 2026-11-11: only positive classifications; ambiguity is silence.)

### The evidence

15. **PF15 · The fixtures are reproducible and carry their own truth.** `scripts/fixture-place-form.mjs` rebuilds each fixture from Overture's
    pinned release and writes, for each place, its point, its tiles, its confirmed word, the date it was confirmed, and which set it is in.
    A fixture with no confirmed word fails the test.
16. **PF16 · A report the owner can read.** `npm run report:place-form` prints each place, its confirmed word, the word the rule gave and its
    measures, then the confusion table and the accuracy of each set, so the owner can see where the rule is wrong and judge the floor.

## Record

### The held-out looks (PF6, PF23: each is logged; a held-out set is used once per rule)

1. **2026-11-11, the first set (17 places, a first rule fitted to 18).** Accuracy 0.71, recall 0.62 against 0.80 and 0.80. Missed: Bethlehem, Steelton, Shartlesville, Morgantown, Penn State.
   Folded into the calibration set at the owner's call, and the rule retuned.
2. **2026-11-11, the second set (24 places, blind labels from an independent agent; a street-first rule pinned in `77cfe36` before the data was cut).** Accuracy 19 of 24 = 0.79
   (95% interval 0.60 to 0.91), recall 13 of 18 = 0.72 against 0.80, a lower bound of 0.70 and recall of 0.80: **not met**. No plainly wrong pair. Of the 19 places the rule spoke
   about, 18 were right and one was wrong (an outlet mall at an interchange read "services at a highway exit"); it stayed silent on 4 of the 18 places that deserved a word. The five misses:
   - **Scranton, Orwigsburg, Manheim (grid or main street, got no word):** a hole in the rule, not a fitting miss. A main street needs under 48 junctions and a grid needs 48 with 100 places
     or 70 alone, so a ring with 48 to 69 junctions and fewer than 100 places falls through (Scranton 48 junctions and 322 places at the edge; Orwigsburg 48 and 42; Manheim 63 and 88).
   - **Churchtown (village, no word):** 5 junctions, under the village floor of 8; a sparse Amish village.
   - **Limerick outlets (no word, got exit):** an outlet mall at an interchange: 0.39 motorway share, 10 junctions and 71 places; the exit rule has no cap on places.
   The set is not retuned on; the rule changes only with a fresh set (PF23).
