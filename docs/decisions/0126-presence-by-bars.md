# 0126. Presence by bars: a place may light two; routes lean on places you pass; Community spaces

Date: 2026-11-10 · Status: accepted · Area: explore, discovery, walk-planner

## Context
Coplay, PA showed no History on its card, though the Coplay Cement Company Kilns (a museum on the National Register) sit
inside its outline. The live places archive predates the listing rule, and once it holds the Kilns they are a `museum`,
which the app put in Culture. The owner asked where museums belong, then what categories and kinds suit the data. A
seeded sample of 152 areas measured each way of drawing the bars (`specs/presence-and-kinds/spec.md`, "Why").

## Decision
The owner's calls, Nov 10:
- **Kinds are the switches; the bars are a grouping over them, and a place may light two** ("The presence indicators
  don't have to map cleanly to one type of kind or category").
- **No two bars may become redundant** ("If two groups are identical, the level of information they're meant to convey
  is also redundant"). Measured: every museum in both bars left Culture lit without History in 1 of 56 areas; so a
  museum lights History as well as Culture only when the data already says it is historic: the archive's `museum` class
  (which only a listing produces, contract v2) or a word from `notable.json` in its name (`barsOf`, PK1-PK5).
- **A route from a bar leans on places you pass** ("one requires you to go out of your way and discover it, and the other
  … to go out and plan for it"): places you pass choose its cells when they make the planner's minimum, else every place
  of the bar does ("Pass-by only, if enough"); every place grades the route (PK8-PK10).
- **Community spaces**, a kind in Culture: community centres (a place to find only by a notable name, as a town hall),
  arts centres and libraries (PK11-PK14). Plazas and art walkways wait for a source (0117).
- **The listed buildings held back for want of a sign they are open** (chronicles-data's RD8) are measured by the
  owner's script, in words and lists (PK15).

## Consequences
- `ATLAS_CODE` a8, with no carried codes: every area is read again (PK7).
- A choice saved with Museums and galleries off keeps Community spaces off (PK18, meta `explore_kinds_known`).
- History for an archive museum rests on contract v2; a new contract version revisits it (PK19, the pinned contract's
  README).
- Amends 0084 (AG1: what a findable kind counts, now by `barsOf`), 0102 (the planner's cells) and 0117's kinds.
