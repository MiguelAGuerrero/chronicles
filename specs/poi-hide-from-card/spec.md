<!-- Repo first: from the owner's proposal G12 (docs/STATUS.md, "Next evolutions"; filed 2026-11-21 from the owner's
     /investigate), answered yes in person 2026-11-21 ("Yes, queue it"), built under `/tend inbox G12 yes` (decision
     0254). Not a tab of the concept doc. -->

# Hide a kind of place from its card, and clock towers apart from water towers (HK)

Nov 25, 2026 · the owner

The owner's words (/investigate, Nov 21): "There should be a way to quickly toggle off on points of interest based on a
card so something like hide hide hide from you or show less like this or she do not show this for example that applies
over the category that way there's quick and easy access to the settings, conveniently from the map".

The brief is `docs/research/poi-hide-from-card.md` (its causes, `file:line` references and the owner's calls); this
slice builds G12's nine criteria and no more.

## Vision

```
Idea: Quickly hide points of interest from a place's card, by its category, with quick access to the settings from the map.
Verb: earn (the walker notices more of what they came for when what they never stop for leaves the map)
Touches: Always, "Restraint in motion, colour and copy"; Never, "Ratings, reviews, stars, 'best of', rankings of places" (a "show less" weighting would rank; left out), "Tallies such as '12 of 87'" (the sheet names the kind, never how many places it holds), "A capture behind a menu, a drawer or an extra tap" (the capture row stays first, untouched); decisions 0115 ("kinds filter what you see, never what exists"), 0191 (subtypes, amended), 0192 (What I'm into's page, amended: a second way in), 0230 (no list of what is left).
Verdict: aligned
Shape: as asked, without "show less" (nothing is ranked) and without "not this one" for now (the owner's call); the owner's redraw: the kind as a title row and its subtype as a subtitle row, each a switch.
Precedent: Google Discover's card More ("Not interested in [Topic]", "Don't show content from [Source]"), verified; YouTube's More ("Not interested", "Don't recommend channel"), verified; OsmAnd's POI overlay in Configure map, unverified.
Criteria: the sheet names a kind in words and never a count; hiding a kind hides only unfound places, a find stays; the switch hidden from a card is the same switch What I'm into shows, and turning it back on there brings the places back; nothing on the card is coloured or celebrates; a "?" card's menu never names the place; the capture row stays first and one tap. (HK1-HK10 below carry them.)
Open: none (the look approved as redrawn, Nov 21)
```

## Decisions (the owner, Nov 21; decision 0254)

- **Hide switches off the card's own kind**, the most specific the card names (a plaque's card hides Plaques), the same
  switch What I'm into shows; nothing new is stored. A place of a subtype also offers its whole parent kind ("There has
  to be a way to toggle the sub category too … I should be able to distinctly hide clocks, but keep the rest of
  historical monuments").
- **Kind only for now**: no "Not this one" for a single place and no "Show less like this".
- **A "?" card offers its kind**, never the place.
- **Clock towers and water towers become two subtypes**, each its own switch, in this slice (amends 0191's plan row,
  `specs/explore-subtypes/plan.md:33`); a reader who had the shared switch off keeps both off.
- **A second way into the switches**: a card's sheet reaches What I'm into beside the drawer's row (0192 kept the page
  and its one gate, `openInto`; this adds a caller, not a route).
- **The look, approved as redrawn**: More opens "Show on the map": the kind as a title row and its subtype as a subtitle
  row, each a switch acting at once (the switches are their own undo, so no Undo slab).

The owner's answers to the steward's three questions (in person, 2026-11-25; the owner's own, not a proxy's; none amends
0254, which already puts a "?" card's kind in its sheet):

- **A "?" card's head stays as today** ("Only in More sheet (Recommended)"): "A place to find", at any distance and on a
  ride; its kind and subtype appear only in its More sheet (HK4).
- **Water towers' row draws the plain dot** ("Plain dot (Recommended)"): `ellipse-outline`, the table's own fallback, on
  What I'm into; the sheet's rows draw no icon.
- **A found card's head is today's** ("Keep today's found head (Recommended)"): "Hessian Memorial · War memorials", no
  More and no kind line (HK5).

## Mock-up

Drawing: https://claude.ai/artifact/B2rLDb6EvciUx6LaUFJVHC#artboard-MenuSwitches (docs/mockups/poi-hide-from-card/MenuSwitches.dc.html)
Approved: with G12, "Approve as redrawn" (the owner, 2026-11-21)

The boards before MenuSwitches on the canvas are the shapes it replaced (the menu with Hide, the Undo slab, the one-tap
line). Words since the drawing: the categories' names became one table on Nov 24 (`tend explore T49`, decisions 0239,
0264: "Green", "Views & oddities"); the sheet's title and subtitle rows read the kinds' and subtypes' own names (`KINDS`,
`SUBTYPES`), which T49 did not change, and no category's name appears in the card or the sheet. The drawing's words
("Monuments and memorials", "Plaques", "Show on the map", "Done", "What I’m into ›") are all current; the criteria quote no
older word.

