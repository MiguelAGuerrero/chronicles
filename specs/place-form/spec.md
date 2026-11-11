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
- **Four words; no place-category or buildings read** (the owner, 2026-11-11): the mall and the cul-de-sac suburb get no word until a measure supports one.
- **United States only for now** (the owner, 2026-11-11): the line shows nowhere else until fixtures from elsewhere exist (PF18).
- **The copy is "Around its middle: …"** (the owner, 2026-11-11), so the line is read as the ring's, never the whole area's (PF18).
- **The floor** (the owner, 2026-11-11): at least 80% of the held-out places get the confirmed word, and no more than 10 points below the calibration set (PF6).
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
| A town along a main street | A few connected streets with a run of places, some stretch | Hamburg, Jonestown, Kutztown |
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
3. **PF3 · Derived on read from what is already read.** A word is computed from the tiles' streets, street junctions and places the walkability
   reads already hold. It adds no request, no host, no stored row and no `WALK_CODE` bump; two reads of the same tiles give the same word.
4. **PF4 · The measures.** Each measure is defined once and tested before any rule uses it: stretch is length-weighted with its street classes named, and a test shows it keeps its answer when service ways are dropped (a measure that does not survive that is not a measure, and a word that needs it leaves the set). Each measure (places per km², street junctions per km², highway share of street length, stretch, and whether places
   were read) is computed by a function with a test on a small made-up ground whose answer is known, before the rule uses it.

### The accuracy, on real places

5. **PF5 · A word for each real place in the calibration set.** On Overture's real tiles (release 2026-10-21.0) cut for the calibration set
   (plan.md), every place gets the word the owner confirmed for it, or one the owner accepted for it. A place the rule gets wrong is named in the
   failing test's message with its measures.
6. **PF6 · Measured on places it was not tuned on.** The held-out set is cut and its words confirmed by the owner **before** the thresholds are
   pinned, and its fixture is added in a commit after theirs. The test reports its accuracy per word and as a whole, and holds it to the floor
   the owner sets (plan.md: at least 80% of the held-out places, and no worse than the calibration set by more than 10 points). A held-out
   miss is reported and never tuned away: a rule change after that needs a fresh held-out set.
7. **PF7 · No plainly wrong word.** Across both sets, these pairs are never confused, in either direction: a street grid and a village along one
   road; a street grid and services at a highway exit; a town along a main street and services at a highway exit. A mall and a cul-de-sac suburb
   (no word yet) are never called a street grid or a town along a main street. The pairs are listed in the test by name, with no grouping of the words
   by size.
8. **PF8 · Too little to say.** A ring with under 300 m of street, or with too few places read to tell, has no word: farmland, a park, an
   unread tile. The fixtures include such places, and a ring whose tiles were not all read is no word, never a guess.
9. **PF9 · A missing sidewalk never makes a word.** Removing every sidewalk, crossing and footway from every fixture changes no word; adding
   them to a place that has none does not change its word. (Decision 0096: unmapped is not absent.)
10. **PF10 · The same word whichever tiles are read.** A ring whose own tiles are read gets the same word whichever further tiles are in
    (the UF1 rule); and a word never depends on the order the tiles were read in.
11. **PF11 · The words are the whole of what is shown.** No measure, count, share, rank or comparison between places is shown or stored for
    display. The only text derived from a measure is the table's clause; `npm run check:vision` runs over the copy (PF1's test carries the words it
    does not). The accuracy figures exist only in the report and the tests, never in `src`.

### Where it shows

12. **PF12 · On the area card, for a neighbourhood or a town.** The card says the word as one line beside the walkability line, read when the
    card opens from the device's cache like it (UF13), never for an area nobody opens. With no word, nothing is shown, no placeholder, no
    "unknown". While the read is still going nothing shows, never a flash of another word.
13. **PF13 · Explore is unchanged.** Every place, "?" mark, find, kind bar and busy street Explore shows is the same with and without a word.
    Nothing in `src/lib/explore`, `discovery`, `atlas` or `activity`, and no component except the card's one line, imports a place-form module (a
    layer test), and the e2e checks a card with and without a word shows the same places.
14. **PF14 · No badge, tint, icon or filter.** The word is text on the card. It adds no map layer, no pin, no icon, no colour and no setting
    (the Layers panel is as before). It never changes a route, the heads-up or a walk.

### Where the data is thin, and what the words say

17. **PF17 · No places read, no word.** A ring whose places were not read (the read failed or returned nothing, or its tiles were served only by
    Overpass) has no word, whatever its streets. Emptying the places of a fixture that has them changes its word only to no word, never to "A village
    along one road" or to any other word defined by few places: sparse coverage is not a layout.
18. **PF18 · The ring's, not the area's.** The line is worded as the ground around the area's middle ("Around its middle: …", the copy the owner
    chooses), never as a claim about the whole town or neighbourhood. Where the fixtures give no evidence (outside the places the calibration
    covers) the owner decides whether the line shows (plan, Questions); until then it shows nowhere outside the United States.
19. **PF19 · No advice.** No copy, tooltip or accessibility label on the card says how to go about an area, what to do or avoid, or what to expect to
    find. The word says what the ground is.
20. **PF20 · The card renders the same for every word.** The kind rows, "Waiting to be found", the busy streets, the map's markers and the Walk to footer
    are identical for every word including none (a component test per word); the word reaches the card only through the one line that shows it.

### The evidence

15. **PF15 · The fixtures are reproducible and carry their own truth.** `scripts/fixture-place-form.mjs` rebuilds each fixture from Overture's
    pinned release and writes, for each place, its point, its tiles, its confirmed word, the date it was confirmed, and which set it is in.
    A fixture with no confirmed word fails the test.
16. **PF16 · A report the owner can read.** `npm run report:place-form` prints each place, its confirmed word, the word the rule gave and its
    measures, then the confusion table and the accuracy of each set, so the owner can see where the rule is wrong and judge the floor.

## Record

(Filled as it is built.)
