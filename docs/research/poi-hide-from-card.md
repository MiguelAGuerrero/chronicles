# Hide a kind of place from its card: investigation (2026-11-21)

From: the owner's /investigate, 2026-11-21: "There should be a way to quickly toggle off on points of interest based on a
card so something like hide hide hide from you or show less like this or she do not show this for example that applies
over the category that way there's quick and easy access to the settings, conveniently from the map". Queued as G12.
Status: queued.

## What the owner saw

No picture came with the ask; these are today's screens on the web build (the `walk` journey, 390 x 844 and 320 x 700,
`02a-place-card`, `05b-far-place-card`, kept as `docs/mockups/poi-hide-from-card/before-*.png`).

| Mark | What it is | Drawn by |
|---|---|---|
| The "?" and the named pin on the walk's map | An unfound place within the range, of a kind switched on; named within 60 m | `visibleMarks` (`src/lib/explore/explore.ts:385`), `MarkPinView` |
| The card, "Hessian Memorial · Monuments and memorials" | A place's card: the name, then the kind's label after a middle dot | `src/app/walk.tsx:1996-1999` (`kindOf(openMark.kind).label`) |
| "A place to find" | A "?" card: the place is not named until within 60 m | `src/app/walk.tsx:1998` |
| "43 m away. Camera, Voice or Note keeps the moment with …" | The distance and the card's line | `cardCapture` (`src/lib/explore/placeCard.ts:30`) |
| Camera, Voice, Note | The capture row, first, at any distance | `PlaceCaptureRow` (`src/app/walk.tsx:2037`) |
| Route here, × | The secondary button and Close | `src/app/walk.tsx:2039-2053` |
| (not on the card) What I'm into | The kind switches, about sixty under five headings, on a page of their own | `src/components/IntoPage.tsx`, reached only from the drawer's row (`IntoRow`, `src/app/walk.tsx:1944`) |

On Explore's tab there is no place-level card: its "?" pins are not tappable (a tap on a dot zooms, `tapDoes`,
`src/lib/atlas/waitingPins.ts:163`), and the area card speaks of kinds only. The walk's card is the one card a place has
on the map.

## Why it reads wrong

1. **The switch that would quiet a kind is three steps and a long scroll from the place that prompts it.** The card
   (`src/app/walk.tsx:1993-2057`) has no way to the kind it names; What I'm into is reached only from the walk's drawer
   (raise it, scroll to "Explore", the row, then about sixty rows under five headings, `intoSections`). Decision 0192 made
   the page its own on purpose (one way in, `openInto`), and nothing since gave a card a way to it.
2. **A subtype is a switch, but the card does not say which.** A place's `kind` is its most specific kind (a plaque's is
   `plaques`, through `SUBTYPE_REFINEMENTS`, `src/lib/discovery/subtypes.ts:111`), and `isKindHidden` already hides a
   subtype alone or with its parent (`src/lib/discovery/refinements`). The card prints that label, so the data supports
   hiding exactly what the card shows; only the control is missing.
3. **Some subtypes bundle two things a person would hide apart.** "Water and clock towers" is one switch
   (`src/lib/discovery/subtypes.ts:55`) over two presence classes that are already separate (`water_tower` and
   `clock_tower`, `src/lib/presence/presence.ts:105-106`), chosen in the explore-subtypes plan
   (`specs/explore-subtypes/plan.md:33`, decision 0191). The owner's example, "hide clocks, but keep the rest", cannot
   be done today.
4. **"Show less like this" has nothing to act on.** What shows is the nearest eight unfound places of the kinds switched
   on, within the range (`visibleMarks`); nothing is ranked or weighted (VISION.md, Never: "rankings of places"). A
   "fewer" state per kind would be a new model of the settings and of the page, not a control.

Chosen on purpose, the owner's to revisit: What I'm into's one way in (0192, Q2: a push from the drawer's row); a find
shows whatever its kind (explore-marks, "The Explore tab honours What I'm into"); a "?" is not named until 60 m (E7).
Never seen on a phone: the card, the switch sheet over the walk map.

## How adjacent apps do it

- **Google Discover** (Android, the Google app): a card's More, at its bottom right, offers "Not interested in [Topic]" or
  "Don't show content from [Source]"; undone under Settings, Interests, Not interested, Unhide. Source:
  https://support.google.com/websearch/answer/2819496?hl=en , read Nov 21, 2026. **Verified**. Recorded in
  `docs/research/adjacent-apps.md`, "Hide a kind of thing from one item".
