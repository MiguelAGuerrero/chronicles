<!-- Repo first: from the owner's request of Nov 17 (compare What I'm into with the data set; decision 0191). Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The data side is chronicles-data's: its docs/subtypes/spec.md (ST1-ST10, contract v4). -->

# Explore subtypes: every kind's subtypes, and the places the archive could not show

Nov 17, 2026 · @Miguel Guerrero

## Vision

Idea: maximize the subtypes per category in "What I'm into" and include more in the data set for a richer exploring experience; be more inclusive than exclusive, and only truly discount things that are really unremarkable (the owner, Nov 17).
Verb: earn ("what makes a place itself": a covered bridge, a waterfall, a carousel, a fountain)
Touches: VISION.md Never, "Tallies such as '12 of 87'" and "Scores, … completion, coverage" (subtypes invite collecting: nothing counts them or treats them as a set, as 0183); Always, "Restraint in motion, colour and copy" (the page is silent on a settings list's length; DEFERRED notes eighteen rows with no headings); decisions 0103 ("type decides"; an unmapped type is left out, never guessed), 0109 (remarkable and public: a listing is the gate, reachable from public ground the bar), 0115 (kinds filter what you see, never what exists), 0117 ("No extra data is fetched or joined only to sort a place"), 0144 (subsets are refinements), 0183 (OSM locates a pinned table; repetitive types off by default; extended here by the owner).
Verdict: aligned if reshaped
Shape: a subtype resolves from a type, tag or name the archive already reads; switches filter what is shown and are never counted, ranked or listed as a set; the truly unremarkable stays out of the data (untyped springs and dams, drinking taps, plain benches, give boxes, wrecks off public ground); the list is grouped under the five findable categories; repetitive types and ghost towns start off.
Criteria: XS1-XS28.
Open: none for the gate; the owner answered four calls on Nov 17 (Decisions).

## What it is

"What I'm into" grows from 18 rows to about 53: two new kinds (Nature; Zoos, aquariums and attractions) and
33 new subtypes, under five category headings. The archive (contract v4, chronicles-data ST1-ST10) adds the types
Chronicles could not show at all (waterfalls, gardens, zoos, fountains, concert halls, observatories, carousels, old
trees, hot springs) and splits its broad classes by what a place is (bridges, mills, stations and lighthouses out of
listed buildings; ghost towns out of ruins; historical markers apart from plaques).

## Decisions

- **The full subtype tree** (the owner, Nov 17): "go with the full findings"; "I'm not against having 45 different
  columns and rows if that gives us a richer data set".
- **Inclusive, not exclusive** (the owner, Nov 17): "only truly discount things that are really unremarkable".
- **OpenStreetMap locates more types** (the owner, Nov 17, "Yes, extend the table"): fountains, water towers, windmills
  and watermills, lighthouses, cannons and locomotives, caves, waterfalls, old trees, botanical gardens; extends 0183.
- **Ghost towns are their own subset, off by default** (the owner, Nov 17); true ruins their own, on.
- **Historical markers split from plaques, on** (the owner, Nov 17); OSM's plaques stay in Plaques, off. Supersedes
  the Nov 16 call "a marker is a marker whoever lists it".
- **Category headings; subtypes fold under their kind, shown while it is on** (the owner, Nov 17).
- **Publish the small places now** (the owner, Nov 17): chronicles-data's `main` took the small-places branch (SL1-SL11)
  on Nov 17; its OpenStreetMap rows reach the pack at the next weekly or hand run (RB8).
- **Small things off by default, unless truly artistic** (the owner, Nov 17): "small little stuff like fountains, unless
  they're truly artistic in nature, are off by default". A fountain typed or tagged as an artwork is Public art (on);
  plain fountains, old trees and survey marks start off; the owner's own "on" calls stand (time capsules, little
  libraries, historical markers); signs and totems are art (on).
- Defaults taken in the plan, for the owner to overrule: see plan.md, "Defaults to overrule".

## Criteria

The owner's task, in their words: "a more rich exploring experience, no matter how small the point of interest is".

- **XS1** (the task): on an exploring walk, an archive waterfall within the range shows as a "?", is named within 60 m,
  and a capture beside it finds it ("Found: Bushkill Falls · Waterfalls", as every named find says its kind); the same for a covered bridge, a fountain and a carousel.
- **XS2** (finding): "What I'm into" shows five headings in order, Art, History, Parks & green spaces, Culture,
  Viewpoints & oddities, each over its kinds; someone told only "turn on ghost towns" finds the row under Curiosities,
  under Viewpoints & oddities.
