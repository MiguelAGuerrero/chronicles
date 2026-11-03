---
paths:
  - "src/app/(tabs)/**"
  - "src/components/StartDialog.tsx"
  - "src/app/_layout.tsx"
  - "src/components/{HomeSheet,RecordingBar,SwitchRow,OpenWalk}.tsx"
  - "src/lib/{recordingBar,walkNav,walkGate,openWalkLoad,startPlan,useStartWalk,useTabMap,memoGate,quietLines,summary,walkEvents,settleWithin}.ts"
  - "src/lib/__tests__/{tabsAudit,tabsAuditQuiet,minimize,startPlan}.test.ts"
---
# Tabs and home

The three tabs (Explore, Navigate, Chronicle), the home sheet, the recording bar, the way to the walk screen, and the home map's lifecycle. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## After the audit

- **Navigate's drawer docks Start and the capture row low at every height**
  (U1, AllTrails' sticky Start): Start is the drawer's foot; the row sits
  above the peek, over the drawer, whose settings scroll above both (a band
  under the row when opened). The grip is the handle plus a strip (44 px).
- **Navigate with a walk minimized is a live view of it** (U2, `LiveWalk` in
  `(tabs)/index.tsx`): trace, dot (`walkerSource={live.dot}`), captures,
  destination, and the capture row (`CaptureRow`, split from `MomentBar`)
  keeping captures for the walk. No Start or Return button (the recording
  bar is the way back), no drawer at all (the owner's call, Nov 3: no "Your
  walk is recording" line; the row sits just above the bar), no `locateOnce`. Only
  `LiveWalk` reads `useOpenWalk()`, and only while Navigate is focused;
  screens that only need to know whether a walk is open use
  `useOpenWalkInfo()`, which never changes per fix. The e2e bounds
  `render:navigate-walk`.
- **Going to the walk screen is `showWalk()`** (`lib/walkNav`, gate in
  `lib/walkGate`), never `router.push('/walk')`: a second ask while one is on
  its way or the screen is up does nothing, and the root stack's `walk` is
  `dangerouslySingular` (tabs audit 1).
  - The gate holds only while the walk screen is in front (`useFocusEffect`),
    never merely mounted, and the bar's return waits at most 5 s for its
    photo (`settleWithin`). Nov 2: minimized on the owner's iPhone, the bar's
    › did nothing, even after closing and reopening, while the tabs worked.
    Never reproduced (desktop, phone emulation, `/chronicles`, reloads,
    browser Back: `E2E_ONLY=reload`, `E2E_MOBILE=1`); these are the only two
    ways the › can do nothing.
  - **The bar has its own Stop** (`bar-stop`, held as on the walk screen; a
    tap says to hold), beside its camera: a way out even when the walk screen
    can't be reached (the owner's quick fix, Nov 2). It refuses under a memo
    (`memoGate`), waits at most 5 s for the bar's photo, then `stopWalk` and
    the replay.
- **A notification opener decides at tap time** from the keeper
  (`useOpenWalkInfo` in a ref), never from what its tab read on focus: a JS
  tab stays mounted, stale, under the others (tabs audit 2).
- **Leaving Navigate mid-memo saves the memo**; `memoGate` makes Start and
  Walk here wait for a memo being saved and refuse one still recording
  (tabs audit 3).
- **Later changes to a capture go out on the bus** (`captureBus.patch`, after
  the row is stored), so a thumbnail made after the bar's camera went reaches
  the walk screen (tabs audit 5).
- **The open walk's keeper reads latest-wins** (`createLatestLoader`): a
  failed read retries after 1 s and never settles as "no walk" (tabs audit 9).
- **Switch rows** (`components/SwitchRow`) flip from anywhere on the row; the
  Switch inside only shows the state (pointer events off), so a tap never
  flips twice. Its `testID` is on the row: `[data-testid=x] input` still
  reads the state. Small buttons are 44 pt themselves: react-native-web has
  no `hitSlop`.
- **Traps:** a pin on a map with no `onPinPress` is labelled without
  ". Open". The walker puck is `aria-hidden` (count it directly, not with
  `shownCount`). A Playwright double click on the bar never reached it twice
  (the bar is gone after the first push), so tabs audit 1's regression is the
  unit test. `E2E_ONLY=tabs` runs the tabs audit alone; `E2E_SOFT=1` reports
  failed checks and steps and goes on, for a run against code from before a
  fix.
- **Native** (unverified on a device): the docked drawer, `LiveWalk`'s
  Markers and dot, `dangerouslySingular` on the native stack, the memo saved
  on blur.
- **The second batch (U5-U15, audit 6; the owner's calls, Nov 2):**
  - Explore's hint sits in its drawer's header, so the peek says it at rest
    (U5). On its long-press card What's good here? is the filled button and
    Walk here secondary, still a one-tap start (U6).
  - Chronicle's peek: with no walk finished (a walk minimized or not), the
    empty line, Days and a Navigate button (U7); otherwise a Walks | Days
    switch in the header at every height (U8). No "N walks · M places" (U13).
  - The recording bar shows a pause glyph when paused and a forward chevron,
    not chevron-up, as its way back (U10). The walk options button is always
    `options-outline` (U11): a compass read as the Explore tab.
  - **Counts are words** (U13, `lib/quietLines`): the card's new streets are a
    clause in its line ("your first time down Elm Street", "3 streets new to
    you"), from `ReplayData.newStreets` (visited named keys not walked
    before); the fog beat says the same, or "Familiar ground". The low names
    one or two places, else "a few places" (`passedPlaces`, `passedLine`).
    The walks list row is date, distance, time and captures (`walkRowMeta`).
    No accent colour or large number on the card; the e2e scans for both.
  - The first replay's card has a quiet "Not now" (U14): unnamed, to
    Chronicle. Re-watches keep Done.
  - **Every way out of the first replay ends on Chronicle** (audit 6). Android
    back is a `BackHandler`. The browser's back can't be stopped cheaply: it
    restores the stack saved with the earlier history entry (expo-router 58's
    `restoreNavigationFromBrowser`), so the replay, on unmount, moves to
    Chronicle unless its own buttons (`toChronicle`) already did.
    `usePreventRemove` would block it, but it also adds a `beforeunload`
    prompt on web, so a reload mid-replay would ask "Leave site?".
  - Chronicle's fits are capped at z15 (U15, `FIT_MAX_ZOOM`). Native widens
    the bounds instead (`capFitBounds`), for every fit (default z17, as web).
  - **Traps:** Ionicons draw a private-use glyph, so the e2e compares glyphs
    from the font's glyph map (`glyph('pause')`, `iconOf` for messages); the
    text looks empty when printed. The web map writes `data-zoom` straight to
    the DOM on camera moves, for the e2e (never a render).
  - **Native** (unverified on a device): the replay's `BackHandler`,
    `capFitBounds` on MapLibre RN's fitBounds.

## The home map

- **The home map is taken down while the home isn't focused** (a walk, a
  replay: `useIsFocused`), so a phone's browser holds one live map, not two
  (the owner's go-ahead, Nov 1, after the research ranked it third).
  - It comes back where it was. `onCameraChange` saves the canvas's own
    middle, never `getCenter()`, which is the padded centre a fit leaves
    behind.
  - A map applies a fit only when `fitKey` changes after it mounted, so a
    map brought back doesn't refit.
  - The e2e checks there is one canvas during a walk.

## The sheet

- **The sheet** has three heights (peek, half, full).
  - The handle and header both drag it, with
    `onResponderTerminationRequest: false` and a settle on terminate, so a
    mouse drag never leaves it stuck halfway.
  - Back (Android) and Escape (web) lower it.
  - A screen may refuse a height (`onSize`; Navigate holds the peek with a
    walk open). A drag let go then settles back where the screen holds it;
    it was once left tall and empty where the finger let go (Nov 2).

## Navigate's settings are a dialog (the owner's call, Nov 3)

- The drawer no longer pulls up through half and full heights (the settings were
  split from Start, which was unintuitive). It stays at its peek: Start, and a
  summary line under it (`start-options`, text `peek-choices`: the mode, then
  the destination). A tap on the line, or a pull on the grip, opens
  `StartDialog` (`components/StartDialog.tsx`, `components/Modal`): mode,
  destination, "?" range and what I'm into (Explore only), pocket alert,
  reminders and alerts, in one scroll, with its own Start walk. Every choice
  saves as it changes; Done and Escape only close it. Start still just starts.
  Nothing opens mid-memo or with a walk open.
- The range ring shows on the map only while the dialog is open in Explore.
  A destination is still a long press on the map, so the dialog says to close it
  first. Native (unverified on a device): the Modal over the tab map.
- `drawerTo(pg, 'half' | 'full')` in the e2e opens the dialog; `'peek'`
  closes it with Escape.
- **Distances in km or miles** (QL13–QL16, Nov 3): `lib/units.ts` is a pure module
  store (`getUnits`, `setUnits`, `onUnits`; the default from the device locale, miles
  for US, GB, LR, MM); `lib/unitsStore.ts` loads it from meta `units` at launch
  (`_layout.tsx`) and saves it; `useUnits()` subscribes a component. `formatDistance`
  reads the store, so every formatter follows; a component that stays mounted across a
  change (the recording bar, a walks list row, the maps' scale bar) calls `useUnits()`
  so it redraws. The setting is the Start dialog's "Distances" segment (`units-km`,
  `units-mi`). The e2e's headless Chromium reports en-US, so the default there is
  miles: the `qol` scenario reads the locale and forces km before its metre checks.
