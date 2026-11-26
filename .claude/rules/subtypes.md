---
paths:
  - "src/lib/discovery/subtypes.ts"
  - "src/lib/__tests__/explore/smallPlaces*.test.ts"
  - "src/lib/__tests__/explore/subtypes.test.ts"
  - "scripts/e2e/journeys/small-places.js"
  - "scripts/e2e/journeys/subtypes.js"
---
# Subtypes and small places (XS1-XS28, decision 0191; SP1-SP22, decision 0183)

Every kind of "What I'm into" may have subtypes, each a switch of its own under it: bridges and mills under Buildings
and structures, waterfalls under Nature, plaques and time capsules (the small places) and the rest. The archive's classes
come from chronicles-data's contract (v4 brought the subtypes, its ST1-ST10; v6 more attractions; v7 natural monuments; v8 typed bridges); OpenStreetMap locates a pinned table of them (SL1-SL11, ST4).

- **What a place is stays presence's.** A class carries its parent `kind`, its `subset` (the switch) and its `bar`
  weight (`presence.ts`); `subsetOf(classes)` and `barWeight(classes)` read them; nothing outside presence spells an
  archive class (the source-tags guard; `bridge` and `sign` are plain in `streets.ts` and the reaction views, PLAIN_IN).
  The kind id `old_ruins` is not `ruins` because OSM's subclass is spelled so.
- **The registry** is `SUBTYPES` (`discovery/subtypes.ts`): kind, parent, row label, plural, the unnamed words (`single`,
  or null), the default (`on`) and `small`. `SUBTYPE_REFINEMENTS` run after `communityParks`; their rows sit after their
  parents in `KINDS`, which carries each row's `category` for the headings. A new subtype is a presence class with
  `subset`, an entry here and its `Kind`; never a judgment from a name.
- **Small is a flag, not "has a subtype"** (trap): `isSmallPlace` reads `small`. Small places (plaques, markers, small
  memorials, old stones, wayside shrines, time capsules, little libraries, fountains, signs, old trees, survey marks)
  stay out of the planner, scenic Sights and the community-park rule, and are named in a passed line only when nothing
  else was (SP16, SP19, SP20, XS17, XS18). Bridges, waterfalls and the like are full places there. An unnamed place of
  any subtype never pulls a route or a Sight (steward S4).
- **Nature is a sight** though it sits under Parks & green spaces (`isSightKind`, `nav/scenicSignals.ts`): scenic routes
  read parks as green areas, never as points.
- **Defaults:** `DEFAULT_OFF` (the small things and ghost towns, XS6) is added by `parseHidden` for every kind missing
  from `explore_kinds_known`; a save writes every kind as known, so a switch the reader turned on stays on. A reader
  with Viewpoints off before keeps Zoos and aquariums off (XS7); one with Viewpoints or Zoos and aquariums off before
  keeps Amusement parks off (more-attractions audit 1: the map's theme parks were under Viewpoints).
- **Bars (trap):** a profile's `steps` is counted with every subtype left out; `tally` keeps the weighted counts and
  each subtype's share. **Every reader of an area's bars reads `stepsShown(profile, hidden)`** (or the lists through
  `withShownSteps`), or an off subtype lights a bar, or an on one never does.
- **Words:** an unnamed one is named by its type ("A fountain", `archiveUnnamedLabel`) and keyed by those words in its
  ~10 m cell (SP6); an unnamed water tower or cave is no place (ST6). `passedLine` says two of one type in the plural;
  the Found list folds unnamed finds of one type into one plural row (`foundRows`). Never a number; no label names
  significance ("Old trees", "Old taverns and inns", "Nature"; XS25, 0110).
- **Merge:** an unnamed map place and an unnamed archive place of one category within 20 m are one place, the archive's
  (`SAME_UNNAMED_M`, XS14); named ones keep 0103's rule, indexed by name (never a scan inside a loop).
- **"What I'm into"** is its own page since decision 0192 (`.claude/rules/what-im-into.md`): a heading per category
  (`kind-heading-<category>`, a header, ink, pinned while its rows scroll) before its first row, then Complexes'; a
  heading is a label only, never a count (XS19). A kind's row is drawn heavier (600) than its subtypes' (400). The rows
  come from `intoSections` (`explore/intoPage.ts`), so a new subtype in `KINDS` reaches the page with no view change;
  the drawers hold only the row to it.
- **More attractions (MA1-MA9, decision 0198; contract v6):** museums by type (`museum_by_type`, presence `museum` and
  `by_type`, never `recorded`, so Culture alone whatever its name, audit 2; a listed museum stays `museum` and lights
  History too, PK1; a map museum keeps PK2's name rule), nature reserves (subtype Nature reserves under Parks and gardens,
  after Community gardens), amusement, theme and water parks from either source (presence `amusement`, the subtype
  Amusement parks under the kind "Zoos and aquariums", audit 1), piers and boardwalks (subtype under Buildings and
  structures, `bar: 0`: a typed pier lights no History, audit 3; a listed one is `building_structure`). Bridges tell listed
  from typed by the class (MA10, contract v8, the owner, Nov 18): a listed or covered bridge is `bridge` and lights History;
  a suspension bridge known only by its type is `suspension_bridge`, presence's `typed_bridge` (`by_type`, `bar: 0`), in
  the same Bridges row and never unnamed. Natural national
  monuments (contract v7's `natural_monument`, `by_type`) are the subtype Natural monuments under Nature, never History
  (audit 18). `PRESENCE_CODE` p10 (typed bridges), nothing carried. The data ships after the app (the app leaves out a class it does not know).
- **Clock towers apart from water towers** (specs/poi-hide-from-card HK9, decision 0254, amending 0191's plan row): two
  subtypes under Buildings and structures, `clock_towers` and `water_towers`, presence's `clock_tower` and `water_tower`
  each its own subset (`PRESENCE_CODE` p12, nothing carried: an area's tally keeps each subset's share by its key). A
  stored `towers` off, with neither new kind known, keeps both off (`parseHidden`, `RETIRED`). Water towers has no glyph
  of its own: the table's plain dot (the owner, Nov 25).
- **A retired kind** (`RETIRED`, HK10; trap): a split leaves the old id in checklist items (kept until the area's next
  read: a tile build, or its archive block's places changing) and in finds (for good), and no store holds a place's
  class to tell which new kind it is. So the old id stays in `Kind`, `kindParent` reads its parent, `isKindHidden` hides
  it when its parent is off or every kind that replaced it is, `isSubtype` holds, and `kindOf` keeps its old words ("Found:
  … · Water and clock towers"); never let `kindOf` fall to `KINDS[0]` ("Public art"). A place's card and sheet read it as
  its parent alone (`cardKinds`). A split of another subtype adds its row here the same way.
  Since tend explore T65 (decision 0267) an area holding a retired kind is also read again on entry (`retiredAreas`,
  `.claude/rules/explore-marks.md`), so its items take the new kinds; finds keep the old one.
