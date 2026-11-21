# 0254. Hide a kind of place from its card, and clock towers apart from water towers

Date: 2026-11-21 · Status: accepted, waits on G12's build · Area: explore, walk-screen · Amends: 0191 (the explore-subtypes plan's "Water and clock towers" row), 0192 (What I'm into's one way in)

## Context
The owner's /investigate, Nov 21: a quick way, from a place's card on the map, to stop being shown a kind of place
("hide", "show less like this", "do not show this"), applying over the category. Today the only way is the walk's
drawer, the "What I'm into" row, then about sixty switches. The brief is `docs/research/poi-hide-from-card.md`.

## Decision
The owner's answers, Nov 21:

- **Hide switches off the card's own kind**, the most specific the card names (a plaque's card hides Plaques), the same
  switch What I'm into shows; nothing new is stored. A place of a subtype also offers its whole parent kind ("There has
  to be a way to toggle the sub category too … I should be able to distinctly hide clocks, but keep the rest of
  historical monuments").
- **Kind only for now**: no "Not this one" for a single place and no "Show less like this" in this slice.
- **A "?" card offers Hide naming its kind**, never the place.
- **Clock towers and water towers become two subtypes**, each its own switch, in this slice (amends 0191's plan row,
  `specs/explore-subtypes/plan.md:33`); a reader who had the shared switch off keeps both off.
- **A second way into the switches**: a card's menu reaches What I'm into besides the drawer's row (0192 kept the page
  and its one gate, `openInto`; this adds a caller, not a route).
- **The look, approved as redrawn** (decision 0252): after a first redraw, the owner: "mark up a different way, like a
  title subtitle of the point of interest where the subtitle is a kind, and the title is the cat[egory]". The card's
  More opens "Show on the map": the kind as a title row and its subtype as a subtitle row, each a switch acting at once
  (the switches are their own undo, so no Undo slab). Approved "Approve as redrawn", Nov 21
  (https://claude.ai/artifact/B2rLDb6EvciUx6LaUFJVHC#artboard-MenuSwitches, `docs/mockups/poi-hide-from-card/`).

## Consequences
- The slice is queued as G12 with nine criteria and no open line; a yes builds it.
- A filter, never a ranking: kinds filter what you see, never what exists (0115). "Show less" stays out unless the owner
  asks again, since nothing on the map is ranked.
