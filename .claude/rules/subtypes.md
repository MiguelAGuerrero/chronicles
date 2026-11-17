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
come from chronicles-data's contract v4 (its ST1-ST10); OpenStreetMap locates a pinned table of them (SL1-SL11, ST4).

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
  with Viewpoints off before keeps Zoos, aquariums and attractions off (XS7).
- **Bars (trap):** a profile's `steps` is counted with every subtype left out; `tally` keeps the weighted counts and
  each subtype's share. **Every reader of an area's bars reads `stepsShown(profile, hidden)`** (or the lists through
  `withShownSteps`), or an off subtype lights a bar, or an on one never does.
- **Words:** an unnamed one is named by its type ("A fountain", `archiveUnnamedLabel`) and keyed by those words in its
  ~10 m cell (SP6); an unnamed water tower or cave is no place (ST6). `passedLine` says two of one type in the plural;
  the Found list folds unnamed finds of one type into one plural row (`foundRows`). Never a number; no label names
  significance ("Old trees", "Old taverns and inns", "Nature"; XS25, 0110).
- **Merge:** an unnamed map place and an unnamed archive place of one category within 20 m are one place, the archive's
  (`SAME_UNNAMED_M`, XS14); named ones keep 0103's rule, indexed by name (never a scan inside a loop).
- **"What I'm into"** draws a heading per category (`kind-heading-<category>`, a header, ink) before its first row; a
  heading is a label only, never a count (XS19).