- **YouTube**: a video's More (the three dots beside its title) offers "Not interested" and "Don't recommend channel";
  the feedback is cleared in My Activity. Source: https://support.google.com/youtube/answer/6342839?hl=en , read Nov 21,
  2026. **Verified**.
- **OsmAnd** (iOS, Android): POI categories are chosen in Configure map, POI overlay, not from a POI's own menu; a
  quick action "Show/hide POI" can be put on the map screen. Source: OsmAnd forum threads in search results; its docs
  page (osmand.net) could not be reached from the session. From memory, unverified. **Unverified**.

Two levels from one item is Discover's shape (a topic, or the whole source); our two levels are a subtype and its kind.
Both verified precedents put the control in the item's More, not on its face.

## Options

| # | Shape | Causes | Vision risk | Cost |
|---|---|---|---|---|
| A | More (…) at the card's top right opens the app's bottom-sheet menu: Hide the card's kind (and, for a subtype, Hide all of its parent kind), What I'm into; the kind moves to a muted line under the name; Undo until dismissed | 1, 2 | low: a filter of what you see (0115), no count | ~9 source files, no native module |
| B | The same Hide as a plain line at the card's foot, one tap, no menu | 1, 2 | low; a taller card over the map | ~6 files |
| C | A or B plus "Not this one": hide one place for good | 1, 2 | low (0115); a new kept list, a place to bring them back, keys that move with a map build | +4 files, a new kept meta key or store |
| D | A per-kind "Show less" (only notable or archived ones of a kind) | 4 | medium: a weighting of places by a signal; a three-way switch on sixty rows | L: settings model, page, every reader |
| E | Split "Water and clock towers" into two subtypes | 3 | none | 3-4 files, a code bump |
| — | Leave it | — | — | Every kind the walker tires of costs the drawer, a row and a scroll of sixty; mid-walk, most will not bother and will see what they do not want |

## The owner's calls

Asked in this run, Nov 21 (AskUserQuestion; the answers verbatim where the owner wrote words):

1. **The look** (the mock-up, https://claude.ai/artifact/B2rLDb6EvciUx6LaUFJVHC, `docs/mockups/poi-hide-from-card/`).
   Offered: approve shape A as drawn (recommended), B a one-tap line, redraw. Answer: "There has to be a way to toggle
   the sub category too. It's not just let's say historical monuments. Let's say I got tired of just getting notified of
   plaques. I should be able to distinctly hide clocks, but keep the rest of historical monuments." Redrawn (board
   "Reshaped"): a subtype's card offers "Hide plaques" and "Hide all monuments and memorials". Asked again: the owner
   chose "Redraw" and declined the follow-up asking what to change, then said: "mark up a different way, like a title
   subtitle of the point of interest where the subtitle is a kind, and the title is the cat[egory]". Redrawn (board
   "Redrawn", `MenuSwitches.dc.html`): More opens "Show on the map", the kind as a title row and its subtype as a
   subtitle row, each a switch acting at once, no Undo slab. Answer: "Approve as redrawn" (recommended).
2. **What Hide switches off.** Offered: the card's own kind (recommended), always the parent kind, the whole heading.
   Answer: the card's own kind. With answer 1, a subtype's card also offers its parent kind.
3. **"Show less like this" and "Not this one".** Offered: kind only for now (recommended), add Not this one, add Not this
   one and Show less. Answer: kind only for now.
4. **A "?" card.** Offered: Hide naming the kind (recommended), no Hide on a "?", Hide without naming. Answer: Hide
   naming the kind, never the place.
5. **Clock towers.** Offered: split them in this slice (recommended), leave them together, split later. Answer: split
   them, in this slice.

Written: decision 0254 (amends 0191's plan row for towers; 0192's one way in is joined by a second way from a card).

## The recommendation

Shape A as reshaped and redrawn by the owner (switches, title and subtitle), with E. **Size M**: nine criteria over about nine source files, no native module.

