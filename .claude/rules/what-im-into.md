---
paths:
  - "src/app/into.tsx"
  - "src/components/IntoPage.tsx"
  - "src/components/IntoRow.tsx"
  - "src/lib/explore/intoPage.ts"
  - "src/lib/explore/settingsChange.ts"
  - "src/lib/explore/useExploreSettings.ts"
  - "src/lib/intoNav.ts"
  - "src/lib/__tests__/explore/intoPage.test.ts"
  - "src/lib/__tests__/explore/settingsChange.test.ts"
  - "src/lib/__tests__/explore/intoReview.test.ts"
  - "scripts/e2e/journeys/into.js"
  - "specs/what-im-into-page/**"
---
# What I'm into, its own page (decision 0192)

"What I'm into" (the kind switches, about sixty under five category headings, then Complexes' five) is a page of its
own at `/into`, reached by one row, "What I’m into ›" (`IntoRow`), in the ready bar's settings with Explore chosen and
in the walk's drawer with Explore on. The spec: `specs/what-im-into-page/spec.md` (WI1-WI25); the owner's answers to the
plan's questions and the review's four calls, Nov 18, are in its Decisions. Subtypes and the rows' tree: `.claude/rules/subtypes.md`.

- **A push, never a modal** (Q2): `Stack.Screen name="into"` in `app/_layout.tsx`, `presentation: 'card'`, the stack's
  header with `headerBackTitle: 'Back'` (on the web its button is `aria-label="Go back"`; without it the label was the
  route beneath's name, "walk, back"). The title is `IntoTitle`, a header focused as the page opens (WI14). A `card`
  push presents nothing modally, so it never meets iOS's Modal over a Modal; don't make it `modal`/`fullScreenModal`.
- **Back names the walk** (WI20, the owner, Nov 18): the walk's row is `<IntoRow from="walk" />`, and `openInto('walk')`
  pushes `/into?from=walk`; the route reads `intoBack(from)` and sets `headerBackTitle: 'Walk'` with
  `headerBackButtonDisplayMode: 'default'` (the web's header and iOS show the word; the web's button is then
  `aria-label="Walk, back"`, `closeInto` finds either name; Android shows its arrow alone). At large text (`intoMeasures`'
  `icon` 0) the mode is `minimal`, still named "Walk, back": the word squeezed the title to "W…". The web's header keeps
  hidden copies of the label for measuring, so read the drawn words, never `innerText`.
- **The walk's drawer gives the row a section of its own** (WI19): after the walk's settings (after Share GPS log), a
  rule and the header "Every walk", with Explore on; never back under "This walk", which names this walk only. The ready
  bar's row stays under "Walk settings", which claims no walk.
- **One way in:** `openInto()` (`lib/intoNav`), never `router.push('/into')` from a view. It marks the walk screen's
  blur as a detour (`tookDetour()`), so the Add to this moment pill stays open while the page is up on a walk (Q5); the
  ready screen's `MomentBar` still closes its pill on blur.
- **The screen beneath stays mounted** (react-navigation hides it: `display: none` on the web). So any Back or Escape
  handler it keeps must be gated on focus: `ReadyBar`'s is (`useIsFocused`), or Android's Back lowered the hidden bar and
  the page never popped. Escape on the web is the route's own listener, only while it is focused.
- **The walk goes on under it** (WI10): recording is the `OpenWalkProvider`'s, above the stack; `dangerouslySingular`
  keeps one walk screen. A reload on `/into` with a walk open lands on the walk (`openWalkAtLaunch` replaces the route);
  with none, the tabs are beneath (`initialRouteName`), so Back goes to Chronicle (WI16).
- **Pinned headings** (WI5): one `ScrollView` with `stickyHeaderIndices` from `intoChildren` (pure; `SectionList` pins
  only on iOS by default and would virtualize sixty rows for nothing). On the web each pinned child is CSS sticky in one
  box, so headings stack, the last drawn on top: every heading is the full width on its own ground (`theme.bg`), at one
  height. A heading without its ground shows the rows through it. The journey reads, at every scroll position, that the
  heading at the top is the section of the first row under it.
- **Two levels pinned** (WI17, the owner, Nov 18): the platforms' sticky headers carry one level (on a phone each pushes
  the last out, so a kind row made sticky would push its category out, not stack under it; `SectionList`'s headers are
  the same mechanism), so the kind is the heading's second line, "› Zoos and aquariums", from `intoPin` (pure) over the
  scroll offset and the children's heights: the kind of the first row showing `PIN_SLACK` (12 px) under the heading, or
  a kind's own row once half of it is under the heading. The heading has a fixed height for its lines (`intoMeasures`'
  `headingH`), so the line coming and going never moves the rows; it is heard by its category alone
  (`accessibilityLabel`). The scroll offset reaches only the `Heading`s, through a small store (`createStore`), never
  the sixty rows. Heights are summed from each cell's `onLayout`, never read as positions: react-native-web's onLayout
  hears a size change, not a move.
