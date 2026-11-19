# Plan: the walk's drawer, details up and settings by section

For the owner's review before any code. Spec: `specs/walk-drawer-sections/spec.md` (WD1-WD15).

## Where to look first (one line per action)

| Action | Goal, how often, situation | Control | Matrix row | Adjacent apps | Where the owner looks first, and sees |
|---|---|---|---|---|---|
| See this walk's details | Now and then, mid-walk, one hand, a glance | Pull the strip up, or tap its numbers (both exist today) | 24 (a sheet with a grabber) | AllTrails' pulled-up sheet; Google Maps' swiped-up card | The strip: "This walk", plain lines, "Walk settings ›" last |
| Change one setting mid-walk | Rare, stopped or slow | The strip's … → a row → the section | 3 (More), then 11 (a row with a disclosure, standard Back) | AllTrails' …; iOS Settings' rows | The … beside Pause: "Walk settings", four rows with a chevron |
| Change a setting while paused | Rare | Pull up → "Walk settings ›" → a row | 11 | Google Maps' card → Settings | The strip: no … while paused (0220), so the row at This walk's foot |
| Go back from a section | After a change | "‹ Walk settings" at the section's top; Back; Escape | 23 (Back symbol, system Back) | iOS's back title | Top-left of the section |
| Toggle a setting | Rare | The same switches and sliders as today | 14 (a switch in a row, no Save) | iOS Settings | Unchanged inside each section |

**Against precedent.** AllTrails shows its numbers as large figures with pace and elevation: we show lines of text at
body size and none of those (VISION.md, Never: fitness numbers, big numbers; WD7). The matrix's row 3 makes More a
pull-down menu; the owner chose the menu inside the drawer so a section opens there with a back arrow and the map stays
above (Nov 19), so the … raises the drawer on the menu rather than a floating menu.

**Defaults that make a control quieter, for the owner to overrule:**

