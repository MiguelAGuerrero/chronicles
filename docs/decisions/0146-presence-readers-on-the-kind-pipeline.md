# 0146. Presence readers land on the kind pipeline: one notable rule, park words as curation

Date: 2026-11-11 · Status: accepted · Area: explore, discovery, presence

## Context
Presence's second slice (G4, `specs/presence-readers`, PS1-PS11) was built on `0d03c4b` and parked as
`slice/presence-readers-parked` when main gained community parks and the kind pipeline (PC1-PC23, decisions 0143, 0144)
beside it: greens read from raw landcover tags in a new `discovery/green.ts`, a second list of name words
(`parkNotable.json`, with `communityWords.json`) in `discovery/parkKind.ts` beside `notable.json`, and `ATLAS_CODE` a9.
`/tend` filed the question as inbox T8 [arch]. Decision 0140 says consumers read presence's classes, never source tags;
G4's criterion 3 says whether a name is notable is decided once.

## Decision
The owner's answer to T8, Nov 11, the recommended option:
- **Resume the parked slice on main as it stands**, its golden tables captured again on main before any code.
- **Greens read presence.** `discovery/green.ts` reads `classesOfLandcover` (PS4); the kind pipeline's park outlines are the
  parks among those greens.
- **One notable rule.** `parkKind.ts` asks presence (`notableName`, `presence/notable.ts`). Its park words
  (`parkNotable.json`, `communityWords.json`) stay as the community-parks judgement: curation of a refinement, named so in PS3,
  and not a second notable rule.
- **The carry is `a9.p1` under `a9.p2`.** One list, `PRESENCE_CARRIED`, and `codeCurrent` (presence-readers audits 2 and 4)
  as built; the atlas spells the carry with its own part (`ATLAS_OWN`), so a bump of that part carries nothing.
- **The guard reads the kind pipeline.** PS7 and presence-readers audit 1 (`SOURCE_TAGS`) walk `refine.ts`,
  `refinements.ts`, `parkKind.ts` and `green.ts` like any module.
- Nothing a person sees changes; `/vision`: no surface.

## Consequences
- The other option, folding `parkNotable.json` into `notable.json`, was not taken: a church or town hall named "national" or
  "arboretum" would have become a mark by its name.
- A new refinement's name words are its own curation in a JSON file (0144); whether a name is notable stays presence's.
- G4 leaves "Next evolutions"; T8 leaves the inbox. Spec: `specs/presence-readers/spec.md` (Decisions, PS3, PS4, PS7, PS9).
