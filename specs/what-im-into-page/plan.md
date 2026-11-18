# What I'm into: its own page (plan)

Nov 18, 2026. The spec is `spec.md` beside this file (WI1-WI16, decision 0192). For the owner's review before any test
or code. Read against `expo` ~58.0.21, `expo-router` ~58.0.28, `react-native` 0.88.1, `react-native-web` ~0.21.4, from
`node_modules` (Stack options in `expo-router/build/react-navigation/native-stack/types.d.ts`; sticky headers in
`react-native-web/dist/exports/ScrollView/index.js` and `react-native/Libraries/Lists/SectionList.js`).

## The shape in one paragraph

A new root route, `src/app/into.tsx` (`/into`), pushed onto the root stack like any page (`presentation: 'card'`,
the stack's own header titled "What I'm into" with its Back). Both entry rows call the same `router.push('/into')`:
the ready bar's settings (`StartSettings`, with Explore chosen) and the walk's drawer (`options-card` in
`walk.tsx`, with Explore on), where `KindSwitches` and `ComplexKindSwitches` are drawn today. The page is one
`ScrollView` with `stickyHeaderIndices` over the five category headings (and Complexes', Q1), each heading on its own
ground; it reads the settings once, draws nothing until they are loaded, and saves each switch as it changes through
the existing `saveSettings`, whose listeners already reach the walk screen, Explore's tab and the ready screen.

## The route, and how both entries open it

- **The route.** `src/app/into.tsx`, declared in `src/app/_layout.tsx` beside `walk`:
  `<Stack.Screen name="into" options={{ title: 'What I’m into', presentation: 'card', headerShown: true }} />`. A
  push, so the standard Back (matrix 11 and 23), the iOS edge swipe (the walk's `gestureEnabled: false` is the walk's
  own option, not the page's) and Android's Back pop it. The page covers the walk and the tab bar (both are under the
  root stack's screen), as the replay does.
- **From the ready bar.** `StartSettings` draws `IntoRow` where "What I'm into" and its list were; its tap is
  `router.push('/into')`. The ready bar stays raised under the page (`useReady`'s `up` is the walk screen's state,
  which stays mounted), so Back lands on the raised settings with the row in view (WI4).
- **From the walk's drawer.** `walk.tsx`'s `options-card` draws the same `IntoRow` in the same place; the same push.
  The walk screen stays mounted under the page: recording is the `OpenWalkProvider`'s, above the stack, so fixes
  keep arriving (WI10); `dangerouslySingular` still keeps one walk screen.
- **The Modal-over-Modal trap.** Neither entry is inside a Modal: the ready bar and the walk's drawer are the
  `ReadyBar` (an `Animated.View` with a `ScrollView`), not `components/Modal`. A `card` push presents nothing
  modally, so it cannot meet iOS's "a Modal over a Modal". The plan rejects two shapes that could: the page as a
  `components/Modal` opened from the walk screen (the walk's own Modals, the note page `noteOpen` and the
  `CaptureViewer`, would then have to be closed first, and a reminder opening a viewer over it would fail), and
  `presentation: 'modal' | 'fullScreenModal'` (a UIKit presentation; it fails if any `components/Modal` is up when it
  is pushed, and a Modal opened from inside it must be presented from it). The rows are unreachable while a Modal
  is up (raising the bar closes the walk's cards; mid-memo the bar is locked), and the page itself opens no Modal.
- **What blur does to the walk screen** (each checked in the journey): `walkScreenShown` lets go (a reminder's
  `showWalk()` would come back to the one walk screen; `dangerouslySingular`); `momentPill.leave()` closes an open
  "Add to this moment" pill (Q5); `sayHeld` goes quiet; `deletions.flush()` stores a waiting delete, as any route
  change does. On return, `useReady`'s focus effect re-reads the choices and the settings (so its copy is current)
  and asks one fix, as on any return to the tab.

## Files to change

| File | Change |
|---|---|
| `src/app/into.tsx` (new) | The route: the page view, `IntoPage`, in the safe area; focus to the title on open (WI14) |
| `src/app/_layout.tsx` | `Stack.Screen name="into"` with the options above |
| `src/components/IntoPage.tsx` (new) | The page: `ScrollView` with `stickyHeaderIndices`; headings (`kind-heading-<category>`, `accessibilityRole="header"`, own ground `theme.bg`, fixed height); rows `SwitchRow` (`kind-<id>`), kind rows heavier (WI7); Complexes' section (Q1); `testID="into-page"` |
| `src/components/IntoRow.tsx` (new) | The entry row: `Pressable`, `accessibilityRole="button"`, label "What I’m into", hint "Opens its page", a chevron (`chevron-forward`) in ink, 48 pt tall, `testID="into-row"` |
| `src/components/ExploreSettings.tsx` | `KindSwitches` and `ComplexKindSwitches` go to the page (or are drawn by it); `RangeSlider`, `walkNote` stay |
| `src/components/StartSettings.tsx` | The list and Complexes out; `IntoRow` in their place; `onToggleKind` prop removed |
| `src/components/walk/useReady.tsx` | `toggleKind` and the prop removed |
| `src/app/walk.tsx` | `options-card`: `IntoRow` in the list's place; `toggleKind` removed; the range, pocket alert and the rest stay (WI11) |
| `src/components/walk/ReadyBar.tsx` | Its Back and Escape handlers only while its screen is focused (`useIsFocused`), or they lower the hidden bar under the page and the page never pops (risk 1) |
| `src/lib/discovery/intoSections.ts` (new, `@layer core`) | `intoSections(kinds, hidden)`: the sections in order, each `{ category, label, rows: { kind, depth, on, locked, heavy }[] }`; `stickyIndices(sections)`: the child indices of the headings |
| `src/lib/explore/settingsChange.ts` (new, `@layer core`) | `withKind(settings, kind, on)`: the next settings, range and pocket alert untouched; `null` before the settings are loaded (WI9) |
| `src/lib/explore/useExploreSettings.ts` (new, `@layer view`) | The page's hook: `loadSettings`, `onSettings`, a guarded `saveSettings` (the walk's own copy is not refactored in this slice) |
| `scripts/features.js` | `explore` gains the route and two components, the journey `into`, the spec; `IN_PROGRESS['what-im-into-page']`; `UNTESTED` `device:` lines for WI4's swipe and Android Back, WI5 on a phone |
| `scripts/e2e/harness.js` | `openInto(pg, from)`: raise the bar (ready) or tap `walk-summary` (walk), tap `into-row`, wait for `into-page`; `closeInto(pg)` |
| `scripts/e2e/journeys/into.js` (new) | The slice's journey (below) |
| Journeys that move | `subtypes`, `small-places`, `marks`, `nudge`, and three 0192 does not name: `walk`, `tabs`, `complexes` (below) |
| Docs, at the end | `.claude/rules/subtypes.md` ("What I'm into" is a page), `.claude/rules/walk-screen.md` (the drawer's content), `docs/ARCHITECTURE.md` (codemap, routes), `docs/PRODUCT.md`; `docs/DEFERRED.md` ui 2 and ui 3 removed and `docs/NATIVE_UNVERIFIED.md` items added only through `npm run records` |

Data: nothing new. No truth, no cache, no migration, no IndexedDB version; the same meta keys (`explore_hidden`,
`explore_kinds_known`, `complex_hidden`).

## Sticky headings: web against native

- **`SectionList` pins only on iOS by default.** React Native 0.88's `SectionList` sets
  `stickySectionHeadersEnabled ?? Platform.OS === 'ios'`, and react-native-web's vendored copy does the same, so on
  Android and the web the headings scroll away unless it is passed `true`.
- **On the web, pinning is CSS.** react-native-web's `ScrollView` wraps each child named in `stickyHeaderIndices` in a
  View styled `position: sticky; top: 0; zIndex: 10`. Every heading is sticky in the same content box, so they stack
  at the top as they pass, the last drawn on top (`.claude/rules/gallery.md` has the same trap), where iOS and
  Android push the last heading out. Drawn on its own opaque ground and all of one height, the stack looks like a
  push: the heading in view is always the current section's. A heading without its own ground shows the rows
  through it.
- **The choice: a `ScrollView` with `stickyHeaderIndices`**, as the journal (`JournalPage`) and the gallery
  (`MediaScreen`, a `FlatList`) already pin their dates. Sixty rows need no virtualization, every row stays in the
  DOM (the `subtypes` journey's XS22 check reads every row's label), and the indices come from `stickyIndices`, a
  pure function. A `SectionList` would virtualize and need `stickySectionHeadersEnabled` set by hand, for nothing.
- **Native has never run on a device.** Android's `ScrollView` supports `stickyHeaderIndices`, iOS's too; neither is
  tried on a phone: device lines for WI5.

## Goal-to-control lines

| Action | The user's goal; how often, where | Control | Matrix row | Adjacent apps |
|---|---|---|---|---|
| Open "What I'm into" | Change what the "?" marks show; a few times a season, standing, before a walk or paused in one | A list row: its words and a chevron, the whole row one target; pushes the page | 11 (a row with a disclosure indicator, pushed with the standard Back; avoid a sheet to navigate, an info button to drill in) | iOS Settings: a row per app opens its page; Android: an app's notification row opens its categories |
| Turn a kind or subtype on or off | Show or hide a kind of place; on the page, a few at a time | A switch in a list row, acting at once | 14 (avoid a separate Save, colour-only state) | iOS and Android: switches act at once, no Save |
| Know which group a row is in, mid-scroll | Find Waterfalls among sixty rows | The section's heading pinned at the top on its own ground | none in the matrix; L1 (standard list layouts) | iOS Contacts pins its letters (unverified); Google Maps' headings scroll away (unverified) |
| Tell a kind from its subtypes | Know whether Buildings and structures turns off Bridges | The kind's label heavier; subtypes indented and gone while the kind is off | 14 | none found |
| Go back | Back to the walk or the ready bar | The stack's Back at the top leading edge; system Back, edge swipe, Escape | 23 (Back symbol on a stack; avoid Cancel, Done and Back together) | iOS Settings and Android: Back |

**Where the owner will look first.** Pulling up the ready bar with Explore chosen: under "“?” range" and its
slider, where the list began, the row "What I'm into ›". On a walk, pulling up the drawer with Explore on: the same
place, under the range. On the page: the headings at the top, Art first; scrolled, the pinned heading names the
section in view.

**Against precedent.** Pinned headings depart from iOS Settings, Android's categories and Google Maps (their headings
scroll away): the owner's call (0192), for sixty rows the cold find could not place. The row shows no value where
iOS Settings shows one ("Banners"): any summary of sixty switches is a count in other words (WI12, Never: tallies).
Nothing else departs.

**Defaults to overrule** (each makes something quieter or decides a look):
- The row has no summary line and no value on its right (WI12); its chevron is in ink, not muted.
- The row shows only where the list showed (Explore chosen; Explore on), Q3.
- A kind's label at weight 600 and a subtype's at 400, at the same size (WI7), Q4.
- No "all off" per heading, no jump list, no search (spec, "Not here").
- The page's title is the stack header's, at the platform's size, not the drawer's section style.

## Which journeys move, and how

| Journey | Today | After |
|---|---|---|
| `subtypes` | reads the list in the ready bar (raised) and the walk's drawer; XS2, XS6, XS19, XS22-XS24, audits 2, 16 | `openInto` from the ready bar, then from the walk's drawer; the same checks on `into-page`; XS24 compares the page's rows from both entries (WI3); shots of the page at its top, middle and end, and pinned |
| `small-places` | `walk-summary`, then `kind-plaques` in the drawer | `walk-summary`, `into-row`, then the same checks on the page; Back before the walk goes on |
| `marks` | three blocks open the drawer and read rows | each opens the page through the drawer's row, reads, flips Parks and gardens, Back |
| `nudge` | the pocket alert in the ready bar's settings | holds in the drawer; adds WI11: the pocket alert is in the settings beside `into-row`, and not on the page |
| `walk` (not in 0192's list) | lines 49, 140, 149 find `kind-churches` in the drawers; line 694 flips `kind-public_art` mid-walk (E17) | the drawers show `into-row`, no `kind-*`; E17's flip goes through the page and Back, then the "?" is gone (WI8) |
| `tabs` (not in 0192's list) | line 106 flips Public art in `start-settings` (tabs audit U4) | the same row-words tap on the page; the quiet-mode check (no `kind-churches`) holds |
| `complexes` (not in 0192's list) | CX10 finds five `complex-kind-*` in the raised bar | on the page (Q1); stays as it is if the owner keeps them in the drawers |

**The new `into` journey**, covering `IntoPage`, `IntoRow`, `into.tsx` and the entries: WI1 (the row in both, no
`kind-*` in either drawer), WI2 (shots for the cold find: the raised bar, the page's top and middle), WI3, WI4 (Back,
Escape; the bar still raised, `into-row` in view), WI5 (scroll to Fountains: the element at the page's top is
`kind-heading-parks`; scroll on: `kind-heading-culture`), WI6, WI7 (computed font weights), WI8 (a kind off, Back,
its "?" gone on the walk), WI9 (meta read held back by a slowed IndexedDB open: no switch drawn, nothing written),
WI10 (fixes sent while the page is up are in the trace after Back), WI11, WI12 (no digit in the row or the page),
WI13 (320 px, one line each; 200% text), WI14 (roles; focus on the title, then on the row after Back), WI15, WI16
(reload on `/into`).

## Tests first (todos, committed before any code)

| Criterion | Test | Where |
|---|---|---|
| WI1 | `WI1: neither StartSettings nor the walk's options card draws KindSwitches or ComplexKindSwitches` (reads the files, as `tabs/rangeLine.test.ts` does); the journey's row checks | `src/lib/__tests__/explore/intoPage.test.ts`; `into` |
| WI2 | the cold find (`ux-reviewer`, pictures only, decision 0167); the journey's shots | `into` |
| WI3 | `WI3: the page lists the same rows from both entries` | `into`; `subtypes` (XS24 moved) |
| WI4 | the journey (Escape, Back); `device:` for the edge swipe and Android Back | `into`; `UNTESTED` |
| WI5 | `WI5: five sections in order, a heading's index before its rows` (`intoSections`, `stickyIndices`); the journey's pinned check | `intoPage.test.ts`; `into`; `device:` native pinning |
| WI6 | `WI6: a kind off has no subtype rows; on, they return as they were` | `intoPage.test.ts`; `into` |
| WI7 | `WI7: a kind row is heavy, a subtype row is not`; computed weights in the journey | `intoPage.test.ts`; `into` |
| WI8 | the journey: a kind off on the page, Back, no "?" | `into`; `walk` (E17 moved) |
| WI9 | `WI9: withKind before the settings load is null; after, range and pocket alert are kept` | `src/lib/__tests__/explore/settingsChange.test.ts`; `into` |
| WI10 | the journey: fixes while the page is up, the trace after Back | `into` |
| WI11 | the journey; `nudge` | `into`, `nudge` |
| WI12 | `WI12: no heading, row or the entry row's words carry a digit, for every kind off and on` | `intoPage.test.ts`; `into` |
| WI13 | the journey at 320 px and 200% | `into`, `subtypes` |
| WI14 | the journey: roles, focus | `into` |
| WI15 | `WI15: Complexes' section follows the five, its heading pinned` | `intoPage.test.ts`; `complexes` |
| WI16 | the journey: `pg.goto('/into')` | `into` |

Committed as `What I'm into page: tests first (WI1-WI16, failing)`; `npm run check:test-first what-im-into-page`
reads it.

## Cost

Sixty switches in a `ScrollView`, drawn once per open: no per-frame or per-fix work. A switch writes four meta keys
(`saveSettings`, as today) and tells its listeners: the walk screen, Explore's tab and the page re-render once each.
Returning from the page runs `useReady`'s focus effect (the choices, the settings, one fix), as any return to the tab
does. The walk's map stays mounted under the page: on the web it keeps rendering fixes (measured by the `walk`
journey's listener and node counts, which must not grow over an open and close); on a phone, device only. No harness
run is needed; `scripts/perf-walk.js` is unaffected.

## Native paths that will not run on a device

The push and its iOS edge swipe; Android's Back popping the page with the bar raised beneath (risk 1); `ScrollView`'s
sticky headings on iOS and Android; the walk recording under a pushed page with the map mounted. Each is an item in
`docs/NATIVE_UNVERIFIED.md` (through `npm run records -- native item add`) and a `device:` line in `UNTESTED`.

## Risks

1. **Back and Escape under the page.** The walk screen stays mounted, so `ReadyBar`'s `hardwareBackPress` listener
   (added after the navigator's, so called first) and its `keydown` Escape listener stay live: Back would lower the
   hidden bar and return `true`, and the page would never pop; Escape on the web would lower it unseen. Gated on
   focus, tested in `into` (Escape) and on a device (Back).
2. **Web sticky headings stack** instead of pushing (above): an opaque ground and one fixed height per heading; the
   journey reads what is at the page's top with `elementFromPoint`, the last-drawn rule of the gallery.
3. **The walk screen's blur effects**: the "Add to this moment" pill closes (Q5), a held capture's line waits, a waiting
   delete is stored. The journey checks the walk's trace, recording bar and pins are as they were after Back.
4. **Settings copies.** The walk keeps its own copy (`onSettings` updates it), the ready screen re-reads on focus, the
   page has its own; a page saving before it loaded would wipe the range or the pocket alert (WI9's guard, as
   walk-drawer-settings audit 2).
5. **A reload on `/into`** (web): `unstable_settings.initialRouteName` puts the tabs beneath, so Back leads to a tab, not
   the ready bar; with a walk open the launch replaces the route with `/walk` (WI16 says so; NV2 holds).
6. **Focus on the web** (WI14): react-navigation does not return focus to the row; `focusOn(rowRef)` in a focus effect,
   after react-native-web's own focus moves.
7. **Seven journeys move**, three of them outside 0192's list (`walk`, `tabs`, `complexes`); each is run once at the end
   (`check:affected` names them). `scenic`'s and `drive`'s known failures on `main` (`e2e:baseline`) are not this
   slice's.
8. **Copy apostrophes.** The row and the title use the typographic "What I’m into", as the section heading does today;
   the journeys match on it.

## Steward

Not run in this session: it had no subagent tool. To run on this spec and plan before the owner's go-ahead
(`.claude/agents/steward.md`), its findings triaged here.

## Open questions for the owner

1. **Complexes' five switches** (CX10), drawn today right after What I'm into in both drawers: (a) **move to the page,
   after the five categories, under their own pinned heading "Complexes"** (recommended: they are the same lasting
   "what I'm shown" choice U4 found misplaced under "This walk", and the drawers keep only the walk's own); (b) stay in
   the drawers under the row. Precedent: iOS Settings keeps every switch of one job on its page.
2. **How the page is presented**: (a) **a pushed page with Back** (`presentation: 'card'`; recommended: matrix 11 and
   23, iOS Settings and Android do so, and it presents nothing modally, so it cannot meet iOS's Modal-over-Modal); (b) a
   full-screen modal with Done, as the replay (`fullScreenModal`; a UIKit presentation that fails while any
   `components/Modal` is up, and Done where nothing needs confirming).
3. **Where the row shows**: (a) **only where the list showed, with Explore chosen in the ready bar and Explore on in
   the walk's drawer** (recommended: NV21's rule, and a quiet walk's drawer stays short); (b) always, since the choice
   also filters Explore's tab.
4. **A kind's row heavier than its subtypes'** (WI7, for ui 3): (a) **its label at 600, a subtype's at 400, the same
   size** (recommended: the cold find could not tell them apart by indent alone); (b) indent only, as today.
5. **The "Add to this moment" pill when the page opens on a walk**: (a) **kept open**: the page is a detour inside the
   walk, and the pill's 100 m still counts (recommended; the route opts out of `momentPill.leave()`); (b) closed, as on
   leaving for a tab (MS4), with no code.
