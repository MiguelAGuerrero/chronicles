<!-- Repo first: from the owner's proposal G3 (docs/STATUS.md, "Next evolutions"), answered yes Nov 11 (/tend inbox G3 yes); decision 0140. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Presence: one system says what a place is

Nov 11, 2026 · @Miguel Guerrero

## Vision

Idea: "ensuring that the taxonomy and classification of presence in any street is its own system that can be iterated and refined ... progressively enhanced to show specific types of urban or rural activity or institutions ... busy might itself be implemented correctly when traffic data or whatever is available. But storefronts itself, it's derivable from the same data set ... ensuring that these systems are different and isolated from any consumers that rely on that is favorable" (the owner, Nov 11).
Verb: earn (what a street holds is said once and the same way everywhere, so the map, the card and a route agree on it)
Touches: VISION.md Never, "Popularity, trending, foot traffic, other people's activity" (busy stays out of presence: a signal of its own if traffic data ever exists, gated first); Never, "Ratings, reviews, stars, 'best of', rankings of places" (a class says what a place is, never how good); decisions 0080 (amended: density weights come from classes), 0127 (bars are a grouping over classes), 0109 (Overture feeds density, never marks), 0140 (this system).
Verdict: aligned
Shape: as filed in G3: the first of two slices; nothing a person sees changes beyond PR5's list.
Criteria: PR5, PR7, PR8.
Open: none (the owner's four calls, Nov 11; decision 0140).

## What it is

Until now what a place is was decided once per consumer: `discovery/tilePois.ts` turned OpenStreetMap's poi tags into the categories and kinds of marks and bars, and `activity/weights.ts` kept a second table of the same tags (and Overture's taxonomy) as density weights for busy streets, What's good here and route leaning. The tables disagreed where a tag was in one and not the other. Presence is one pure module (`src/lib/presence/`): each source's adapter hands it a feature's tags, it answers with classes from one vocabulary, and each consumer derives what it needs from the classes: a weight for density, a category and kind for marks and bars. Marks' curation (chains, notable names, what is never a mark) stays a separate rule set over classes.

## Decisions (the owner's calls, Nov 11; decision 0140)

- **One presence system**, with one version code; layers, bars, marks, routes and the planner read its classes, never source tags. This slice moves the OpenStreetMap tiles and Overture; the archive, bars, notable names, scenic greens and the planner are the next.
- **Several classes per place** are allowed; a consumer takes what it reads (density the greatest weight).
- **Unify, and show the differences**: where the old tables disagreed, one answer per tag, each listed below (PR5).
- **Presence first, then G2** ("busy" becomes "storefronts", which will be a presence class).

## Acceptance criteria

1. **PR1** One pure presence module turns a feature's tags into classes from one vocabulary, a feature may carry several classes, and the module has one version code.
2. **PR2** The tile and Overture adapters feed presence; no module outside it holds a table from poi classes or Overture categories to what a place is.
3. **PR3** Marks and checklists take their category and kind from presence classes.
4. **PR4** Density weights come from presence classes, so the map layer, What's good here and route leaning read the same class for a tag as marks do.
5. **PR5** Each tag the two old tables answered differently has one answer, as listed in "What changes", and that answer is the same for marks and for density.
6. **PR6** The presence version code is part of the atlas's and the landing's cache codes, so a reclassification re-derives them with no hand bump. The place cache is written but nothing reads it (`placesIn` has no caller), so there is nothing to re-derive there.
7. **PR7** Marks' curation (never a mark, a mark only by a notable name) is a rule set over presence classes, separate from the classification.
8. **PR8** For every tag not listed in "What changes", the weight, category, kind and whether it is a mark are what they were (the golden table captured before the slice).

## What changes (PR5)

Density weights do not change for any tag. What changes is which tags make a category, a kind or a mark, where the same thing arrived as two different tags:

| Tag (class/subclass) | Before | After |
|---|---|---|
| `memorial` | counted for density, no category | History, monuments; a mark only by a notable name, like worship, cemeteries and town halls |
| `nature_reserve`, `park/nature_reserve` | counted for density, no category | Parks; a mark only by a notable name (the steward, S2: a reserve is large and many, Always "Restraint") |
| `arts_centre` | counted for density, no category | Culture, community; a mark, as `art_gallery/arts_centre` |
| `community_centre` | counted for density, no category | Culture, community; a mark only by a notable name, as `town_hall/community_centre` |
| `viewpoint` | counted for density, no category | Viewpoints; a mark, as `attraction/viewpoint` |
| `florist`, `jewelry`, `gift`, `toys`, `stationery`, `books`, `shop/books` | counted for density, no category | Shops (a destination shop, as under `shop/`), never a mark |
| `marketplace` | counted for density, no category | Food, as `grocery/marketplace`, never a mark |

None of the e2e journeys' fixture tiles hold these tags, so no picture differs. Decision 0140 asked for before and after pictures; with no fixture to picture, the record lists the change on a real sample area in words instead (the steward, S1), and the owner is told.

A community centre unnamed is no place (only artworks and viewpoints are kept unnamed); named, it is Culture, a mark only by a notable name, as `town_hall/community_centre` already is (PK11, 0127).

## Record

Shipped Nov 11 (from G3, `/tend inbox G3 yes`), on the web build; nothing here is native.

- **PR1-PR8 pass** (`src/lib/__tests__/presence/presence.test.ts`): tests first `0e10bf2`, the code `bf5d3c4`.
- **The golden table** (`golden.json`, 156 realistic poi pairs and 250 Overture hierarchies captured before the slice) holds every pair outside PR5's list to its old answer.
- **On real places:** presenceSample.json's 5,913 places in 61 tag pairs (18 towns in four regions), the SteelStacks tile fixture (144 features) and Phillipsburg's 840 Overture places answer exactly as before: none of PR5's tags occur in them. So no picture differs, and the change is shown by the unit tests (decision 0140 asked for before and after pictures; the steward's S1, accepted in this form, and the owner is told).
- **Re-pinned on purpose:** AG5's and PK14's markable classes gain PR5's six (`arts_centre`, `community_centre` by name, `memorial` by name, `nature_reserve` by name, `park/nature_reserve` by name, `viewpoint`); TP10 and PW10 pin `ATLAS_CODE` `a8.p1`, and a8 rows are read again.
- **The steward** (plan): S1 accepted as above; S2 accepted for nature reserves (a mark only by a notable name) and not for viewpoints (in the tiles a viewpoint arrives as `attraction/viewpoint`, a mark already); the community centre question answered in "What changes".
- **Deferred** (`docs/DEFERRED.md`, Explore and discovery): the second slice (the archive's classes, `barsOf`, notable names, scenic greens, the planner on presence); a checklist takes a new class at the next tile build.