- **P1** (overruled by the owner, Nov 19: the lines say each section's state, WD1) the menu's rows said what is in each section in a muted line ("“?” range, passing a place, pocket alert, What
  I'm into"), not the section's current state ("On, within 400 m"). Quieter, and true for every state; iOS shows state
  there. Say if you want the state.
- **P2** This walk ends with a "Walk settings ›" row, so the sections are reachable while paused (no … then, 0220) and
  from the pull you first expected. The alternative is a … while paused too, which 0220 found does not fit at 320 px.
- **P3** the street line is the nearest named street within reach among the streets the screen has already loaded
  (`streetAt`, as a moment's own line finds it), and is absent when there is none; nothing new is read for it.
- **P4** what was kept is one clause of kinds ("Two photos and a voice memo"), and no line while nothing is kept (no
  "Nothing kept yet": the steward's S3); This walk lists no moments or thumbnails. The clause is allowed by "Counts are
  words, in a clause" (0052). A list of this walk's moments with their
  places would be a slice of its own.
- **P5** the ready screen's bar is unchanged (WD14): pulled up it shows the start settings, which are a choice made
  before Start, not a walk's settings. Moving it to the same shape would be a slice of its own.
- **P6** (dropped on the steward's S5) Location & motion says only what it says today: the motion line when motion is
  off, blocked or unavailable, and Share GPS log; with motion on, Share GPS log alone.
- **P7** (the owner chose the recommendation, Nov 19: WD17) (the steward's S1) the raised drawer covers the capture stack, as today. Today it holds rare
  settings; This walk will be read mid-walk, and while it is up there is no camera, mic or note on screen (Never, "A
  capture behind a menu, a drawer or an extra tap"). Recommended: the capture stack rides on the drawer's top edge as
  it rises (Google Maps and AllTrails float their map buttons on the sheet; from memory, unverified), so it stays one
  tap away on every view; it becomes WD17. The other way: keep it covered, as today, and record the call.

## Files

Source (5, under the fix size's 8; this is a slice):

- `src/lib/walkDrawer.ts` (new, `@layer core`): the drawer's view as a reducer (`details` | `menu` | a section;
  events: pull, more, pick, back, lowered) for WD4, WD9, WD10; `SECTIONS` (ids, names, the muted lines) for WD1;
  `walkDetailLines(input)` for WD5, WD7, WD8: the lines in words from started-at, moving time, distance, ride, paused
  time, street, destination, the captures' kinds and units; the clause through `lib/quietLines` (new
  `keptClause(kinds)` there if none fits).
- `src/components/walk/WalkDrawer.tsx` (new, `@layer view`): `WalkDetails` (the lines, ticking with the strip's clock
  as `Ticking` does, and the "Walk settings ›" row), `WalkSettingsMenu` (the four rows), `SectionHeader` ("‹ Walk
  settings", the heading).
- `src/components/walk/ReadyBar.tsx`: a `tail` prop for the numbers' spoken name (WD12; the ready screen keeps "Walk
  settings"), and `onBack?: () => boolean` so Back and Escape step from a section to the menu before lowering (WD4).
- `src/app/walk.tsx`: `options: boolean` becomes the reducer's view; the … dispatches `more`; the pull and the numbers
  `pull`; the drawer's children chosen by view, each section the same controls and test ids as today, moved; the ring
  shown only on the Explore section (WD11); `strip-more`'s `aria-expanded` from the view (WD12).
- `src/lib/quietLines.ts`: the clause, if no helper fits.
- `src/components/walk/CaptureStack.tsx`: a `lift` (an Animated value) that moves the stack with the drawer (WD17).
- `src/components/walk/layout.ts`: the walk's raised height capped so the lifted stack clears the top row (WD17).

Data: none. No truth, no cache, no migration, no IndexedDB version. Nothing stored, nothing sent.

## Tests per criterion

Feature folder `walk-screen` (`src/lib/__tests__/walk-screen/`).

| Id | Test | Where |
|---|---|---|
| WD1 | `WD1: the … raises the drawer on the menu, four rows in order, a row shows its section alone` | unit `walkDrawer.test.ts` (reducer, SECTIONS) + journey `walkdrawer` (rows, words, chevron, one section's ids only) |
| WD2 | cold find (ux-reviewer), recorded in the spec's record | `UNTESTED`: `cold find: …` as WI2 was |
| WD3 | `WD3: a section shows "‹ Walk settings", its heading and only its controls; a change saves with no Save` | journey `walkdrawer` |
| WD4 | `WD4: back steps a section to the menu; Back/Escape on the menu or details lowers; the … lowers` | unit (reducer) + journey (Escape, the back control) |
| WD5 | `WD5: the details' lines, each only when it has something to say` | unit (`walkDetailLines`) + journey (started, walked, the clause) |
| WD6 | cold find | `UNTESTED` as WD2 |
| WD7 | `WD7: no pace, speed, elevation, calories, percent, goal, countdown or digit count in any view; one text size` | unit (lines and SECTIONS over a grid of inputs, a banned-word and digit scan) + journey (every view's text scanned; font sizes) |
| WD8 | `WD8: the details' time ticks with the strip's and says the same words` | journey |
| WD9 | `WD9: This walk's last row shows the menu, while walking and while paused` | journey |
| WD10 | `WD10: lowered, a pull opens This walk and the … the menu, never a section` | unit (reducer) + journey |
| WD11 | `WD11: the ring shows on the Explore section only` | journey (the ring layer present per view) |
| WD12 | `WD12: spoken names and expanded state` | journey (aria attributes) |
| WD13 | `WD13: mid-memo nothing raises; the drawer's height is unchanged; What I'm into's Back returns to the Explore section` | journey (`walkdrawer`, and `into`'s audit 1 check moved) |
| WD14 | `WD14: the ready bar pulled up shows the start settings` | journey `ready` (its check holds; one line added) |
| WD16 | `WD16: no request or write while the drawer is up` | journey (the page's request log, up against down) |
| WD17 | `WD17: the captures ride on the drawer, visible and tappable on every view; edge buttons hidden` | journey (elementFromPoint at each button's centre, per view; a 375x667 viewport) + unit (the capped height) |
| WD18 | `WD18: the gaps and recorder trouble in words` | unit (`walkDetailLines`) |
| WD15 | `WD15: at 320 px no row name, back control or heading wraps` | journey (320 px viewport, one line each) |

A new journey `scripts/e2e/journeys/walkdrawer.js` (screen change, `/slice` asks for one), and a harness helper
`walkSection(pg, id)` (… → the row) for the journeys that reached a control by raising the drawer.

## Testing's size

**small to flow** (decision 0223): controls move behind a step on one screen; the drawer's view is new wiring. The
journeys naming the moved ids (grep, Nov 19): `walk` (`strip-more`, `explore-walk`, `pocket-alert`, `range-slider`,
`into-row`, `motion-*`, `share-gps-log`, `layers-key`), `into` (the walk drawer's row, audit 1), `launch` (`explore-walk`
in the walk's card), `ready` (the walk's `explore-walk`), `nudge` (`pocket-alert`, to confirm it is the walk's), and
`layers`/`walkability`/`where` only if their `layers-key` is the walk's (to check at the edit). With the new
`walkdrawer`: about 7 journeys, 2-5 minutes each, about 20-25 minutes, once each at the end, in batches of three; the
new journey alone until green first.

## Cost

The details render only while the drawer is up on This walk. Per second: the strip's existing tick, O(1). Per fix:
the street line's `streetAt` over the walk's loaded segments (`walked` + `fog`), O(segments), a few thousand on a
4-hour walk, only while This walk shows; if it shows in `perf-walk.js` it goes through `EdgeGrid`. The clause: O(this
walk's moments) per change, already held in `cap.captures`. Nothing per frame. Harness: `scripts/perf-walk.js` before
and after.

## Deferred

- The ready bar in the same shape (P5).
- A list of this walk's moments in This walk, each with its place and time (P4).

## Native, never run on a device

- Android's hardware Back stepping from a section to the menu before lowering (WD4): an item in
  `docs/NATIVE_UNVERIFIED.md`.
- The drawer's views on iOS VoiceOver: the headings and the back control's name (WD12): an item.

## Steward (Nov 19, on the spec and this plan)

Three drifts, two tone findings, no breaches.

- **S1** [drift] the raised drawer covers the capture stack, and This walk is now read mid-walk: **to the owner** (P7).
- **S2** [drift] the distance to a destination can read as a countdown: **accepted**: "Heading for <place>, 1.2 km
  away" (WD5); no "to go", "left", "remaining" or "of", and no change when drifting (WD7).
- **S3** [tone] "Nothing kept yet" and "so far" push to capture: **accepted**: no line when nothing is kept, no "so
  far" (WD5, P4).
- **S4** [drift] WD7 scanned This walk only, P4 cited the wrong line, and nothing tested that nothing leaves:
  **accepted**: WD7 over every view, P4 cites 0052, WD16 added.
- **S5** [tone] P6's line was copy for layout: **accepted**: P6 dropped.
- Silent 1 (the settings' verb): no change; Explore and Route leaning earn, the rest are the walk's plumbing, as today.
- Silent 2 (the lows: GPS gaps, "Not recording" in This walk): **the owner, Nov 19: yes** (WD18).
- Silent 3 ("moving time" is a fitness idea): **accepted**: WD5 says "the time walked with pauses left out, as the
  strip counts it", which is what the strip does (stops are not left out).
- Silent 4 (Pocket alert under Explore, not Reminders): no change: the owner placed it (Nov 19); WD2's cold find will
  tell.
- Precedent: AllTrails' pulled-up sheet and Google Maps' card added to `docs/research/adjacent-apps.md`, unverified.