## How adjacent apps do it

The job: from one item in a stream, stop being shown its kind of thing.

- **Google Discover** (Android, the Google app): a card's More, at its bottom right, offers "Not interested in [Topic]"
  or "Don't show content from [Source]": two levels from one item; undone under Settings, Interests, Not interested,
  Unhide. Source: https://support.google.com/websearch/answer/2819496?hl=en , read Nov 21, 2026. **Verified**.
- **YouTube**: a video's More (the three dots beside its title) offers "Not interested" and "Don't recommend channel";
  the feedback is cleared in My Activity. Source: https://support.google.com/youtube/answer/6342839?hl=en , read Nov 21,
  2026. **Verified**.
- **OsmAnd** (iOS, Android): POI categories are chosen in Configure map, POI overlay, not from a POI's own menu; a quick
  action "Show/hide POI" can sit on the map screen. Source: from memory and forum threads, unverified. **Unverified**.

All three in `docs/research/adjacent-apps.md`, "Hide a kind of thing from one item". Where this departs: Discover and
YouTube say "Not interested" and keep the choice in a list elsewhere; here the item's More shows the very switches What
I'm into holds, on and off in place, so the way back is the same control (the owner's redraw). Nothing is weighted: no
"show less" (VISION, Never: rankings of places).

## Every surface (decision 0167)

A place's card (`testID="mark-card"`) is drawn in one place, `src/app/walk.tsx`, on the walk screen, walking and ready
(Navigate's ready screen is the same screen with no walk open). Its states: a named unfound place, a "?" (an unfound
place not yet within 60 m), a found place, and a "?" on a ride (no capture row, R12). Explore's tab has no place card
(its "?" are not tappable: a tap zooms, `tapDoes`, `atlas/waitingPins.ts`); the outing's and the planner's stops are their
own cards of shops and sights, not a find's, and stay as they are.

## Criteria

G12's nine, in its words, numbered with the slice's prefix; HK10 is the states they imply (slice step 2).

