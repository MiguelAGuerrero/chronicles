# 0172. The owner's answers to the deferred list

Date: 2026-11-14 · Status: accepted · Area: explore, walk-screen, recording, moments, map, places, tabs, notifications, complexes, navigation, replay, web · Amends: 0052, 0154, 0164, 0165 (their words, as below); extends 0153; 0147 point 2 once O31's slice ships · From: `/tend triage`, the `[owner]` items of `docs/DEFERRED.md`

## Context
`docs/DEFERRED.md` held 35 items tagged `[owner]`: questions the loop may not answer (`/tend`, section 1). They were
put to the owner in nine batches as O1-O34 (read from `main` at `64c1511f`, Nov 14), with O35, "The walk screen's
error mid-walk", filed by `tend replay T20`'s review the same day. The owner answered every one in person on Nov 14,
and discussed decision 0127 before answering O4, O5, O29 and the `[arch]` item on the neighbourhood read-past. These
are the owner's own answers, not a proxy's (0157).

Each item is named below by its **Match**: text that occurs in exactly one item of `docs/DEFERRED.md`, so a run finds
it whatever its line (`npm run records -- deferred item … "<match>"`).

## Decision

### The rules the answers set
- **The accent at rest.** The accent is kept for a card's single primary action, app-wide; everything at rest is ink.
  This extends 0153 (the replay's cards) to every screen. On Explore the selected area card's border and its footer
  link ("See its neighborhoods" and its chevron) go to ink (O3). STATUS.md "Open before the loop", the vision review of
  Nov 10, item 4 "The accent at launch" ("A year ago today", "Relive it", the Thread labels, MomentCard's play button)
  is answered by the same rule, in later runs: a label is ink; only a card's single primary action may keep the accent.
- **Neighbourhood names never contribute to presence.** In the owner's words: "If neighborhoods can contribute to
  presence, then we'd have to wrangle neighborhoods to contribute to the other categories, which does not make sense."
  So 0127's read-past stays (a museum is not made historic by a neighbourhood word; O5 stays as it is), and the
  `[arch]` item on the raw-name read-past is answered: the read-past applies after `normalizeWords`, consistently, in
  `presence/notable.ts` and `discovery/parkKind.ts` alike, with a `PRESENCE_CODE` bump so every area is derived again.
- **"Many memories here" from thirteen** (O11): a reminder of several says its count in words up to twelve and "Many
  memories here" from thirteen, so the card's one line holds at 320 px. It amends 0164's words, which said "many" only
  past fifty-nine.
- **Note types are being reworked by the owner.** O33, O34 and every note-type `[loop]` item wait; no run touches note
  types until the owner says so.

### BUILD: answered, the loop's to ship
| Item | Match | The owner's answer |
|---|---|---|
| O2 | `The far town's card (Walk now / When I get there) shows two close buttons` | "Not now" in words: the question's ✕ becomes a quiet text button reading "Not now", and its name line goes (the card's header names the place). |
| O3 | `Explore's area card carries the accent on its border` | Ink at rest, app-wide: the selected card's border and footer link in ink; the accent only for a card's single primary action (the rule above). |
| O6, O20 | `With no fix, Explore shows Locate at the map's edge`; `Explore's empty card still offers Find me under the refusal's notice` | One way to find you: hide the edge Locate while the card offers Find me; after a refusal hide Find me until the permission changes. |
| O7, O23 | `The Explore toast's 3000 ms dwell`; `Dwell times hard-coded in the walk screen` | Yes, they are timings: each dwell gets a named token in `lib/motionTokens` beside `MOTION.tip`; nothing visible changes. The untagged `The page's slide waits a hard-coded 450 ms` (Chronicle journal) is built with them. |
| O9 | `The Remind editor's chip rows wrap with a lone chip` | Two labelled menus, "How often: Once ▾" and "Until: No end ▾"; no Undo toast. The untagged `The reminder editor's chip rows wrap` (UI conformance) is the same change. |
| O10 | `On a town's neighborhood page the title reads the parent town` | "You're in Fox Point" in ink; the heading stays the town (0126). |
| O11 | `Long reminder words are cut on the card` | "Many memories here" from thirteen (the rule above). |
| O13 | `A capture pin standing on a start or end puts its stalk inside the marker` | The stalk stops at the marker's edge; amends QL3's placement. |
| O14 | `A merged star looks like an unnamed lone star` | Two stars fanned in one disc; no numeral, one size (0154 kept). |
| O15, O18 | `The place sheet under a selected star says its walks in digits`; `One walk, described three ways` | All in words ("one walk", "three moments"); a walk's More is "More for <title>" wherever the title is known; built with T19 and T30. Amends 0052's carve-out for meta lines, as 0170 did. |
| O16 | `A pin's part of the day nests the long-ago line's own comma` | The span alone for old moments: "a photo and a note, two years ago"; past a week no month and no part of the day. Amends the words of 0164 and 0165. |
| O17 | `Typed words go without asking` | Ask before a tap outside drops a walk's changed name, as the media editor's Close does. |
| O19 | `Locate's web refusal names only the browser's settings` | "your browser's or your phone's settings". Amends 0154's words (T17), shared by the walk's Start line (0162). |
| O21 | `Locate's timeout` | "Couldn't find your position. Try again in a moment." in the quiet notice's tone, not red. |
| O22 | `does not say what happens once it is on: the walk is already open` | The walk resumes by itself when the permission comes back; no new words. Built with the `[loop]` item `A refused walk's quiet notice outlives a retry`. |
| O26 | `The green place pin carries a tick` | The moment's glyph instead of the tick (the owner chose the alternative): a tick reads as a checklist's "done". |
| O27 | `The strip mixes an icon-only Pause` | "Pause" and "Resume" under the icon, as Hold shows its word; the spoken name unchanged. |
| O35 | `The walk screen's error mid-walk` | "Your walk is still recording." as the error's body on the walk screen only. |
| `[arch]` | `The neighbourhood read-past runs on the raw name, before` | Apply the read-past after `normalizeWords`, consistently, with a `PRESENCE_CODE` bump (the rule above). |
| O31 | `Navigate, the walk screen and Walk me back naming a complex` | Name a complex on the walk screen: inside one, the street line says its name (for example "Strawberry Square"). A slice, amending 0147 point 2 (below). |

### CLOSE: answered "leave"
| Item | Match | The owner's answer |
|---|---|---|
| O1 | `The route preview's selected row shows by a 2 px border` | Leave it: the outline and the filled Go are already two cues that are not colour. |
| O4 | `When the places archive fails to load, the planner and the atlas ring` | Leave it: it mends itself on the next load and nothing kept is lost. |
| O5 | `Philadelphia's Old City Hall, a map museum` | Leave it: a neighbourhood word never makes a museum historic (the rule above; 0127's read-past stays). |
| O25 | `While a voice memo records, the note and camera buttons leave the stack` | Leave it, and say why in VISION.md (the owner edits the page; proposal below). |
| O28 | `A card's time can run a minute ahead of the rolling clock` | Leave it: the card's time is the moment's own, the clock is the rhythm's. |
| O29 | ``Pages serves `index.html` with `cache-control: max-age=600` `` | Leave it: not reproduced, and the host sets the header. |
| O32 | `the card does not say where the kind switches are` | (a) leave it; (b) leave it: the read covers only the selected area and its tiles are cached; (c) acceptable: the store is derived, recomputable and cleared by a purge. So the `[loop]` item on `COMPLEX_TILE_BUDGET` (Community parks) is a limit kept on purpose. |

### KEEP waiting
| Item | Match | The owner's answer |
|---|---|---|
| O30 | `the Pennsylvania Capitol Complex and any outline Overture does not carry` | Waits for a data pack with real outlines, behind `ComplexSource`; nothing now. |
| O33 | `a type chosen while a note is first written` | Waits: the owner is reworking note types. |
| O34 | `Neutral is a dash in a circle because Ionicons has no neutral face` | Waits: the owner is reworking note types. |

### CLOSE: stale
| Item | Match | Checked on `main` |
|---|---|---|
| O12 | `The solid end reads smaller than the hollow start` | Since `tend map T25` (`ffbd92df`, decision 0162) the end is a bullseye as wide as the start (`ENDS_RING_PAINT`, `components/map/types.ts`); the item's own last line says it no longer matches what is drawn. |
| O24 | `Map pins that group show a bare count` | Since `tend map T14` (`cbf347da`, decision 0154) a pin of several fans its kinds and never draws a numeral (`CapturePinView.tsx`). |
| O8 | `Explore's map labels collide` | Stale-likely: since 0160 the busy names are a symbol layer with collision. It stays open, noted, until a fresh picture in the next `/tend map` run confirms it; then it closes as stale. |

### The decisions these answers amend
- **0052** (counts are words): its carve-out for meta lines' digits ends for the place sheet's walks and a day's walk row
  (O15, O18), as 0170 ended it for the walks row's captures.
- **0154**: the refusal's words (T17) become "your browser's or your phone's settings" (O19).
- **0164** and **0165**: a pin of moments past a week says the span alone, no month and no part of the day (O16); "Many
  memories here" from thirteen, not past fifty-nine (O11).
- **0153** is extended app-wide: the accent at rest.
- **0147** point 2 ("Explore and the arrival line only") is amended by O31 when its slice ships, not before.

### How the BUILD items are built
Each answered item is the loop's to ship in a `/tend <area>` run of its area, one commit each (O6 with O20, O7 with
O23 and O15 with O18 were asked as one question each, and each pair is one item here), its `Source:` citing this
decision and the item, its test named the run's way (`tend <area> <N>`). When it ships, its item leaves
`docs/DEFERRED.md` with `--reason "the owner's answer (decision 0172), built in <commit subject>"`. The `[arch]`
read-past is built the same way, its `PRESENCE_CODE` bump being the owner's call made here. Spec wording an answer
needs (QL3 for O13; M8's example for O18; QL11 for O21; the pins' words for O16) is the owner's to amend, filed in
STATUS.md "Open before the loop", since the loop may not edit a spec.

### O31: a slice, through the gate
O31 is not one commit: it gets the vision gate and criteria and is built as one slice (`/slice --from=G<n>` once it is
filed, or the owner's own `/slice`). The gate, run for this record:

```
## Vision
Idea: Name a complex on the walk screen: inside one, the street line says its name ("Strawberry Square").
Verb: earn (what makes a place itself, where there is a lot, said where you are) and honour (the walk knows where you are).
Touches: Always "Guidance is structural: where there is a lot, and what makes a place itself, never whether it is good";
  Always "Restraint in motion, colour and copy"; Never "Popularity, trending, foot traffic, other people's activity" (a
  name from open data is presence, 0080, 0084); decision 0147 points 2 (amended by the owner here), 3 (information only:
  never a mark, a "?" or a find) and 7 (a viewing never fetches a tile); the walk screen's rule that the street chip is
  quiet and pinned to the top row (L14, the owner, Nov 5).
Verdict: aligned
Shape: as asked: the walk screen's street chip names the complex you are inside, from complexes already on the phone.
Criteria: below.
Open: none
```

The slice (size M): 1. While the walker's fix is inside the outline of a complex already in the phone's `complex`
store, the walk screen's street chip names it ("Strawberry Square"), in place of the strip's line. 2. Leaving the outline
returns the chip to what it shows now (the strip's "On <street>", or nothing). 3. The walk screen starts no read of
`buildings` tiles to name a complex: it reads only the stored rows, as a moment's arrival line does (0147 point 7,
CX12). 4. The chip stays information only: no tap, no mark, no "?", no find, no count (0147 point 3), in the chip's
own quiet style. 5. A complex of a kind switched off in the walk's settings is not named. 6. A row of an older
`COMPLEX_CODE` is not named (as `complexAt`). 7. Under the navigation bar the chip names it in the same place the strip's
line goes. 8. At 320 px and the largest text size a long name stays on one line, cut with an ellipsis, and the chevron
does not move. 9. A screen reader reads the chip's words as it reads the strip's. 10. A walk-screen journey step inside
the e2e's complex world (`complexWorld`) with a picture; the native path joins `docs/NATIVE_UNVERIFIED.md`.

It is not filed in STATUS.md "Next evolutions" yet: the balance reads "outgrowing its base" (seven areas rough), and
a run so reading files no new `G` entry (`/tend`, section 8). A later run files it as the owner's answered `G` entry
("the owner's yes, Nov 14, decision 0172; built as one slice") once the balance allows, or the owner types `/slice`.

### O25: a line for VISION.md, proposed
The owner edits the page. Proposed, nothing more: in "Always", "**Capture is one tap away** on every screen you walk
or capture from; a voice memo in progress is the one capture at a time, and every kind returns the moment it ends."

## Consequences
- The answered items stay in `docs/DEFERRED.md`, each noted with its answer, until a run builds it; the "leave" and
  stale items leave now, each with its reason; O8 stays, noted.
- The accent at rest is one rule for every screen: the loop may cite this record when a label, a border or a link at
  rest carries the accent.
- No run touches note types until the owner's rework is recorded.
- The criteria that pin the old words (QL3, QL11, M8's example, the pins' examples) are amended by the owner; the
  loop may not edit a spec.
