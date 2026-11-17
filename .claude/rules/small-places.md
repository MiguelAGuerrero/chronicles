---
paths:
  - "src/lib/discovery/smallPlaces.ts"
  - "src/lib/__tests__/explore/smallPlaces*.test.ts"
  - "scripts/e2e/journeys/small-places.js"
---
# Small places (SP1-SP22, decision 0183)

Time capsules, plaques, little libraries and the like: OpenStreetMap locates them in chronicles-data (its SL1-SL11,
contract v3); here each is a subset of an existing kind with a switch of its own.

- **What a place is stays presence's.** A small class carries its parent `kind`, its `subset` (the switch) and its `bar`
  weight (`presence.ts`: `plaque`, `small_memorial`, `old_stone`, `wayside_shrine`, `time_capsule` ¼; `bookcase` ½;
  `community_garden` ½ with no subset). `subsetOf(classes)` and `barWeight(classes)` read them; nothing outside presence
  spells an archive class (the source-tags guard). `marker` is a plaque whoever lists it (the owner, Nov 16).
- **The subsets** are `SMALL_SUBSETS` (`discovery/smallPlaces.ts`): row label, plural, the unnamed words, the default.
  `SMALL_REFINEMENTS` run after `communityParks`; their rows sit after their parents in `KINDS`. Murals, sculptures,
  statues and community gardens have no switch: they are their kinds' places, as the map's are.
- **Defaults:** `DEFAULT_OFF` (the four History subsets) is added by `parseHidden` for every kind missing from
  `explore_kinds_known`, so a fresh install and an update both start them off; a save writes every kind as known, so a
  switch the reader turned on stays on.
- **Bars (trap):** a profile's `steps` is counted with every small subset left out; `tally` keeps the weighted counts and
  each subset's share. **Every reader of an area's bars reads `stepsShown(profile, hidden)`** (or the lists through
  `withShownSteps`, as `useAtlas` returns them), or an off subset lights a bar, or an on one never does. This is the one
  exception to 0115: bars follow the reader's switches; marks and "?" already did.
- **Never a reason, never a lean:** `isSmallPlace` (by classes, whatever kind a refinement has given it yet) keeps small
  places out of `communityParks`' signals and archive check (SP19), the planner (SP16) and scenic Sights (SP16).
- **Words:** an unnamed one is named like an unnamed viewpoint ("A plaque", `archiveUnnamedLabel`) and keyed by those words
  in its ~10 m cell (SP6). `passedPlaces` keeps small places only when nothing else was passed (`keepTheLows`, SP20);
  `passedLine` says two of one type in the plural ("Passed plaques", SP22); the card's Found list folds unnamed finds of one
  type into one plural row (`foundRows`, SP21). Never a number.