1. **HK1** (the owner's task: "toggle off points of interest based on a card … that applies over the category") An
   unfound place's card on the walk has More (…) at its top right, in ink, 44 pt, spoken "More"; under the name a muted
   line names its kind and, when it has one, its subtype ("Monuments and memorials · Plaques"). A "?" card has More too,
   and its head reads "A place to find" alone, as today (the owner, Q1; poi-hide-from-card audit 1). **Finding:** someone told only "stop being shown plaques" finds More on the plaque's card they
   just opened, by the three dots people know as More, and the sheet it opens by the word "Plaques".
2. **HK2** More opens a sheet, "Show on the map" with Done: the kind as a title row with its switch, its subtype (when it
   has one) as an indented subtitle row with its switch, then "What I’m into ›". A kind with no subtype shows its title
   row alone.
3. **HK3** Each switch is the one What I'm into shows (`withKind`, `saveSettings`) and acts at once, the sheet staying
   up: the subtype off hides only that subtype, the kind off hides the kind and its subtypes; the map behind follows at
   once, and turning a switch back on, in the sheet or in What I'm into, brings the places back. A found place of the
   kind stays drawn (0115: kinds filter what you see, never what exists; poi-hide-from-card audit 3). With the kind off,
   its subtype's row stays in place, off and dimmed, spoken "Part of …", and a tap on it does nothing (audit 6).
4. **HK4** A "?" card's sheet names its kind and subtype, never the place.
5. **HK5** A found place's card has no More and no kind line: its head is today's ("Hessian Memorial · War memorials",
   the owner, Q3).
6. **HK6** "What I’m into ›" opens the page from the walk (Back reads "Walk" while a walk is open, as from the drawer's
   row) at that kind's row: the title row's kind under its pinned heading.
7. **HK7** Done, a tap on the dimmed map, Back and Escape close the sheet (only while the walk is focused).
8. **HK8** No count or numeral in the sheet or the card's kind line, and no accent colour in either; the card's distance
   line as today; the capture row unchanged and first (poi-hide-from-card audit 4). The sheet's rows draw no icon; the
   Water towers row on What I'm into draws the plain dot (the owner, Q2; audit 5).
9. **HK9** "Water and clock towers" becomes "Clock towers" and "Water towers", each a switch, both on by default; a reader
   with the shared switch off keeps both off.
10. **HK10** (the states the criteria imply) The sheet draws its switches only once the reader's choices are read, and
    if they cannot be it says What I'm into's own sentence (`INTO_UNREAD`, one constant; audit 7), with no switch that
    would save defaults over them (WI9). Closed with its place's kind now off, the sheet leaves no card for a place no
    longer on the map. A tower kept before the split (a checklist item read under the old table, a find) reads as its
    parent, Buildings and structures, and is hidden when its parent is off or both new switches are, until its area is
    read again; a find of one still reads "Water and clock towers" (audit 2: its place's class is in no store, see
    "Steward").

## Tests

Unit, in `src/lib/__tests__/explore/` (feature `explore`): `hideFromCard.test.ts` for the card's words and the sheet's
rows (HK1, HK2, HK4, HK5, HK8 words), the switches (HK3), the page's row to open at (HK6), the split and its reader
(HK9) and the old towers (HK10); the presence golden tables for the split (p12). Journey: `hidekind` (new), the walk at
390 x 844 and 320 with Places on: a plaque's card, its sheet, Plaques off with the war memorial staying, the kind off and
back on, a clock tower's sheet with the water tower's pin staying, a "?" card's sheet, a found place's card with no More,
What I'm into opened from the sheet with Back "Walk" at Monuments and memorials, Done, the dimmed map, Escape.

## Steward (the plan, Nov 25)

Aligned, no breach. Triaged by the run's coordinator, the owner answering the three questions in person (Decisions):
accepted 8, deferred 0, rejected 0.

- S1 (medium): the "?" card's kind line said more than E7 lets a "?" say; the owner: only in the sheet (Q1). HK1;
  poi-hide-from-card audit 1.
- S2 (medium): a tower read before the split. The steward asked that a `towers` item take its kind from its place's
  class in the places cache. It cannot: the cache stores no classes (`db/index.web.ts` l.855 leaves them out of the
  stored object; `sqliteStore.ts`'s `place` table has no column for them), so the class is reachable only by a migration
  or a checklist rebuild, neither in this slice. Kept: the retired reading (HK10; audit 2). It heals with the area's next
  read: at the next tile build (E4), or once the places in its archive block change (`archiveStale`, PP13); towers come
  only from the places archive. Rebuilding a checklist that holds `towers` on entry (amends E4) is filed for the owner.
- S3 (medium): the gate's "a find stays" and "turning it back on there brings the places back" had no test. HK3;
  audit 3.
- S4 (low): "no number" against the card's "43 m away". HK8; audit 4.
- S5 (low): Water towers' glyph; the owner, the plain dot (Q2). HK8; audit 5.
- S6 (low): the found card's head; the owner, today's (Q3). HK5; no change.
- Plan call 2 (the subtype row with its kind off): kept, off and dimmed. HK3; audit 6. Plan call 6 (a failed read):
  What I'm into's sentence from one constant. HK10; audit 7. Calls 3, 4 and 7: as written.

## Record

Built 2026-11-25 under `/tend inbox G12 yes` on `tend/inbox-20261125-2132`, from `origin/main` 98e6b9de.

- **Passed:** HK1-HK10 and poi-hide-from-card audit 1-7, each written first as a todo (the unit tests in
  `explore/hideFromCard.test.ts`, the `hidekind` journey's checks, HK5's in the `walk` journey), then made real with its
  code, each unit test's wiring reverted once and seen failing (the retired kind's hiding, its words and its subtype; the
  stored `towers`; presence's split; the "?" head; the found head; the locked row; the card that goes; the failed read;
  the gate's `at`; the scroll that waits for heights).
- **The tables moved with it:** the class tree (XS3), the kinds' order (E16 and its kin), presence's fingerprint (p12
  added beside p11), the p11 asserts and the atlas's and the archive's codes (`a16.p12`, a16.p11 rows read again).
- **Journeys:** `hidekind` (new, 17 checks, pictures at 390 and 320) and `launch` green after the last code change; `walk`
  (163 checks, HK5's among them), `marks`, `into`, `subtypes` and `small-places` green on the branch before the last
  core-only change (the retired kind a subtype again); `placeoffer` fails "PO5: with Places off a moment by two places is
  not asked about" here and on `main` 98e6b9de 3 runs of 3 (`e2e:baseline`), not this slice's.
- **Old/new differentials against main** (the run's scratchpad, for the review): every word and switch of the screens
  other than the card, the sheet and What I'm into (a find's line for every kind, "Passed …", the Found list's rows, what
  a kind is to the planner, the scenic routes and the outing, an area's bars for seven stored choices, the card's capture
  line, the places each choice hides): only What I'm into's rows differ, and the new kinds' own answers; over the live
  places-us archive (places-us-20261123.40, 173,704 places): 1,288 water towers and 21 clock towers change kind, nothing
  else of any place moves, and no stored choice hides or shows a place differently.
- **The base:** `node scripts/tend.js base --here explore walk-screen presence` reads as it did before the slice (explore
  and walk-screen rough by a change since their sweeps, this slice's among walk-screen's; presence's two mediums); left
  each area no rougher by an open item.
- **Native:** never run on a phone; two items in `docs/NATIVE_UNVERIFIED.md`, "Navigation and tabs" (the sheet over the
  walk's map, its switches and closes, the spoken names; What I'm into at the kind's row from it).
