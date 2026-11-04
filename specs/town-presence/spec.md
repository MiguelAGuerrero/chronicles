<!-- Town presence. Written in the repo first (2026-11-04) from the owner's report (Whitehall's card read "none" for
     everything while MacArthur Road is a strip of shops and the Lehigh Valley Mall is in town) and their calls in
     the conversation. It is the "Whole areas" slice that specs/atlas-grading named as next, for towns, plus
     density pockets. Not a concept-doc tab. -->

# Town presence (TP)

Whitehall's card said "none" for every kind. Its label point is an administrative spot in a quiet part of the
township, and a town's bars counted only the places within 800 m of that point. MacArthur Road's shops and the
Lehigh Valley Mall are 1 to 4 km away. This slice grades a town across its whole outline and finds the pockets
of activity inside it, so a big town with several centres says so.

## Why (the evidence)

Read from Overture's 2026-10-21.0 release (places and division outlines), places open and at 0.5 confidence or
better:

| | Whitehall |
|---|---|
| Label point | 40.6574, -75.5075 |
| Places within 800 m of it (what the card measured) | 44, of which 7 shopping |
| Densest 800 m disc inside the outline | 488 places, 237 shopping, 3.3 km from the point |
| Outline | 7.4 x 10 km, 35 z14 tiles, 1544 places |

Allentown (42 tiles, 5339 places) and Bethlehem (42 tiles, 3927 places) are as wide. Connected-cell clustering
merged all of Allentown's built-up fabric into one blob; peak picking on a smoothed grid separated 12 peaks
(downtown, the hospital district, outer strips).

## Decisions

- **The whole outline** (the owner, 2026-11-04, "my intuition is the entire outline, unless there's a way to
  resolve multiple pockets of density within a city"): a town's kind bars count places across its outline.
- **Pockets** (the owner, 2026-11-04, "let's proceed with those defaults"): the town card lists its pockets of
  activity as "Busy areas", found by peak picking on a smoothed grid, each with Walk to. Neighborhoods keep the
  800 m ring in this slice (their share of a town is the next piece of "Whole areas", `specs/atlas-grading`).
- **Presence, not quality, and no totals** stay: fixed steps, dots and words, never a count (AT4, AT11).

## Acceptance criteria

1. **TP1 · A town is graded across its outline.** For a town with an outline, each kind's bars count the
   places inside the outline (holes excluded, pieces joined), once each, not the places within 800 m of its
   point. The findable kinds still count only places that could be marks (AG1). A neighborhood, and a town
   with no outline, keep the 800 m ring.
2. **TP2 · The outline is the whole town.** The extent comes from the whole-town outline (the z10 read the
   borders use, `outlines.borders`), never from the z12 pieces that are clipped at tile edges.
3. **TP3 · A wide town costs a bounded read.** A town's read takes at most a fixed number of z14 tiles,
   nearest its busiest part first. A town wider than that says so: its card says it covers part of the town,
   and the tile's label does too. Nothing says how many tiles or places.
4. **TP4 · Pockets are found, not merged.** A town's busy places (the same weighted points as busy streets, OSM
   and Overture merged, AD1-AD2) are binned into 400 m cells, smoothed over their neighbours, and peaks are taken
   busiest first, at least 1.5 km apart, up to five, each above a floor of activity. A town whose activity is
   one continuous mass still gives more than one pocket when it has more than one peak; a town with no
   activity above the floor gives none.
5. **TP5 · Whitehall finds MacArthur Road.** On the real Whitehall fixture the busiest pocket is within 500 m
   of 40.6342, -75.4841 (the corridor to the mall) and the town's Shops and Food bars are not "none".
6. **TP6 · A big town has several.** On the Allentown and Bethlehem fixtures, the pockets number at least two,
   are at least 1.5 km apart, and the busiest holds each town's downtown.
7. **TP7 · The card lists the busy areas.** A town's card shows a "Busy areas" section, busiest first, each
   named for the busiest street through it (else "A busy area") with a Walk to that goes to its peak. A
   neighborhood's card has none. No counts, no scores, no ranks as numbers (AT11).
8. **TP8 · The words say the extent.** A graded town's card heading says "What's here" with no "around its
   centre", and the card's explanation says a town is counted across its whole outline. A ring-graded area's
   words stay as they are.
9. **TP9 · A thin town says nothing.** Fewer than 3 mapped places of the eight kinds in the whole outline is
   thin (AG3's rule over the extent).
10. **TP10 · New rules, new reads.** The rules version moves on; every town read under older rules is read again
    and never patched (AG6, AT12). Neighborhood rows are not re-read for it.
11. **TP11 · Shopping centres count as shops.** A shopping mall, department store and supermarket count toward
    Shops, one place each, so a town's retail corridor reads (OSM classes to be confirmed, see the plan).
    Tenants count as they do now.

## Record

(filled in as the slice lands)
