---
paths:
  - "src/lib/presence/**"
  - "src/lib/__tests__/presence/**"
  - "src/lib/discovery/{curation,bars,refine,refinements,parkKind,green}.ts"
  - "src/lib/discovery/{communityWords,parkNotable}.json"
  - "src/lib/__tests__/explore/{presence,communityParks,kindPipeline}.test.ts"
  - "src/lib/__tests__/explore/{presenceSample,presenceTowns}.json"
  - "scripts/fixture-presence.mjs"
---
# Presence and kinds

## Presence: what a place is (PR1-PR8, decision 0140)

- **One classification.** `presence/presence.ts` (core) is the only table from OpenMapTiles poi classes, Overture's taxonomy, the places archive's classes (`classesOfArchive`, PS1) and landcover (`classesOfLandcover`, PS4) to what a place is: `classesOfOsm(cls, sub)` (a class's own rules, then a subclass the same under any class, then the class's default) and `classesOfOverture(hierarchy)` give classes from one vocabulary (`CLASSES`: each a density weight and, where it has one, a category and kind). Density reads `densityWeight` (the greatest), marks and bars `markClassOf` (the first with a category). A feature may carry several classes.
- **Curation is apart.** `discovery/curation.ts` decides what is a mark over classes (`NEVER_MARK`, `BY_NAME`, `MARK_CATEGORIES`); presence says what a place is, never whether it is worth finding. Presence records two facts curation judges (PS3, PS6, PS10): `recorded` (the archive holds it) and `historic_name` (`presence/notable.ts`, the one word list and rule); a `BY_NAME` class is a mark with either. Both weigh nothing; nothing sorts by them (0103: a gate, never a measure).
- **Change a class or a table, bump `PRESENCE_CODE`.** It is part of `ATLAS_CODE` (`a12.p2`) and `LANDING_VERSION`, so atlas and landing rows are read again; when the golden tables show nothing derived changed, carry the last code's rows: `PRESENCE_CARRIED` beside the code, read by the atlas's `CARRIED` and the landing's `LANDING_CARRIED` (PS9: `a12.p1` under `a12.p2`, by `ATLAS_OWN`); only ever the code just before, emptied when a bar, mark or weight changes (presence-readers audit 2). Rows and near reads judge a code alike (`codeCurrent`, audit 4). Cached places keep their read's category (nothing reads them); checklists take a new class at the next tile build.
- **Every reader is on presence** (specs/presence-readers): the archive, bars, notable names, greens and the planner. A place carries `classes` on a fresh read, never stored. It also holds `unnamedLabel` (D4) and `isTransitStop` (L7), and lists every tag it reads (`SOURCE_TAGS`), which the guard (presence-readers audit 1) holds no module outside presence spells, the kind pipeline's among them. Lookups read own entries (`own`, audit 5: `constructor` threw). "Busy" is not presence: traffic, if ever, is a signal of its own (0140).
- **Readers' golden:** `__tests__/presence/readers.golden.json` (captured on main before the slice's code) holds the archive's classes, the poi pairs under three names, the landcover greens and the atlas's marks with their kinds over presenceSample and presenceTowns, also fed outlines (PS8, audit 8). A deliberate change re-captures it, listed in a spec.
- **Golden table:** `__tests__/presence/golden.json` holds what the two old tables answered for every realistic pair; PR8 holds every pair outside PR5's list to it. A deliberate reclassification adds the pair to the test's `CHANGED` with its new answer and to the spec's PR5 table.

## Kinds: bars, community spaces, the kind pipeline, community parks

- **A place may light two bars** (PK1-PK19, decision 0127): `barsOf` (`discovery/bars.ts`, core) is the one rule for both the bars and the planner: a place's category, plus History only from presence's class `historic` (PS11): a museum or gallery the archive records, or whose name is notable once a neighbourhood's “Old Town” and “old and new” are read past (`named`, audit 5; marks read the name whole, PS3). A place without `classes` lights its category alone. A plain museum stays in Culture alone, so History and Culture stay apart (PK5, held by `presenceSample.json`, recorded by `scripts/fixture-presence.mjs`). Re-run PK5 before a second bar for a whole kind. History for the archive's `museum` rests on contract v2 (a museum enters only by its listing): the pinned contract's README says so (PK19).
- **Community spaces** (`community`, in Culture): `town_hall/community_centre`, `library/library` and `community_centre` by a notable name only (presence class `community`, in curation's `BY_NAME`), `art_gallery/arts_centre` and `arts_centre` as any name (class `arts_centre`). `parseHidden(raw, known)`: a choice saved before the kind existed (meta `explore_kinds_known` lacks it, written by `saveSettings`) keeps it off when Museums and galleries is off (PK18); every reader of `explore_hidden` goes through `parseHidden` (the scenic read too).
- **The kind pipeline** (PC18-PC23, decisions 0143, 0144): a registry of pure refinements splits a kind into finer subsets.
  adapter (`tilePois`) -> presence classes -> curation (marks) -> merge of sources (`mergePlaces`) -> **refinement**
  (`discovery/refine.ts` the engine, `refinements.ts` the registry) -> the reader's switches. A `Refinement` is `{ id, parent,
  child, judge(places, ctx) => (place) => boolean }`; `refine(places, ctx, refinements)` returns new places, never mutates, applies in order
  (a child may be a later parent). **A new subset is a new entry in `REFINEMENTS`** plus its child in `KINDS` (after its parent) and
  `Kind`; its words go in a JSON file. The adapter and the merge judge nothing about parks. The reads that feed checklists
  and the atlas call `refineRead(merged, { landcover, archive })` after the merge (`landing/read.ts`, `ringOf`); a read with no
  `landcover` judges by name and what is near the point. Never test a kind against the switches with `hidden.has(kind)`: use
  `isKindHidden(hidden, kind)` (a parent off hides its children, `kindChain`), and `kindSwitch` for a row (off and locked
  while a parent is off).
- **Community parks** (PC1-PC17, decisions 0143, 0163): the first refinement, `discovery/parkKind.ts` (`communityParks`). A park whose
  name holds a word of `communityWords.json` (playground, tot lot, courts), or whose `landcover` outline is under 2 ha (and over a 500 m2 sliver), is the kind `community_parks`
  when nothing notable is in or near it: a mark inside the `landcover` outline (`discovery/green.ts`, `outlinesOf`; within 60 m
  of the point with none), a notable name (presence's `notableName`, read past a neighbourhood's "Old Town/City/Quarter/Village" or "old and new" only just before a community word) or a word of `parkNotable.json` ("heritage" in neither), an outline of 5 ha or more, or an archive place
  within 150 m (the refinement's context). **An outline under 2 ha, not cut at a tile edge, demotes only with nothing notable (0163).** The kind is of the parks category (same bar, colour, find,
  mark); a switch hides only it. **Never name an unfound place for its kind**: bars and waiting kinds are categories, so
  "Community parks" shows only in "What I'm into" and on a found place (`foundLine`). The planner and scenic routes do not
  read "What I'm into" and count both as parks. It is curation (0140), so a change to the words bumps `ATLAS_CODE`'s own
  part, never `PRESENCE_CODE`.
  Its two word files are the refinement's curation, never a second notable rule (PS3, 0146); outlines read presence (PS4).
