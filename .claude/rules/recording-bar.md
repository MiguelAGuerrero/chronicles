---
paths:
  - "src/components/RecordingBar.tsx"
  - "src/lib/{recordingBar,walkGate,walkNav,tabsHidden,memoGate}.ts"
  - "src/lib/__tests__/tabs/{barEditOffer,barWayBack}.test.ts"
---
# The recording bar (the way to the walk screen and the bar's ›, its Edit offer, its reminder, its Stop)

## After the audit

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
  - A third, since `tend tabs 12`: a stop from the bar under way (`barStop`, any bar of the walk), at most `BAR_STOP_HOLD_MS`
    (audits 26, 28). A tap refused by a stop that is itself refused is dropped, no word; a second tap works (audit F4).
  - **The bar's Edit offer waits** (T12, decision 0149; ME23's six seconds stay on the walk screen and Navigate's ready
    screen): after the bar's photo, a pill above the bar (`bar-edit-offer`, the Undo pill's look on the page's ground,
    in flow so it covers no screen's controls) says "Photo saved to your walk" with Edit (`capture-edit`) and ✕
    (`bar-edit-offer-close`), until Edit, ✕ or the next capture of the walk from any path (`captureBus`; Memories'
    band too); its photo deleted or waiting on Undo (`deletions`), a failed bar photo and the walk stopping end it
    too. Paused, the line reads "0:05 · 18 m · Paused" (numbers first, so a cut at 320 px takes the word). The line keeps its time and distance; the words, the spoken line and the rule are `barOffer*` in
    `lib/recordingBar`. The offer is the bar's own state, and the bar unmounts whenever the tabs lose focus, so
    returning to the walk or opening any screen over the tabs (a day, a replay) ends it too; Edit stays in the
    photo's viewer. No store keeps the offer (the coordinator's ruling on the review's F2); `tabsHidden`'s `barOfferUp` only
    mirrors whether the pill is drawn, cleared on unmount, for what must step aside for it (Explore's press hint, `tend tabs T36`). At 320 px the
    pill fits one line with 8 px to spare in the e2e's font: its measures are tighter than Undo's at the sides.
  - **The bar has its own Stop** (`bar-stop`, held as on the walk screen; a
    tap says to hold), beside its camera: a way out even when the walk screen
    can't be reached (the owner's quick fix, Nov 2). It refuses under a memo
    (`memoGate`), waits at most 5 s for the bar's photo, then `stopWalk` and
    the replay.
  - **The bar's reminder is never lost with the bar** (audits 23-27): `.claude/rules/explore-marks.md`, "Remind me here".
- **The bar's Stop warns of what is held** (unsaved captures UN5-UN8): after waiting for the memo and the photo,
  it reads `unsaved.heldFor(walk.id)`, says `barWarning` in its line (no Retry on the bar; two lines at most at
  320 px, nothing cut) and goes on; the second hold lets the walk's held captures go. Its camera's failure says its
  Retry is on the walk screen (`retryShown: false`, UN10). `HoldButton` empties its fill when let go, a fired hold
  too (UN7): a refused hold's true-to-false busy can batch into no render.
