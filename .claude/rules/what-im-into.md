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
  - "scripts/e2e/journeys/into.js"
  - "specs/what-im-into-page/**"
---
# What I'm into, its own page (decision 0192)

"What I'm into" (the kind switches, about sixty under five category headings, then Complexes' five) is a page of its
own at `/into`, reached by one row, "What I’m into ›" (`IntoRow`), in the ready bar's settings with Explore chosen and
in the walk's drawer with Explore on. The spec: `specs/what-im-into-page/spec.md` (WI1-WI16); the owner's answers to the
plan's questions, Nov 18, are in its Decisions. Subtypes and the rows' tree: `.claude/rules/subtypes.md`.

- **A push, never a modal** (Q2): `Stack.Screen name="into"` in `app/_layout.tsx`, `presentation: 'card'`, the stack's
  header with `headerBackTitle: 'Back'` (on the web its button is `aria-label="Go back"`; without it the label was the
  route beneath's name, "walk, back"). The title is `IntoTitle`, a header focused as the page opens (WI14). A `card`
  push presents nothing modally, so it never meets iOS's Modal over a Modal; don't make it `modal`/`fullScreenModal`.
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
  height, so the stack reads as a push. A heading without its ground shows the rows through it. The journey reads, at
  every scroll position, that the heading at the top is the section of the first row under it.
- **Nothing before the settings are read** (WI9): the page draws only its empty root until `useExploreSettings` has
  them; `withKind` returns `null` before, so a tap never saves the defaults over the range or the pocket alert. Every
  switch saves at once through `saveSettings`, whose listeners reach the walk's copy; the ready screen reads again on
  its return to focus.
- **No number anywhere** (WI12): the row has no summary or value on its right (any summary of sixty switches is a count
  in other words); the page's headings and rows carry none.
- **Native has never run on a device:** the push and its edge swipe, Android's Back over the raised bar, the sticky
  headings, the walk under the page and the screen readers' focus are items in `docs/NATIVE_UNVERIFIED.md`
  ("Navigation and tabs").
- **E2E:** `openInto(pg, 'ready' | 'walk')` and `closeInto(pg, 'back' | 'escape')` in the harness; `E2E_ONLY=into` is the
  slice's journey (pictures `into-*`). The journeys that read kinds open the page: subtypes, small-places, marks, walk,
  tabs, complexes; nudge checks the pocket alert stays in the drawer.
