<!-- Repo first (like presence-and-kinds, explore-atlas): not yet a tab of the owner's concept doc. Amends "Presence and kinds" (specs/presence-and-kinds/spec.md) and the kinds of "Atlas grading" (specs/atlas-grading/spec.md). -->

# Community parks

Nov 11, 2026 · the owner, after a walk to an Allentown park that held sculptures, monuments and plaques the app had not
said were there ("that was exciting"), and the many parks that are only a playground.

Every named park is one kind today, "Parks and gardens", and every one of them is a "?" to find. A park with sculptures
and plaques and a playground on a corner are offered alike. This slice splits the kind so a reader who is not in the
mood for a plain neighbourhood park can switch those off, and every other park stays. It never says what a park
holds: finding the sculptures is the experience, and the app only ever differs in the kind's name.

## Vision

Idea: Split Explore's parks so clearly plain neighbourhood parks are a subset, "Community parks", the reader can switch off in "What I'm into"; every other park stays (the notable ones, by definition, with no "notable" label or kind); default is park and a demotion needs evidence; the app never says what a park contains; park outlines from the tiles judge size and what lies inside (the owner, Nov 11).
Verb: earn (what makes a place itself, structurally: a park with something in it is not offered like a playground, and the reader chooses which to be offered)
Touches: Never, "Ratings, reviews, stars, 'best of', rankings of places" (nearest fit: "open-data signals"); Always, "Guidance is structural: where there is a lot, and what makes a place itself, never whether it is good"; Never, "Tallies … No counts on Explore"; 0044 (a mark is for an attraction); 0066 and 0084 (Green counts park places until the decoder reads park outlines); 0095, SR4 and SR15 (an unfound place is never named; green is the tiles' `landcover`); 0117 (no data fetched only to sort a place; a kind from what is already read); 0127 and PK5 (a place may light two bars; no two bars redundant; "Community spaces" is Culture's kind).
Verdict: aligned if reshaped
Shape: A park is a community park only on evidence: a name that says playground, playfield or the like, and nothing notable inside or near it (an archive place, a monument, art, history or viewpoint place, a notable word in the name, a large outline). Everything unsure stays a park. The kind keeps the parks category, so the Green bar, the colours and the planner's bar are unchanged. Nothing says why a park is one kind or the other. The reader can switch the kind off; the other parks stay. Colouring green spaces on the map is a later slice with its own gate.
Criteria: PC1 (evidence, never a guess), PC2 (a notable signal keeps a park), PC3 (unknown stays a park), PC7 (no description, no judgement words, no count), PC8 (the switch hides only the subset), PC10 (Green and the colours unchanged), PC12 (no fetch to sort).
Open: none (the owner took the defaults, Nov 11: name only, size never demotes; the Allentown park's name from the owner's recollection, "Franklin Memorial Park").

## Decisions

- **Nov 11:** "a heuristic for determining what parks are considered community parks … rather than a park like Liberty
  State Park or a park that has historical artifacts or notable trails". The two are told apart by the data the tiles
  and the archive already hold; a park outline is read for it.
- **Nov 11:** "I'd rather have false positives for historicity than false negatives": the default is park, and a
  demotion needs evidence. The plaques and sculptures of the Allentown park were a discovery the app did not spoil, and
  it must stay that way (PC7).
- **Nov 11:** community parks are not excluded from points of interest, only separable: "if I'm not in the mood to visit
  these mundane parks, I don't have to". They are marks and finds like any park, and stay in the Green bar.
- **Nov 11:** "of all the parks available I want to toggle off community parks … you still have access to all the rest
  of the parks, which includes all the notable parks by definition … without that being an explicit label": no
  "notable" kind or label; a community park is a subset of Parks the switch hides. "Parks only now": other categories
  get no subsets in this slice (the owner chose the narrow scope; the model grows to them later). A place keeps one kind.
- **Nov 11 (the defaults, "proceed reasonably"):** a demotion rests on the name alone, size never demotes (the steward's
  findings 1 and 2: the tiles cannot see plaques and sculptures, and a park cut by tile edges looks small); the kind is
  "Community parks" with `people-outline`; an unfound place is never named for its kind (PC16); a checklist built before
  keeps `parks` until its area is read again. The Allentown park is "like Franklin Memorial Park" (the owner).
- **Nov 11:** park outlines are read, because the owner means to colour green spaces on the map later without more data.
  This slice reads them only to judge a park, from the `landcover` layer already decoded (SR15); the colouring is its own
  slice.

## Acceptance criteria

The kind:

1. **PC1 A demotion needs a name that says so.** A named park point is a community park only when its name holds a word of
   the community list (playground, playfield, tot lot, ball field, courts, matched as whole words, data in
   `communityWords.json`) and nothing notable (PC2) is inside or near it. Any other park keeps the kind `parks`. Size alone
   never demotes (the owner's default, Nov 11: false positives for notable, and the tiles cannot see most of what makes
   a park worth the walk).
