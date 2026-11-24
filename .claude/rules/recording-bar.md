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
    19: the stop's replay would close it). The line keeps its time (the distance in its spoken name since T11); paused it reads "1 min · Paused"
    (numbers first, so a cut at 320 px takes the word). `tabsHidden`'s `barOfferUp` is set by nothing since; its readers
    (Explore's press hint, the storage notice's sight) wait to be removed (`docs/DEFERRED.md`).
  - **The bar keeps a memo and a note** (T11, `specs/recording-bar-captures`, BC1-BC10): `bar-voice` and `bar-note` after
    `bar-photo`, all three hidden on Memories (`barCaptures` in `lib/captureBand`). The memo is the bar's own
    `useCaptures`: mid-memo the line is `bar-voice-timer` (no chevron), Discard (`bar-voice-discard`) and Save
    (`bar-voice-save`) take the camera's and the mic's places, the pencil's place is an empty 44 pt slot so Stop never
    moves. The bar is one instance in the tabs' layout, so a change of tab does not unmount it: a change of path or of
    Chronicle's section saves the memo by an effect (`where`); a screen over the tabs unmounts the bar, and
    `useCaptures` saves it then; `back()` saves it before the walk screen opens. Its words (`recording-said`) stand on
    a row of their own above the buttons; the discarded memo's pill (`bar-voice-undo`) sits above the bar on the page's
    ground. The line draws `recordingLine(...).time` (the time alone), its label the distance; `barChevron(width, memo)`
    hides the chevron below 360 px. Its buttons are `BarRound`, a component: a `round()` helper called in render
    tripped the React Compiler's ref rule on `photo` (it reads refs).
  - **Paused, the line draws no word** (`tend tabs T59`, the owner's Paused390, Nov 22): the pause glyph
    (`recording-paused`) and the time alone, then the chevron; "Walk paused" is in the line's spoken name. There is no
    `recording-word` and `recordingLine` has no `word`; where a line above quotes "1 min · Paused", it predates T59.
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
- **Mid-memo the bar's camera keeps its place** (`tend tabs T60`, decision 0261, the T44 shape amending BC2; this line, not
  "Discard (`bar-voice-discard`) and Save (`bar-voice-save`) take the camera's and the mic's places" above, says what
  ships): `bar-photo` stays (spoken "Add a photo to this memo"; photos only; off while the memo is being saved), Save in
  the mic's place, the pencil's slot empty; Discard, a 44 pt `BarRound` (react-native-web has no `hitSlop`), sits before
  the line, outside its button. A photo taken then follows the memo in `useCaptures` (`photoMidMemo`, `memoJoins`, the
  walk screen's path); its editor waits while the memo records (`editing` is null) and is let go (`editAfter.close()`)
  when `back()` saves the memo or `leaveMemo` saves it as the captures leave sight, so it never opens on another tab or
  over a card or Modal; a photo still being saved then opens none once kept either (`leftMemo`, the memo the leave saved,
  matched by its start; `tend tabs audit 68`). Below 360 px the memo's dot goes and the line's padding is 4 a side (`barMemoLine`): at 320 px
  the line has 54 px for "59:59". Not run on a device.