- **The web pushes the outgoing heading out** (WI22): with all of them sticky in one box, the incoming one slid over the
  outgoing one, leaving a sliver of its words ("Histo…") above it. The pinned heading is moved up by `intoPin`'s `push`
  as the next one arrives, and the headings it covered are hidden (`opacity: 0`), on the web only (a phone pushes by
  itself). A hairline (`theme.line`) under the pinned heading only while rows pass under it (WI24, `stuck`).
- **The off line** (WI18, the owner, Nov 18): `offLine` names a kind's subtypes that are off, "Plaques and Small
  memorials off", in the row's `note` (muted) and its hint; never a count; past `OFF_LINE_MAX` (31 characters, measured:
  the column is 208 px at 320 and the e2e's 13 px font about 6.6 px a character) "Some of these off". None while all
  are on or the kind is off. On the web the row is `aria-describedby` its note (`SwitchRow`, any row with a note and a
  testID): react-native-web drops `accessibilityHint`.
- **Large text** (WI21): `intoMeasures(width, fontScale)` is compact when the page's width over the text scale is under
  300: indent 12, gaps 6, margins 12, no icons, a heading's category on two lines. The width is the page's own
  `onLayout`, which the empty placeholder reports too (React reuses that View, and a reused View never reports
  onLayout on the web). **Trap:** a CSS `zoom` set on an open page halves its box without a resize, which onLayout never
  hears; the journey sets the zoom and then opens the page, as a zoomed browser would.
- **Complexes' rows wear icons** (WI23, `COMPLEX_ICON`: cart, basket, school, bus, podium, no kind's), so they read as
  rows; a heading is 17 px bold, larger than a kind's 15 px label.
- **Nothing before the settings are read** (WI9): the page draws only its empty root until `useExploreSettings` has
  them; `withKind` returns `null` before, so a tap never saves the defaults over the range or the pocket alert. Every
  switch saves at once through `saveSettings`, whose listeners reach the walk's copy; the ready screen reads again on
  its return to focus.
- **No number anywhere** (WI12): the row has no summary or value on its right (any summary of sixty switches is a count
  in other words); the page's headings and rows carry none.
- **Native has never run on a device:** the push and its edge swipe, Android's Back over the raised bar, the sticky
  headings and their second line, Back's "Walk", the walk under the page and the screen readers' focus are items in
  `docs/NATIVE_UNVERIFIED.md` ("Navigation and tabs").
- **E2E:** `openInto(pg, 'ready' | 'walk')`, `closeInto(pg, 'back' | 'escape')`, `intoScrollTo(pg, id)` (a row just
  under the pinned heading, then settled) and `intoSettled(pg)` (the scroll at rest, two frames drawn; returns the rows in
  view with no switch: a picture taken mid-scroll once showed rows without one, WI25) in the harness. In the DOM a row is
  `[role=switch][data-testid]`: the Switch inside it is a `role=switch` of its own; `E2E_ONLY=into` is the
  slice's journey (pictures `into-*`). The journeys that read kinds open the page: subtypes, small-places, marks, walk,
  tabs, complexes; nudge checks the pocket alert stays in the drawer.
