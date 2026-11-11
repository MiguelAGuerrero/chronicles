<!-- Repo first (like remarkable-and-public, explore-atlas): not yet a tab of the owner's concept doc. Amends "Atlas grading" (specs/atlas-grading/spec.md), "Walk planner" (specs/walk-planner/spec.md) and the kinds of "Remarkable and public" (specs/remarkable-and-public/spec.md). -->

# Presence and kinds

Nov 10, 2026 · the owner, after "why does Coplay's card show no history?"

The Coplay Cement Company Kilns, a museum on the National Register, show nowhere on Coplay's card. The live places
archive predates the listing rule, so it doesn't hold them. Once it does, the Kilns would light Culture, not History. This slice makes the
presence bars say what is there: a museum the data already calls historic lights History as well as Culture; a route
through a group leans on the places you pass rather than the ones you must go in; community spaces get a kind of their
own under Culture; and the gate that holds back most listed buildings is measured.

## Why (the measurement, Nov 10)

Run with the app's own adapters over OpenFreeMap's tiles (`20261101_080013_pt`), the live archive (`20261110.3`) and
chronicles-data's classifier over Wikidata:

- **Coplay.** The Kilns are Wikidata Q5168618 (museum, National Register 80003556, -75.495, 40.676111), 613 m from
  Coplay's point, inside Coplay's Overture outline. The tiles hold no feature for them; the live archive holds one place in
  the whole z12 tile (George Taylor House, as the v1 class `heritage_building`, which the app no longer reads). The
  repo's classifier admits them as `museum`, which the app maps to Culture. The History bar is 0 either way.
- **Small towns against cities** (15 towns in 14 states, every listed place in a 4 km box; six downtown boxes): 5 of 61
  listed places shown in small towns, 58 of 285 in cities; History lit in 8 of 15 towns and 6 of 6 cities.
