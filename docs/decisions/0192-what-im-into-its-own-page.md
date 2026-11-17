# 0192. "What I'm into" gets its own page

Date: 2026-11-17 · Status: accepted · Area: explore, settings, navigation

## Context
Explore subtypes (decision 0191) took "What I'm into" from 18 rows to about 58 under five category headings, inline in the
ready bar's settings and the walk's drawer, under "This walk". The audit's UX review (explore-subtypes audit 18, U4) found
the switches are lasting preferences shown under a heading that says they are for this walk, and the cold find and U3
found a heading scrolls away with its rows, so a row's group can't be told mid-scroll.

## Decision
The owner's call, Nov 17 ("Own page, one row"): "What I'm into" becomes one row with a chevron in the ready bar's
settings and in the walk's drawer; it opens a full-height page of its own, the same page from both, with the five
category sections and their headings pinned while their rows scroll.

## Consequences
- Its own slice, spec-first (a route, the two entry rows, the page; the journeys that open the switches in the drawer
  move to the page: subtypes, small-places, marks, nudge).
- XS2, XS5, XS22-XS24 hold on the page; the drawer keeps the range and the pocket alert.
- docs/DEFERRED.md's "Explore subtypes" items on headings scrolling away (ui 2, ui 3) are answered by this slice.
