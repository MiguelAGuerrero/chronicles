# 0163. Community parks: a small outline with nothing notable is one too

Date: 2026-11-13 · Status: accepted · Area: explore, discovery · Amends: decision 0143 ("size never demotes", PC1, PC17) · From: `/fix community park`

## Context
The owner reported that with Community parks switched off they still get parks with no heritage, history or notable
feature: ordinary neighbourhood parks with a playground and a little green. Under 0143 a park was a community park only
when its name held a play word (playground, tot lot, courts); "Maple Street Park" with a swing set kept the kind `parks`,
so the switch could not hide it. The owner chose the fix in person on Nov 13 (a proxy's answer would not count, 0157).

## Decision
- A park is a community park when nothing notable is in or near it (a notable name, a mark inside its outline or within
  60 m of the point, an archive place within 150 m, an outline of 5 ha or more) **and** either its name holds a community
  word (as before) or its `landcover` outline is **under 2 ha**.
- An outline under 500 m2 is a sliver (a park cut at a tile edge, the steward's finding 2 of 0143) and says nothing of
  size. No outline found stays a park unless the name says play (PC3). Everything notable stays a park: the default
  for any doubt is still the park.
- An outline with a vertex on a z14 tile edge is a cut piece and says nothing of size (audit 1); when several outlines hold the
  point the largest area decides and a mark inside any of them (outer ring) keeps it a park (audits 2, 4).
- `PARK_RULES.smallM2` (2 ha) and `sliverM2` (500 m2). `ATLAS_CODE` a12, none carried (every level's park kinds change).

## Consequences
- 0143's "size never demotes" no longer holds; the owner's "false positives for historicity" is kept for everything the
  data can see, and given up for a small outline with nothing in it. The risk: a quiet small park whose plaques the tiles
  and archive cannot see is hidden with the switch off. The switch is the reader's, on by default.
- Specs: `specs/community-parks/spec.md` PC1 and PC17 amended.