- **Making the bars redundant** (152 areas drawn at random from the tiles' place points in 17 regions):
  - every museum in both bars leaves Culture lit without History in 1 of 56 areas, and lit by museums alone in 30;
  - a museum in both only when listed or notable-named leaves Culture alone in 12 of 56, and lit by museums alone in 5;
  - museums in History only leaves Culture lit in 26 of 152.
- **The kinds are independent.** No kind is lit in nine areas in ten of those where another is (Parks aside).
  Places you pass (monuments, buildings, churches, cemeteries, art, views) and places you go into (museums,
  theatres) are each lit without the other: 29 and 10 areas.
- **What the tiles drop.** Community centres: 48 named places in 30 areas, dropped today.
- **Listed buildings held back.** Of 595 listed places in the sample's boxes, 425 would be Buildings and structures, and
  343 of those wait for a source saying they are open (chronicles-data's RD8).

## Vision

Idea: The presence bars say what is there: a museum the data already calls historic lights History as well as Culture, and no two bars become redundant; a route opened from a bar leans on places you pass, not places you go into; community spaces get a kind under Culture; the gate holding back listed buildings is measured in words (the owner, Nov 10).
Verb: earn (where there is a lot and what makes a place itself: a town's history shows when its history is a museum in an old kiln, and a route walks past what can be seen)
Touches: Always, "Guidance is structural: where there is a lot, and what makes a place itself, never whether it is good"; Never, "Ratings, reviews, stars, 'best of', rankings of places" (nearest fit: "open-data signals such as a heritage listing"); Never, "Tallies such as '12 of 87' or '40%'" (the measurement); Always, "A route is a suggestion"; decision 0044 and S18 ("a mark is for an attraction"); AG1 ("a plain parish church counts toward nothing"); AG5 (`MARKABLE_CLASSES` pinned); 0109-0111 and RP11, RP18 (nothing about a listing shown or stored; no kind named for significance); 0115 (kinds filter what you see, never what exists); 0117 (a kind from what is already read; no data fetched only to sort a place); 0122 (plain labels); the planner's banned words (WP14, KW7).
Verdict: aligned if reshaped
Shape: A community centre is a place to find only when its name says it is historic or notable, as a town hall or library is (AG1, S20); a plain one counts toward nothing. Plazas and art walkways are not in any data the app reads, so they wait for a source (0117). The lean toward places you pass is by kind, never by a place's name, rank or popularity, and never named on screen. A museum lights History from what is already read (the archive's class, the name's words), never from a new field naming a listing. The measurement is the owner's script, in words and lists.
Criteria: PK16 (nothing about a listing or notability shown), PK17 (the planner names no place and says no count), PK12 (a plain community centre is not a place to find), PK15 (the measurement in words and lists, never a percentage).
Open: none (the plan's questions answered Nov 10).

## Decisions

- **Nov 10:** "museums and other sorts of galleries … fall under history rather than culture"; then "we can still keep
  the museum kind, but its rating in the presence indicators could just be assigned to history. The presence indicators
  don't have to map cleanly to one type of kind or category." Kinds are the switches; the bars are a grouping over them.
- **Nov 10:** "a single entry can belong to both", "as long as one group isn't made redundant because of the presence of
  another group … If two groups are identical, the level of information they're meant to convey is also redundant, and
  therefore they should be excluded." Measured: every museum in both fails this; a museum in both only when the data
  calls it historic passes (V3).
- **Nov 10:** "a gallery and a monument that you can walk and see has a different experience … one requires you to go
  out of your way and discover it, and the other … to go out and plan for it", for routes through a group.
- **Nov 10:** Culture is "theaters and other community spaces (like art walkways, murals, or plazas particular to that
  area)"; "a museum … reflects … the past".
- **Nov 10:** "fold all three into a V3 slice": the redundancy rule (V3), the lean toward places you pass, the Community
  kind, with the gate's measurement.
- **Nov 10 (the plan's questions):** the kind is "Community spaces"; a route leans on places you pass only ("Pass-by
  only, if enough": they choose the cells when they make the planner's minimum, else every place of the bar does); a
  community centre is a place to find only when its name holds a notable word, as a town hall or library; the plan
  approved, tests first.

## Acceptance criteria

The bars:

1. **PK1 A museum in the archive lights History.** A place the places archive holds as a museum lights the History bar
   and the Culture bar of the area it is in. Coplay with the Kilns (Q5168618, from a frozen archive fixture) shows History
   and Culture at one step or more.
2. **PK2 A museum named historic lights History.** A museum or gallery from the map whose name holds a word from
   `notable.json` lights History as well as Culture.
3. **PK3 A plain museum is Culture only.** A museum or gallery from the map with no such word, and not in the archive,
   lights Culture and not History.
4. **PK4 Once per bar.** A place lights each of its bars once, however many sources hold it (PW8's merge); a museum in
   both the map and the archive is one place in History and one in Culture.
5. **PK5 The bars stay apart.** On the recorded sample (152 areas, Nov 10, real tiles and Wikidata, frozen), Culture is
   lit without History in at least one area in ten of those where Culture is lit, and History without Culture in at least
   one in ten of those where History is lit.
6. **PK6 Small towns and a city.** With frozen fixtures of their tiles and archive places: Coplay, PA (the Kilns),
   Galena, IL (Old Market House, Q7084478) and Andalusia, AL (Three Notch Museum, Q16901630) each show History at one
   step or more, with their museum among the places lighting it; Philadelphia's Old City shows History and Culture at
   the same steps as before the slice.
7. **PK7 Cached bars are read again.** An area read under the earlier rules (any code before this slice's, at any level)
   is read again before its bars show (`ATLAS_CODE` bumped; no carried codes).

The routes:

8. **PK8 A route through a bar uses the bar's places.** The planner opened from a bar counts every place that lights that
   bar (PK1-PK3 included) toward its cells; a bar whose places make fewer than the planner's minimum of cells is still
   answered "few" (steward 3: one place is not "a lot").
9. **PK9 The lean toward places you pass.** When a bar's places include places you pass (monuments and memorials,
   buildings and structures, places of worship, cemeteries, public art, viewpoints, curiosities, parks), the planner
   chooses its dense cells from those; places you go into (museums and galleries, theatres, community spaces) still grade
   the route's exposure. When the places you pass can't make the planner's minimum of cells, all the bar's places choose
   them.
10. **PK10 The other kinds along a route** (`alsoPasses`, WP28) count a place in every bar it lights.

The Community kind:

11. **PK11 A kind for community spaces.** "What I'm into" has a kind for community centres, arts centres and libraries,
   in Culture, on by default; a saved choice made before it exists leaves it on.
12. **PK12 A plain community centre is not a place to find.** A community centre is a place to find only when its name
   holds a word from `notable.json`, as a town hall or library; a plain one counts toward nothing (AG1).
13. **PK13 Arts centres and libraries move.** An arts centre or library that is a place to find is of the Community kind;
   a museum or gallery stays in Museums and galleries.
14. **PK14 The definition of a place to find, re-pinned.** `MARKABLE_CLASSES` lists the community centre, by name only,
   and the moved kinds; its test pins the new list (AG5).

The measurement:

15. **PK15 The gate measured in words.** An owner-run script (network, never CI) lists, for named areas, the listed
   places the archive holds back for want of a sign they are open, by name, and says in words how often History and
   Culture are lit apart; its report holds no percentage.

18. **PK18 The walker's switch is kept.** A saved "What I'm into" with Museums and galleries off leaves Community spaces
   off, so the libraries and arts centres it hid stay hidden (steward 2; 0115).
19. **PK19 The museum rule rests on the archive's contract.** History for an archive museum is the app's reading of the
   contract's `museum` class (contract v2: a museum enters only through a listing); the pinned contract's notes name
   PK1, so a new contract version (which already fails PP17) is where the rule is revisited (steward 1).

From the gate:

16. **PK16 Nothing about a listing or notability is shown.** No screen, label, announcement or stored field names a
   listing, a register or notability; the bars stay dots; the new kind's label passes `labels-plain` and RP18.
17. **PK17 The planner names no place and says no count.** A route's words and the planner page name no place and hold
   no number of places; the lean is never said ("places you pass" appears nowhere on screen); WP14's banned words hold.

## Record

Built Nov 10 on `claude/dazzling-fermat-ws5c6a`, test-first by history (19 of 19: todos at `598efef`, real at
`e64a507`). PK1-PK19 pass with typecheck, lint and `npm test`. The fixtures are real data recorded by
`scripts/fixture-presence.mjs` (OpenFreeMap `20261101_080013_pt`; chronicles-data's classifier at its `main`, `22afcdf`).
PK5 on the sample: the bars stay apart under the rule. Re-pinned on purpose: TP10 and PW10 (`ATLAS_CODE` a8, nothing
carried), E16 (eleven kinds), AG5 (the community centre, by name). Deferred: `docs/DEFERRED.md`, "Presence and kinds".
Nothing native is new; not audited (decision 0074). Journeys (one run each): atlas, curiosities, grading, marks,
nudge, outlines, planner, replay pass; scenic failed one check (fix preview-clutter audit 1) on the branch's old base,
passed 3 of 3 on main (`e2e:baseline`) and passed after main was merged in (`0f3f216`), so it ran twice. The decision is
0126 (main took 0125 for moment references while this was built). PK15's report run live on the gate's areas: Lititz's
Sturgis Pretzel House (0116's test case) is among the listed places held back for want of a sign it is open.

## Audit (Nov 11, at the owner's request)

Three reviewers, with phone-size pictures from the `marks` journey (a new shot, `marks-what-im-into`, beside PK11's new
on-screen check) and the `atlas` journey: the auditor (findings 1-6), the steward (7-8) and the UX reviewer (9-14).
14 findings: 6 accepted and fixed (one of them in part), 3 deferred, 3 for the owner, 2 rejected. The regression tests
are named `presence-and-kinds audit N`, in `__tests__/walk-planner/presence.test.ts`, `__tests__/explore/presence.test.ts`
and `__tests__/navigation/scenicRead.test.ts`.

1. **The planner never read the places archive.** A History bar lit by the Kilns alone opened a planner that said
   "few". Accept, fixed: `PlannerDeps.read` returns `archive` beside the map's places, and the shell merges them as the
   atlas ring does (PW8); the app's read calls `placesArchive.read` (audit 1). The merge is tested; the app's wiring
   is an instance file that no test reaches.
2. **`graded: all` changed every bar's grading,** not only a leaning one: cells past the first eight graded the route.
   Accept, fixed: with no lean, a route is graded as before; with one, by the bar's first eight cells (audit 2).
3. **The lean fell back only on the cell count,** never when the places you pass make no route (too far, out of
   reach). Accept, fixed: a leaning plan that makes no route plans again with every place of the bar (audit 3).
4. **A museum that lights History is a Culture "?" on the map,** and a found one is no found pin on a History route
   (`found(kind)` reads the find's category). Defer: a find keeps only its category, and the archive's second bar is
   not stored (RP11), so this needs a data-model call. See `docs/DEFERRED.md`.
5. **"Old" in a neighbourhood's name lit History** ("Old Town Gallery", "Museum of Old and New Art"). Accept, fixed:
   `barsOf` reads past "old town", "old city", "old quarter", "old village" and "old and new" (audit 5).
6. **PK18's writer (`saveSettings`) and its second reader (the scenic read) had no test.** Accept in part: the scenic
   read now has one (audit 6, which passed at once because the code was right). `settings.ts` imports the db
   singleton, which a Node test can't load; moving it to a shell factory is SH5's work, so that part is deferred.
7. **"Old Town" lights History** (the steward's first finding). Reject: a duplicate of 5.
8. **"Buildings and structures" keeps the library icon,** though libraries moved to Community spaces. For the owner:
   icons are a taste call, made with the labels.
9. **"Community spaces" doesn't name what it holds** (libraries and arts centres). For the owner, who chose the label
   on Nov 10.
10. **The people icon reads as contacts** in an app with no accounts. For the owner, with 8.
11. **Eleven switches with no visible groups.** Defer: an opinion, and section headings would change the settings'
    layout.
12. **The drawer's handle sits over the first visible switch.** Defer: it predates the slice and belongs to the
    drawer, not the kinds.
13. **"How the marks work" didn't say one place can count toward two kinds.** Accept, fixed: one clause added to the
    second line, naming no listing (audit 13).
14. **A History route may lean away from the museum that lit History.** Reject: the owner's call ("Pass-by only, if
    enough", Nov 10, decision 0126).

The steward also raised three points the spec is silent on. Two are answered above: whether the marks' text should say
more (13), and a route skipping what lit the bar (14). The third, the settings sheet covering the capture stack during
a walk, predates this slice and is for the owner.
