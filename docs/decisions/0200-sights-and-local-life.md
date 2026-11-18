# 0200. Sights and Local life: the presence bars in two groups, by whether you go in

Date: 2026-11-18 · Status: accepted · Area: explore, atlas, presence, discovery, vision · Amends: decisions 0084 (what Culture counts), 0127 (a museum lighting History and Culture; Community spaces in Culture), 0067 (the card's eight kinds), 0115 (museums among the out-of-town stars)

## Context
In downtown Stroudsburg, PA, with every kind on, the owner saw the card's dots say "plenty" and found one "?" on the map.
A reproduction over the live tiles and the places archive found about 20 marks in the ring, but Food, Shops and Nightlife
count every place and never yield a "?", and the pins fold into dots in a dense core. Over decision 0127's 152-area sample,
145 of 421 lit bars have no "?" behind them. The owner asked for two sets: places to find, and the types of places you go
into. An investigation (Nov 18) measured the split on 12 live areas and the sample: Culture is empty or redundant with
History everywhere once listed museums count as History, and marks fall 0-46% (Stroudsburg 20 to 15, Philadelphia 116 to 74).

The vision gate judged it **aligned if reshaped** (Earn): presence stays structural, and the second group never becomes a
"?", a name, a ranking or a measure of how busy a place is.

## Decision
The owner's calls, Nov 18:
- **One test decides the group:** "could you come across it and be struck by it from outside, or only if you go in?"
  A museum or gallery is not remarkable as a find unless you enter it; an outdoor memorial is.
- **Sights:** History, Art, Green, Views. They count only places that can be a "?", as now.
- **Local life:** Food, Shops, Nightlife, Culture (museums, galleries, theaters, cinemas) and Community (libraries,
  community and arts centres). Each keeps its own bar; none is ever a mark, a find or a named item. Chains count toward
  their type. "Life" stands for the heading where a tile is tight.
- **The building is the find** when the places archive records it under a listing-gated class, or its name says
  "memorial" or "monument": it stays a Sight, under History, never Culture. Other museums, galleries, theaters, cinemas,
  band shells, theme parks and planetariums are Local life.
- **The Museums and galleries, Theatres and Community spaces switches stay**, ids unchanged, and hide those types in
  Local life. Finds are truth and never edited.
- **The Storefront flag is unchanged** (0180): density is a separate question.
- **Display:** one row with two quiet headings now; a line in words on the card later; no map layer for the second group
  for now.
- **The out-of-town stars (0115)** follow the same rule; museum "?" prompts on exploring walks go.
- **Phased:** Phase 1 groups the existing bars under the two headings (view only). Phase 2 moves enterable venues out of
  the marks, and waits until chronicles-data covers National Park Service sites or carries a listing flag, or Independence
  Hall, Congress Hall and the Betsy Ross House disappear.
- Stroudsburg's data gaps (Kitson Woolen Mill, Fort Hamilton, murals) go to chronicles-data separately.

## Consequences
- Phase 1: `MARKS_EXPLAINED` and the card's and tiles' kinds change; no cache, no `PRESENCE_CODE` bump.
- Phase 2: `curation.ts` and presence classes (theme park, outdoor stage); `PRESENCE_CODE` bumped with nothing carried;
  both presence goldens re-captured; the scenic routes' Sights, community-park signals, the planner's bars and
  `discovery/bars.ts` `PASS_BY` (which already holds the test by kind) are read again.
- "What I'm into" gains the same two headings (DEFERRED, presence-and-kinds audit 11).
- Open for the slice: whether a found museum stays in its area's "Found" list (recommended yes).
- The evidence is the investigation's report, kept out of the repo; its numbers are quoted here.
