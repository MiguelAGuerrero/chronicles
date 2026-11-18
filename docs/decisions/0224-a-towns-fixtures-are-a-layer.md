# 0224. A town's fixtures are a layer of their own, known ahead and never found

Date: 2026-11-18 · Status: accepted · Area: explore, map layers, data packs, finding · Builds on [0221](0221-shops-by-two-facets.md); touches [0103](0103-places-worth-the-stop.md)

## Context
Deciding the kinds of stop (0221), the owner drew a line the app does not have: "there has to be some delineation between
municipalities' fixtures. So something that can be displayed on any area and is not necessarily a point to find ... something that
asserts the level of a settlement. Like, for example, every area might have a visitor center or a plaza ... staples in any developed
community, town, or city. And I would want that to be known ahead of time. And the things to discover within those is a separate
... Think of it like a separate pack or bundle that can be layered. It's effectively another layer on top of what we currently
display."

Today every place is one kind of thing: a point to find. The places pack holds town halls and other civic buildings (3,705),
stations (1,204) and churches (6,176) as finds beside murals and plaques.

## Decision
The owner's answers, Nov 18:
- **Describe and anchor.** A town's card says in words what it has; the map marks where those are, so a person can orient and
  choose where to begin.
- **Words only, no level.** "A plaza, a library and a station." Never a tier, a tally or one town set against another. The owner's
  "asserts the level of a settlement" is met by saying what is there, not by a rank (the vision: nothing is a score).
- **Civic and gathering places**: a visitor centre, a town hall, a library, a post office, a plaza or square, a market, a main
  station; the list drawn from the same count as the kinds of stop.
- **A stop, never a find.** A journey may begin at or pass a fixture and a moment can be made there; it is never marked found
  and is not among the discoveries.

## Deferred (Nov 18)
Deferred by the owner with 0221; the draft list of fixtures and how to resume are in `specs/shop-facets/handoff.md`.

## Consequences
- A third pack in chronicles-data, beside places and stores, read through an adapter; a contract version.
- A new map layer with its own switch, drawn over what the map shows now, for any area, been to or not.
- The kinds that become fixtures stop being finds. What happens to a find already made of one (a town hall found last month) is
  open: a find is a memory and is never taken away.
- The spec is `specs/town-fixtures/spec.md` (TF). Nothing is built.