```
## Vision
Idea: Quickly hide points of interest from a place's card, by its category, with quick access to the settings from the map.
Verb: earn (the walker notices more of what they came for when what they never stop for leaves the map)
Touches: Always, "Restraint in motion, colour and copy"; Never, "Ratings, reviews, stars, 'best of', rankings of places" (a "show less" weighting would rank; left out), "Tallies such as '12 of 87'" (the sheet names the kind, never how many places it holds), "A capture behind a menu, a drawer or an extra tap" (the capture row stays first, untouched); decisions 0115 ("kinds filter what you see, never what exists"), 0192 (What I'm into's page, one way in), 0191 (subtypes), 0230 (no list of what is left).
Verdict: aligned
Shape: as asked, without "show less" (nothing is ranked) and without "not this one" for now (the owner's call).
Precedent: Google Discover's card More ("Not interested in [Topic]", "Don't show content from [Source]"), verified; YouTube's More ("Not interested", "Don't recommend channel"), verified; OsmAnd's POI overlay in Configure map, unverified.
Criteria: the sheet names a kind in words and never a count; hiding a kind hides only unfound places, a find stays; the switch hidden from a card is the same switch What I'm into shows, and turning it back on there brings the places back; nothing on the card is coloured or celebrates; a "?" card's menu never names the place; the capture row stays first and one tap.
Open: none (the look is asked separately).
```

The slice (as approved, Nov 21):

1. An unfound place's card on the walk has More (…) at its top right, in ink, 44 pt, spoken "More"; under the name a
   muted line names its kind and, when it has one, its subtype ("Monuments and memorials · Plaques").
2. More opens a sheet, "Show on the map" with Done: the kind as a title row with its switch, its subtype (when it has
   one) as an indented subtitle row with its switch, then "What I’m into ›".
3. Each switch is the one What I'm into shows (`withKind`, `saveSettings`) and acts at once, the sheet staying up: the
   subtype off hides only that subtype, the kind off hides the kind and its subtypes; the map behind follows at once.
4. A "?" card's sheet names its kind and subtype, never the place.
5. A found place's card has no More.
6. "What I’m into ›" opens the page from the walk (Back reads "Walk") at that kind's row.
7. Done, a tap on the dimmed map, Back and Escape close the sheet (only while the walk is focused).
8. No count, number or accent colour in the sheet or the card; the capture row unchanged and first.
9. "Water and clock towers" becomes "Clock towers" and "Water towers", each a switch, both on by default; a reader who
   had "Water and clock towers" off keeps both off.

## Done when

On the walk at 390 x 844 with Places on, a plaque's card opens its sheet in one tap, Plaques off takes the plaques off
the map while the war memorial beside them stays, and a clock tower's sheet turns off clock towers and leaves the water
tower's pin.

## What the slice will touch

- Views: `src/app/walk.tsx` (the card's head, More, the slab), a new `src/components/walk/PlaceKinds.tsx` (the sheet,
  `components/Modal` and `SwitchRow`), `src/components/IntoPage.tsx` and `src/app/into.tsx` (open at a row).
- Core: `src/lib/explore/placeCard.ts` (the menu's items and words, `hideChoices(kind)`), `src/lib/explore/explore.ts`
  (`parseHidden`: `towers` off carries to both new kinds), `src/lib/discovery/subtypes.ts`, `src/lib/discovery/types.ts`,
  `src/lib/presence/presence.ts` (the two subsets; `PRESENCE_CODE` p12), `src/lib/intoNav.ts` (a row to open at).
- Tests: `src/lib/__tests__/explore/` (placeCard, explore, subtypes, intoPage); the golden tables if the split moves a
  class (`presence` readers).
- Journeys: `walk` (the card, the sheet, each switch, at 390 and 320), `marks`, `into`, `subtypes`; pictures of every
  state for the review.
- Run first: `npm run check:affected`; `E2E_ONLY=walk`, `marks`, `into`, `subtypes`.
- Native: none new; the Modal over the walk map and the slab are new on a phone (`docs/NATIVE_UNVERIFIED.md`).

## Open for the owner

None: the look was approved as redrawn (Nov 21); a found card has no More, as the approved drawing shows.

## Engineering unknowns

- Checklist items snapshot `kind` at a fresh read; items read before the split carry `towers` until the build's re-read.
  `PRESENCE_CODE`'s bump and `isKindHidden` over an unknown kind must keep them hidden or shown as the old switch said.
- Opening What I'm into at a row: `intoScrollTo` exists only in the harness; the page needs a parameter and a scroll after
  its rows' heights are known (pinned headings, WI5).
- The Modal sheet over the walk's map while a card is up: one modal at a time (S2); the card closes as the sheet opens,
  or the sheet holds the card's place. Never run on a phone.
