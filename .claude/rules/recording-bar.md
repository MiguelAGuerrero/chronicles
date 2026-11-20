---
paths:
  - "src/components/RecordingBar.tsx"
  - "src/lib/{recordingBar,walkGate,walkNav,tabsHidden,memoGate}.ts"
  - "src/lib/__tests__/tabs/{barEditOffer,barWayBack}.test.ts"
---
# The recording bar (the way to the walk screen and the bar's ›, the editor after its photo, its reminder, its Stop)

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
  - **The bar's photo opens its editor by itself** (decision 0240, fix edit-after-capture; it superseded 0149's pill, which
    waited above the bar): once kept, `useEditAfterCapture` draws `MediaEditor` as a Modal of its own, on the tab the photo
    was taken from; Close keeps it as taken. Not while the walk is stopping from the bar (`barStopping`, tend tabs audit
    19: the stop's replay would close it). The line keeps its time and distance; paused it reads "0:05 · 18 m · Paused"
    (numbers first, so a cut at 320 px takes the word). `tabsHidden`'s `barOfferUp` is set by nothing since; its readers
    (Explore's press hint, the storage notice's sight) wait to be removed (`docs/DEFERRED.md`).
  - **The bar has its own Stop** (`bar-stop`, held as on the walk screen; a
    tap says to hold), beside its camera: a way out even when the walk screen
    can't be reached (the owner's quick fix, Nov 2). It refuses under a memo
    (`memoGate`), waits at most 5 s for the bar's photo, then `stopWalk` and
    the replay.
  - **The bar's reminder is never lost with the bar** (audits 23-27): `.claude/rules/explore-marks.md`, "Remind me here".
- **The bar's Stop through a memo being saved** (`tend tabs T35`, decision 0227, amending the line above that it
  "refuses under a memo"): after its 5 s wait it asks `memoGate.stopUnder(warned)`. A memo recording with none being
  saved still refuses ("A voice memo is recording. Save it first."); a save still running reads "The voice memo is still
  being saved. Hold Stop again in a moment." once, its numbers kept in `warnedSaves`, and the next hold whose wait ends
  with only those still running goes through them: the memo saves into the ended walk. A save begun since is said
  first. A memo recording on a path with no save of its own refuses on any hold (`stopUnderOf`, `lib/unsaved/stopEnd/core`;
  each save carries its path, `track(p, owner)`; tend tabs audit 44). Undo of a discarded memo is a tracked save too
  (audit 41). Once its waits are over the bar ends through `stopEnd` (`lib/unsaved/stopEnd`), as the walk screen's Stop does
  (audit 42): the held captures read and warned of; else, in the same tick, nothing awaited between, a pin
  (`memoGate.pin`) while anything is under way until `endWalk` has decided the drop, so the walk is never dropped
  mid-save (0187 amended), and `unsaved.ended(walkId, held ids)` lets go only what was warned of: a save failing as the
  walk ends stays held for Retry. The bar's words are announced on iOS when said (audit 45). A failure's or a refusal's
  words (`said.error`) are unclamped, so they stay whole beside the camera at 320 px, where the saving line takes five
  lines (audit 46); three on Memories, where the bar has no camera (audit 48).
- **The bar's Stop warns of what is held** (unsaved captures UN5-UN8): after waiting for the memo and the photo,
  it reads `unsaved.heldFor(walk.id)`, says `barWarning` in its line (no Retry on the bar; two lines at most at
  320 px, nothing cut) and goes on; the second hold lets the walk's held captures go. Its camera's failure says its
  Retry is on the walk screen (`retryShown: false`, UN10). `HoldButton` empties its fill when let go, a fired hold
  too (UN7): a refused hold's true-to-false busy can batch into no render.