- **XS3** each archive class of contract v4 maps to one category, kind and subtype, pinned (the plan's table); the app
  pins chronicles-data's contract v4 (PP17).
- **XS4** two new kinds: "Nature" (Parks & green spaces: waterfalls, caves, hot springs and geysers, old trees) and "Zoos and
  aquariums" (Viewpoints & oddities: the map's zoos and aquariums, and the archive's); the map's attractions and theme parks
  stay under "Viewpoints and attractions" (amended by the audit, explore-subtypes audit 12: "attractions" names a draw, so
  it is no new kind's name; the shipped label's word is the owner's open question).
- **XS5** a subtype's row shows indented under its kind only while the kind is on, and is off and locked under a kind
  switched off (PC23 holds for every subtype).
- **XS6** on a fresh install, Plaques, Small memorials, Milestones and old stones, Wayside shrines and crosses, Ghost
  towns, Fountains, Old trees and Survey marks and centre points are off; every other subtype and both new kinds are on.
- **XS7** after the update, a reader's saved switches keep their meaning: a kind they had off hides its new subtypes;
  "Viewpoints and attractions" off keeps "Zoos, aquariums and attractions" off; a subtype that starts off is off until
  seen (SP8's mechanism).
- **XS8** a subtype switched on or off stays so after a reload and a new archive version.
- **XS9** an off subtype's places show as no "?" on a walk, on Explore's map or in an area's "Waiting to be found".
- **XS10** a historical marker from the archive is in "Markers" (History, under Monuments and memorials, on; not "Historical
  markers", which PK16 reads as a credential);
  an OpenStreetMap plaque is in "Plaques" (off).
- **XS11** statues and busts are Public art (subtype "Statues and busts"), from the archive and the map alike; a map
  artwork whose type the tiles do not carry stays Public art itself.
- **XS12** ruins are one subtype whatever the source: the archive's `ruin` and the map's `castle/ruins` are "Ruins"
  under Curiosities; a castle stays under Monuments and memorials.
- **XS13** an unnamed place of a class that may come unnamed is named by its type ("A fountain", "A waterfall", "A
  lighthouse", "A water tower", "A war memorial", "A mill", "An old machine", "A hot spring", "An old tree", "A
  carousel"); its card and find say that name once; each such class has a pinned single and plural.
- **XS14** an unnamed archive statue and an unnamed map artwork within 20 m are one place, the archive's (the review's
  duplicate).
- **XS15** an area's bars weigh each subtype by the size of the stop (plan's table), only while it is on; flipping a
  switch changes the dots without reading the area again (SP12, SP13 hold for every subtype).
- **XS16** none of the new classes weighs toward storefronts but a concert hall, an observatory, a zoo and a historic
  tavern (places you walk into).
- **XS17** the planner and scenic routes treat a new subtype's place as its kind's (a covered bridge pulls a History
  route; a waterfall is a scenic Sight, though Nature sits under Parks & green spaces); the small subtypes and every
  unnamed place stay out of them, and small subtypes out of the community-park rule (SP16, SP19; steward S4).
- **XS18** the walk's card and the replay's passed line keep their bounds; a small place is named only when nothing else
  was passed (SP20), and the new small subtypes (markers, fountains, signs, old trees, survey marks) count as
  small: passing a museum and three historical markers says "Passed <the museum> without stopping", and a History route
  is not pulled by markers (steward S3).
- **XS19** no screen shows a number of places of any subtype, or a share found; no heading or kind row says how many of
  its subtypes are on, off or present (the gate; steward S6).
- **XS20** every new subtype resolves from a class the archive carries or a tile class and subclass; no place is sorted
  by a fetch of its own (the gate; 0117).
- **XS21** an untyped spring or dam, a drinking fountain, a bench that is no memorial and a give box are never places
  (the gate; data ST5, ST7).
- **XS22** the headings and rows read at the default text size on a 320 px phone without a row's label wrapping, and at
  200% with nothing lost (`.claude/rules/ui-patterns.md`).
- **XS23** a heading is announced as a header by a screen reader; a subtype's row says it is part of its kind
  (small-places ui 2 holds).
- **XS24** "What I'm into" is the same list in the ready bar's settings and the walk's drawer (NV21).
- **XS25** no kind, subtype, plural or unnamed label contains "notable", "remarkable", "champion", "landmark", "listed",
  "famous" or "wonder"; taverns read "Old taverns and inns", never "Historic" ("Historical markers" is the signs' own name) (0110, RP18: no kind is named for significance; steward S1, S2).
- **XS26** three unnamed fountains found in one area read as one Found row "Fountains", with no number; passing two reads
  "Passed fountains without stopping"; the same for every class that may come unnamed (SP15, SP21, SP22; steward S5).
- **XS28** a fountain the archive classes as a sculpture (typed or tagged as an artwork) is Public art and shows with
  Fountains off; a plain fountain shows only with Fountains on.
- **XS27** an unnamed OpenStreetMap water tower is no place; a named one, or one tagged `historic` or `heritage`, is
  (data ST4; steward S4).

## Not here

- Splitting places of worship by tradition, house museums, chapels and meeting houses (counted by the review; not
  asked).
- Mountain peaks from the map's `mountain_peak` layer (outside towns; a slice of its own).
- A bar's breakdown by type on a card (0183's later slice).
- Outside the US: the archive is US-only; elsewhere only the map's classes feed the new kinds.

## Record (Nov 17)

- **Built:** XS1-XS28, every criterion tested first by history (`check:test-first`, 28 of 28): 25 unit tests in
  `src/lib/__tests__/explore/subtypes.test.ts`, the `subtypes` journey for XS1, XS2, XS6, XS19, XS22-XS24.
- **Suite:** `npm test` (2,761), typecheck, lint (7 warnings, all on `main` too), docs and vision checks pass. The 14 journeys
  `check:affected` named ran once each: 12 pass (`marks` and `curiosities` after taking the headings' order and the
  folly's subtype); `scenic`'s "fix preview-clutter audit 1" and `drive`'s area-card wait fail on `main` too, 3 of 3
  runs each (`e2e:baseline`).
- **Older tests moved to the owner's calls:** PP17, SP3-SP17, RP13, RP15, PK14, PR8 (six pairs in `CHANGED`), the p5
  history test (generalised); `readers.golden.json` re-captured with every change accounted for (statues Art, attractions
  their own kind, the map's ruins Curiosities, murals and markers subtypes, one statue and artwork merged in South End).
- **Steward:** S1-S7 accepted (XS25-XS27, the defaults listed); its silent questions answered in the plan.
- **Cold find and UI review:** found Ghost towns, Bridges and the kind switch; four icons read wrong (gear, footprints,
  skull, pen), fixed behind `explore-subtypes ui 1`. Not found from three scroll positions: Fountains, Waterfalls; and
  whether a kind's switch covers its subtypes: deferred to the owner (`docs/DEFERRED.md`, ui 2, ui 3).
- **Data:** chronicles-data's contract v4 (ST1-ST10) is built and tested on `claude/explore-subtypes`; published early
  on Nov 17 (`20261117.19`) and reverted (`20261117.21`, v3 classes) until this app ships.
- **Native:** nothing native changed; never run on a device (`docs/NATIVE_UNVERIFIED.md`).

## Audit (Nov 17, the owner's /audit)

The auditor (10 findings), the steward (S8-S12) and the UX reviewer (U1-U6, after a cold find of four icons, already
fixed as `explore-subtypes ui 1`); triaged in one numbering:

1. A v3 pack's OSM plaques read as on "Markers" (auditor F1): accept, presence's `archiveClassOf`; `explore-subtypes audit 1`.
2. Labels wrap at 320 px and the XS22 check could not see it (F2, U1): accept, every label the type's own name, lines
   counted in the journey; `explore-subtypes audit 2` (e2e).
3. The 20 m unnamed-twin rule merges unrelated things of one category (F3): accept, artworks only; `explore-subtypes audit 3`.
4. A found unnamed artwork reappears unfound after the merge (F4): accept; `explore-subtypes audit 4`.
5. Saved switches change meaning for statues and markers (F5): accept for those two; Survey marks off is the owner's
   "small things off"; the map's ruins moving is XS12's; `explore-subtypes audit 5`.
6. Scenic routes and the planner drop the map's unnamed viewpoints and art (F6): accept, only unnamed subtype places stay
   out; `explore-subtypes audit 6`.
7. A town page from a raw row shows bars far too low (F7): accept, `rowsShown` for every reader of `rows`;
   `explore-subtypes audit 7`.
8. Ghost towns still wore footsteps and `ui 1` checked a name the app never uses (F8): accept; `explore-subtypes audit 8`.
9. A zoo's enclosures become places (F9): accept; `explore-subtypes audit 9`.
10. The replay repeats unnamed finds (F10): accept, `replayFound`; `explore-subtypes audit 10`.
11. Unnamed murals repeat as "Public art" rows (S8): accept; `explore-subtypes audit 11`.
12. "attractions" names a draw (S9): accept in part, the new kind is "Zoos and aquariums" and the map's attractions and
    theme parks stay with "Viewpoints and attractions" (the shipped word, the owner's open question in STATUS); XS4
    amended; `explore-subtypes audit 12`.
13. Markers weigh a half (S10): accept, a quarter as plaques; `explore-subtypes audit 13`.
14. "Taverns" in a sentence (S11): accept, "Old taverns"; `explore-subtypes audit 14`.
15. The pictures predate the icon fix (S12): accept, retaken after the fixes (no test: a process finding).
16. Headings smaller than their rows (U2): accept, the rows' size and bold; `explore-subtypes audit 16` (e2e). The
    section title "What I'm into" sharing the drawer's section style is deferred (a shared style).
17. No heading in view mid-scroll (U3): defer, the owner's (DEFERRED, ui 2 and ui 3).
18. Fifty-eight switches inline under "This walk" (U4): to the owner, who chose its own page (decision 0192, Nov 17): the next slice.
19. Off switches may fail 3:1 (U5): defer, the shared `SwitchRow`, to be measured.
20. An unlabelled map button over the drawer at 320 px (U6): defer, not this slice's.

20 findings: 16 accepted (15 fixed behind tests, 1 process), 3 deferred, 1 to the owner (answered: decision 0192, its own slice), 0 rejected.
