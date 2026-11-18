<!-- Repo first: from the owner's call of Nov 17, "Own page, one row" (decision 0192), after the explore-subtypes audit (U3, U4) and its cold find (ui 2, ui 3). Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# What I'm into: its own page

Nov 18, 2026 · @Miguel Guerrero

## Vision

Idea: "What I'm into" (the kind switches, about 60 rows under five category headings) moves out of the ready bar's settings and the walk's drawer into one row with a chevron in each, opening a full-height page of its own, the same page from both, with the five category sections and their headings pinned while their rows scroll (the owner, Nov 17, decision 0192).
Verb: earn (the switches choose what the walker is helped to notice: "Does it raise what you notice, or only what you are told?"; a list whose group can be told mid-scroll lets a walker find the waterfalls they want shown).
Touches: VISION.md Never, "Tallies such as '12 of 87' or '40%'" and "Scores, … completion, coverage" (a row standing for sixty switches invites "12 on" or "3 of 5": none, as XS19); "A capture behind a menu, a drawer or an extra tap" and Always, "Capture is one tap away on every screen you walk or capture from" (the page covers the walk's capture stack while it is up: it is a settings page, not a screen you walk or capture from, as the raised drawer is not, and Back is one tap; the walk keeps recording under it); Always, "Restraint in motion, colour and copy" (a plain page: a title, Back, the list); decisions 0191 (the subtype tree, headings, XS2-XS24), 0192 (this slice), 0193 (precedent), 0167 (found before quiet), 0183 (subtypes never counted).
Verdict: aligned
Shape: as asked: one row, the words "What I'm into" and a chevron, where the list was (the ready bar's settings with Explore chosen, the walk's drawer with Explore on); a pushed page with the standard Back, titled "What I'm into", its five sections' headings pinned on their own ground; every switch saves as it changes, with no Save; the row and the page carry no number; the drawer keeps the range and the pocket alert.
Precedent: iOS Settings, Notifications (a row per app opens that app's page of switches, no Save, Back returns; support.apple.com, verified); Android's notification categories (a page of switches under group headings; developer.android.com, verified); Google Maps' Settings, Notifications (a page of switches under headings that scroll away; from memory, unverified). Pinned headings depart from both settings pages; iOS Contacts pins its letters (from memory, unverified): the owner's call, for a list of sixty rows.
Criteria: WI1-WI16 (WI12 carries the Never lines on counts; WI10 the walk going on under the page).
Open: none for the gate; the plan's questions (Complexes, how the page is presented, a kind row's weight) were answered by the owner on Nov 18.

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, "Choose what you are shown: a long list of switches" (recorded Nov 18):

- **iOS Settings, Notifications** (iOS): the Notifications page lists the apps; a tap on one opens that app's own page
  of switches (Allow Notifications, Time Sensitive Notifications, Badges), "Customize Notifications" a further row;
  each switch acts at once, no Save, Back returns. Source:
  https://support.apple.com/guide/iphone/change-notification-settings-iph7c3d96bab/ios , read Nov 18, 2026.
  **Verified**. The model for WI1, WI4 and WI8.
- **Android system settings, an app's notification categories** (Android 8 and later): a page of its own per app,
  its categories each a switch, gathered under group headings. Source:
  https://developer.android.com/develop/ui/views/notifications/channels , read Nov 18, 2026. **Verified**. The model
  for a page of switches under headings (WI5).
- **Google Maps** (iOS, Android): Settings, then Notifications, a page of its own with switches under plain headings
  that scroll away with their rows. Source: from memory, unverified. **Unverified**. Where we depart: our headings
  stay pinned (the owner's call; the cold find lost the group mid-scroll).
- **iOS Contacts** (iOS): a plain list whose letter headings stay pinned while their rows scroll, the next pushing the
  last out. Source: from memory, unverified. **Unverified**. The model for WI5's pinning.
- **AllTrails** (iOS): Filters, a full-screen page of sections with a heading over each block; a filter for one
  search, not a lasting preference, so not the model for where the page lives. Source: from memory, unverified.
  **Unverified**.

## What it is

Explore subtypes (decision 0191) took "What I'm into" to about sixty rows under five category headings, drawn inline
in the ready bar's settings and in the walk's drawer under "This walk". The audit's UX review found them lasting
preferences under a heading that says they are for this walk (U4), and the cold find could not place Fountains or
Waterfalls, or tell a kind from its subtypes, from pictures of three scroll positions, since a heading scrolls away
with its rows (U3; DEFERRED, "Explore subtypes", ui 2 and ui 3). The owner chose its own page (0192): the drawers
keep one row, and the list moves, whole, to a page reached from both.

## Decisions

- **Own page, one row** (the owner, Nov 17, decision 0192): "What I'm into" becomes one row with a chevron in the
  ready bar's settings and in the walk's drawer; it opens a full-height page of its own, the same page from both, with
  the five category sections and their headings pinned while their rows scroll.
- **0192's Consequences**, as written: "Its own slice, spec-first (a route, the two entry rows, the page; the
  journeys that open the switches in the drawer move to the page: subtypes, small-places, marks, nudge)." "XS2, XS5,
  XS22-XS24 hold on the page; the drawer keeps the range and the pocket alert." "docs/DEFERRED.md's 'Explore subtypes'
  items on headings scrolling away (ui 2, ui 3) are answered by this slice."
- **The plan's five questions** (the owner, Nov 18, 2026), each the recommended option:
  1. Complexes' five switches move to the page, after the five categories, under their own pinned heading "Complexes"
     (WI15).
  2. The page is a pushed page with Back (`presentation: 'card'`), not a modal.
  3. The "What I'm into" row shows only where the list showed: with Explore chosen in the ready bar, and with Explore on
     in the walk's drawer.
  4. A kind's row label is weight 600, a subtype's 400, at the same size (WI7; the owner did not object).
  5. The "Add to this moment" pill stays open while the page is up on a walk; the route opts out of `momentPill.leave()`.
- Defaults taken in the plan, for the owner to overrule: see plan.md, "Defaults to overrule".

## Criteria

The owner's task, in their words: "turn a kind on or off in What I'm into, from the ready bar or from the walk".

- **WI1** (the task): in the ready bar's settings with Explore chosen, and in the walk's drawer with Explore on,
  "What I'm into" is one row, its words and a chevron, where the list was; a tap anywhere on the row opens the page;
  neither drawer holds a kind's switch any more.
- **WI2** (finding): someone told only "turn off ghost towns", shown the ready bar pulled up with Explore chosen, finds
  the row (ink, the words "What I'm into", a chevron, a row of at least 44 pt), and on the page finds Ghost towns
  under the pinned heading "Viewpoints & oddities", under Curiosities (the cold find, decision 0167); the same told
  "turn on waterfalls", from a picture of the page scrolled to its middle.
- **WI3** one page from both: the row in the ready bar and the row in the walk's drawer open the same route, and it
  shows the same headings and rows in the same order (XS24 moves here: "the same list in both" becomes "one page
  from both").
- **WI4** the page covers the screen, edge to edge, over the walk and the tab bar, titled "What I'm into", with Back
  at its top leading edge; Back, Android's Back, Escape on the web and the iOS edge swipe each return to the drawer it
  was opened from, still raised, the row in view.
- **WI5** pinned headings: the five headings in order (XS2 holds); while a section's rows scroll, its heading stays
  pinned at the page's top on its own ground, the rows passing under it, and the next section's heading takes its
  place as it arrives; on the web as on a phone. At any scroll position one heading is in view above the first row
  shown (answers ui 2).
- **WI6** XS5 holds on the page: a subtype's row shows indented under its kind only while the kind is on; a kind
  switched off on the page takes its subtypes' rows away at once, and switched back on brings them back as they were.
- **WI7** a kind's row is told from its subtypes' rows by more than its indent: its label is drawn heavier than theirs
  at the same size, and a subtype's row is spoken as part of its kind (XS23 holds; answers ui 3).
- **WI8** every switch saves as it changes, with no Save or Done step (matrix 14); back on the walk, a kind switched
  off on the page has no "?" on the walk's map, and switched on shows them (E17); the ready map, Explore's map and
  the atlas read the same choice.
- **WI9** nothing is saved before the settings are read: the page draws no switch until they are loaded
  (walk-drawer-settings audit 2 holds), and a switch changed on the page never changes the range or the pocket alert.
- **WI10** a walk goes on under the page: fixes that arrive while it is up are in the trace when Back returns, the
  time and distance go on, and no second walk screen is made.
- **WI11** the drawers keep what is the walk's: the walk's drawer keeps the Explore switch, the "?" range with its
  ring, the pocket alert and the rest; the ready bar's settings keep the range and the pocket alert; neither is on the
  page.
- **WI12** no number: the row says no count of kinds on or off ("12 on", "3 off", "all"), and no heading, row or
  title on the page carries a number (XS19 holds, and reaches the row).
- **WI13** at 320 px the row's words and chevron are on one line; the page's headings and rows read at the default
  text size without a label wrapping, and at 200% nothing is lost (XS22 holds on the page).
- **WI14** a screen reader hears the row as a button named "What I'm into" that opens a page; on the page, its title
  and the five headings as headers (XS23 holds); focus starts at the page's title, and Back returns it to the row.
- **WI15** Complexes' five switches (CX10) are on the page, after the five categories, under their own pinned heading
  "Complexes" with their note; the drawers keep none of them. (The owner's answer to the plan's Q1, Nov 18.)
- **WI16** on the web, a reload on the page, or a link straight to it, shows the page with Back leading to the screen
  beneath it; with a walk open, the walk comes back as at launch (NV2).

## Which existing criteria move or hold

| Criterion | Was | Now |
|---|---|---|
| XS2 (five headings in order; Ghost towns findable) | the drawers' list | holds on the page (WI5, WI2) |
| XS5, PC23 (a subtype indented under its kind, only while on) | the drawers' list | holds on the page (WI6) |
| XS19 (no count in a heading or row) | the drawers' list | holds on the page, and reaches the row (WI12) |
| XS22 (320 px, 200%) | the drawers' list | holds on the page (WI13) |
| XS23 (headings are headers; a subtype says its kind) | the drawers' list | holds on the page (WI14, WI7) |
| XS24 (the same list in the ready bar and the walk's drawer) | two lists compared | one page from both (WI3); its test moves to the page |
| SP2 (Plaques under Monuments and memorials, findable) | the walk's drawer | the page (`small-places` journey) |
| NV21 (at full: what I'm into and the range, with Explore chosen) | the list in the ready bar | the row in the ready bar; the range stays (WI1, WI11) |
| NV22, E16, E17 (saves as it changes; a kind off hides its "?") | the drawers | the page (WI8) |
| PA5, PA6 (the pocket alert, its note, touch screens only) | the drawers | holds in the drawers (WI11; `nudge`) |
| CX10 (Complexes' five switches beside What I'm into) | the drawers | the page (WI15; Q1, Nov 18) |
| walk-drawer-settings audits 1, 2 (one instance; nothing saved before loaded) | the walk's drawer | hold on the page (WI8, WI9) |
| NR7 (the ready bar pulls up to its settings) | holds | holds; the settings are shorter |

## Not here

- A jump list of the five categories, a search over the rows or an "all off" per heading: candidates in DEFERRED's ui 2
  and ui 3 that pinned headings make unneeded; a slice of their own if the cold find still fails.
- A summary of the choice on the row ("Art, History …"): a count in other words, and the row's words must fit 320 px.
- An entry on the Explore tab: 0192 names two entries.
- The shared `SwitchRow`'s off contrast (explore-subtypes audit 19) and the drawer's section style (U2's deferred half):
  unchanged here.
