<!-- Atlas grading. Written in the repo first (2026-11-04) from the owner's research doc
     "Grading areas by their features" (https://claude.ai/artifact/KbWci9Guj4XcamTNqow8oC) and their
     "Yes and implement" on the defaults similar apps suggest. Not a concept-doc tab. -->

# Atlas grading (AG)

The atlas's dots said History "plenty" in a subdivision where nothing was waiting
to be found. It counted every church, cemetery and town hall, while the "?" marks
counted only notable ones. This slice keeps the model (eight kinds, fixed steps,
dots and words, no totals) and changes what it counts.

## Decisions

- **Defaults from similar apps** (the owner, 2026-11-04, "Yes and implement" on the
  research doc's table):
  1. The five findable kinds count only places that could be found. Food, Shops and
     Nightlife count everything (Wayfarer, Komoot and Atlas Obscura list only what
     passes their criteria; Walk Score counts every errand).
  2. A ring the map knows almost nothing about says nothing (Google Area
     Busyness shows nothing when data is thin).
  3. Green stays a count of parks (Walk Score, AreaVibes). Area is not used.
  4. ~~Nearer counts more~~: dropped (the owner, 2026-11-04). Dots will cover the
     whole area, with density as its own layer (below).
  5. No file host: significance from Wikidata, QRank or heritage lists is not added.
  6. The spec defines what a mark is: written criteria plus an exclusion list
     (Wayfarer, Komoot).
- **On the plan** (the owner, 2026-11-04):
  - one dot means at least one countable place in the area;
  - a thin area holds fewer than 3 mapped places of the eight kinds;
  - the steps stay;
  - the next slice ("Whole areas"):
    - **Extent:** dots cover the whole area instead of an 800 m ring. A town is
      graded across its outline; a neighborhood across its share of the town, the
      part closer to its point than to any other neighborhood's.
    - **What the dots mean:** how much the area holds, against fixed steps.
    - **Density:** a separate layer, the kind's density shading the area's picture.
  - this slice ships the parts already settled.

## What a mark is (AG5)

A "?" mark is a place worth walking to and finding: a lasting, physical thing you
recognise when you get there, reachable on foot, that tells something about the
place (its history, its art, its culture, its green, its views).

Never a mark:

- a chain or a generic business (`chains.json`);
- food, shops and nightlife (they are the area's ordinary life, shown as busy streets);
- an ordinary building of a notable class: a place of worship, town hall,
  courthouse, cemetery or library, unless its name says it is historic or notable
  (`notable.json`);
- a cinema, dog park or picnic site;
- private homes, schools, temporary or seasonal things, and places without safe
  access on foot. The map data the app reads has none of these as places of
  interest; any adapter that brings them must leave them out.

## Acceptance criteria

1. **AG1 · The findable kinds count what can be found.** History, Art, Culture,
   Green and Views count only places in the ring that could be a "?" mark (the
   same test as the marks). A plain parish church, a dog park or a chain counts
   toward nothing. Food, Shops and Nightlife count every place of their kind.
2. **AG2 · The dots and the "?" agree.** In a ring that has been read, a findable
   kind with a place waiting to be found has at least one dot, and a findable kind
   with no dots has nothing waiting. (Kinds switched off in "What I'm into" still
   show their dots, AT10.)
3. **AG3 · A thin ring says nothing.** When the ring holds fewer than 3 mapped
   places of the eight kinds, ordinary ones included, the card shows no kind rows
   and no "none", the tile shows no kinds, and neither the tile nor its screen
   reader label says the area is empty or quiet. A "?" or a find in it still shows.
4. **AG4 · How the marks work says what counts.** The card's explanation says the
   findable kinds count places worth finding and the others count everything. It
   has no digits (AT11).
5. **AG5 · Marks follow the definition.** Every class the tile adapter can make a
   mark belongs to one of the five findable kinds and is not on the "never" list
   above; a test lists them, so a new class is a deliberate change.
6. **AG6 · New rules, new reads.** Changing these rules reads every ring again
   (the rules version moves on); old profiles are never patched.

## Record

Built 2026-11-04 on branch `claude/atlas-grading`:

- AG1, AG2, AG3 (words), AG4, AG6 pass in `atlas.test.ts`; AG5 in `discovery.test.ts`.
- AG3's tile and card pass in the e2e journey `grading` (Quiet Hollow, a ring with one café).
- `marks` and `outlines` still pass. `ATLAS_CODE` is `a4`.
- The `grading` journey was written after the code and not seen failing first.
- Native has not run on a device.
