# 0142. Community parks: a subset of Parks the reader can switch off

Date: 2026-11-11 · Status: accepted · Area: explore, discovery

## Context
The owner walked to an Allentown park ("like Franklin Memorial Park") that held sculptures, monuments and plaques the app
had not said were there, and found that exciting; most parks the app offers are a playground. Every named park was one
kind, "Parks and gardens". The owner asked to tell the two apart without losing the plain ones.

## Decision
The owner's calls, Nov 11:
- **A subset, not a rename.** Parks stays the base kind. "Community parks" is a kind of "What I'm into", after Parks, on
  by default; switching it off hides only those, and every other park stays (the notable ones by definition, with no
  "notable" kind or label). A place keeps one kind. "Parks only now": other categories get no subsets yet.
- **False positives for notable.** The default is a park; a demotion rests on positive evidence: a name that says
  playground, playfield, tot lot, ball field, courts (`communityWords.json`) with nothing notable in or near it.
  **Size never demotes** (the tiles cannot see most of what makes a park worth the walk, and a park cut by tile edges
  looks small). Notable is any place to find inside the outline (or within 60 m of the point), a notable word in the
  name (`parkNotable.json`, `notable.json`), an outline of 5 ha or more, or an archive place within 150 m (a promotion in
  `mergePlaces`).
- **Never described.** Nothing says what a park holds or why it is one kind or the other. An unfound place is never named
  for its kind: bars, waiting kinds, "?" and alerts are by category; "Community parks" shows only in the settings list and
  on a found place.
- **Outlines are read** (the `landcover` layer each read already decodes, SR15) for what lies inside a park; colouring
  green spaces on the map is its own slice, with its own gate.
- The kind is curation over presence's classes (0140: marks stay a separate judgement): `discovery/parkKind.ts`, called by
  the poi adapter and `mergePlaces`; the classes and `PRESENCE_CODE` are untouched.

## Consequences
- `Kind` gains `community_parks`; `ATLAS_CODE` is `a9.<presence code>`; no migration (a place's kind is not cached; a
  checklist keeps `parks` until its area is read again: a park is shown, never hidden, meanwhile).
- The walk planner and scenic routes do not read "What I'm into" and count both kinds as parks (`PASS_BY`); left as it is.
- Proposed for VISION.md's Precedents (the owner's to add): "0142 Community parks: a subset of Parks the reader can switch
  off; a demotion needs a name that says so and nothing notable near; size never demotes; never described (reshaped at the
  gate, Nov 11)".
- Specs: `specs/community-parks/spec.md` (PC1-PC17).