2. **PC2 A notable signal keeps a park.** A park stays `parks` when any of these holds: a place of History, Art,
   Viewpoints or a museum or theatre of Culture inside its outline (within 60 m of its point when it has none); a place
   of the places archive within 150 m; a word from `notable.json` or `parkNotable.json` ("State Park", "Memorial",
   "Arboretum", "Botanical", "Preserve", "Reservation", "Historic", "Heritage", "Battlefield") in its name; an outline of
   5 ha or more.
3. **PC3 Unknown stays a park.** A park with no outline found is judged by its name and the places near its point alone;
   a read that could not settle (an incomplete read) judges nothing and changes no kind.
4. **PC4 One kind a place.** A place has one kind, `parks` or `community_parks`, never both; both are of the parks
   category, so `category`, `markable` and its being a mark or a find are the same for each.
5. **PC5 Whole-park judgement.** A park drawn as several rings (a MultiPolygon) is judged by its total area and by a
   signal inside any ring (a signal anywhere in the park keeps it); two park points inside one outline are judged alike.

What the reader sees:

6. **PC6 The kind and its switch.** "Community parks" is a kind of "What I'm into", after "Parks and gardens", with an icon
   no other kind uses (not `reader-outline`, Community spaces', nor `leaf-outline`, Parks'). It is on by default, and a
   choice saved before it existed leaves it on (`parseHidden`).
7. **PC7 Never described.** Nothing in the app says what a park holds, why it is one kind or the other, or that it is
   plain: no copy with "mundane", "boring", "ordinary", "plain" or "notable" for a park, no count of either kind, no
   word on a "?" or a card but the kind's label.
8. **PC8 The switch hides only the subset.** With Community parks off, a community park is not a "?" on a walk or along a
   route's marks, not a waiting dot or "?" on the Explore tab and not in the pocket alert; every place of `parks` shows as
   before. A park already found stays found and named whatever the switch says.
9. **PC9 Both stay a find.** With the switch on, a community park is found by a capture within 60 m like any park, and its
   find shows in the replay and the place's sheet by name, as a park's does.
10. **PC10 Green and the colours are unchanged.** A community park lights the Green bar and counts as a park place for the
    atlas's presence exactly as a park did (`presenceSample.json`, PK5 hold); the pin, dot and bar use Parks' colour; no
    new accent colour appears.

How it is derived:

11. **PC11 Judged in core, from what was read.** The judgement is a pure function of the park point, the decoded `landcover`
    outlines, the places of the same read and the archive's places near it; it reads no clock, store or network. A read
    that carried no `landcover` (a map view's) is PC3's unknown.
12. **PC12 Nothing is fetched to sort.** No request is added; the outlines are the `landcover` of the tiles each read
    already decodes (0117, SR15).
13. **PC13 The cache is recomputed.** The kind is set on a fresh read, never patched onto a cached row; `ATLAS_CODE`
    moves so every area is read again; a checklist built before keeps its kind `parks` until its area is read again
    (a park is shown, never hidden, in the meantime).
14. **PC14 The cases.** "Elm Street Playground" in a ring of under a hectare, with nothing near, is a community park; a 0.4 ha
    "Cedar Park" ring with nothing inside is a park (size never demotes); a 0.4 ha "Cedar Playground" ring holding one
    monument, or an unnamed artwork, is a park; a 12 ha "Riverside Playground" is a park; "Liberty State Park" with no
    outline is a park; "Franklin Memorial Park" (the owner's recollection of the Allentown park, Nov 11; its name to be
    confirmed against the tiles) is a park by its name word whatever its size; one recorded from the real tiles when they
    can be reached.

From the steward's review (Nov 11, triaged in the plan):

15. **PC15 The planner and scenic routes count both kinds as parks.** The walk planner's Parks bar counts a community park as it
    counts a park, and a route still passes it (`PASS_BY`); neither reads "What I'm into" today, and this slice leaves
    that as it is (a change of its own, noted in `docs/DEFERRED.md`).
16. **PC16 A park is never named for its kind before it is found.** The area card's "Waiting to be found", a "?", the pocket
    alert and a route's words say "Parks and gardens" for both kinds; "Community parks" is named only in "What I'm into"
    and on a found place (the owner's default, Nov 11).
17. **PC17 Size never demotes.** A park whose name holds no community word is `parks` whatever its outline's area, and an
    outline cut by a tile edge or adjoining another park outline never changes a kind. (Steward findings 1 and 2.)

## Not in this slice

- Colouring green spaces on the map (its own slice and its own gate); park area in the Green bar (it still counts places).
- Subsets under other categories, and a parent switch over a group of kinds (the owner: parks only now).
- Trails (named paths inside a park) as a signal.
- A card or sheet line about a park's size or contents.
