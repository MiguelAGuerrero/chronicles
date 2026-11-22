# Plan: the recording bar keeps a memo and a note (BC1-BC10)

From T11 (`/tend inbox`, Nov 22). Built in the run's worktree; `/tend` reviews and publishes.

Base: `node scripts/tend.js base tabs` reads "lands on a rough base: tabs (a change since its sweep added a screen or a
control (1b4d486))". A warning: the slice builds only its own criteria.

## Files

- `src/lib/recordingBar.ts` (core): `recordingLine` gains `time`, the line's visible words (the time alone, "12 min";
  the paused word stays apart); `numbers` and `label` are unchanged, so the spoken name keeps the distance (BC6).
  `barChevron(width)`: the chevron only at 360 px or wider (BC6; at 360 the line has 74 px beside it, room for
  "< 1 min"). `barSaidOwnLine` is not needed: the words always take their own line (BC10).
- `src/lib/captureBand.ts` (core): `barCamera` keeps its rule and its name; the bar reads it for all three captures
  (BC1). Its comment says so.
- `src/components/RecordingBar.tsx` (view): the mic (`bar-voice`) and the pencil (`bar-note`) after the camera; the memo
  state (`bar-voice-timer` in the line, `bar-voice-discard` in the camera's place, `bar-voice-save` in the mic's, an
  empty 44 pt place for the pencil); `NewNotePage` in the app's `Modal` (`bar-note-page` is the page's own id); the
  discarded pill (`bar-voice-undo`) above the bar on the page's ground, in flow; the said words on a row of their own
  above the buttons (`recording-said`, the id kept); the line's tap mid-memo saves first, then returns; a path change
  mid-memo (another tab, Memories) saves it; a web reload mid-memo warns (`beforeunload`, as Navigate's row does).
- Tests: `src/lib/__tests__/tabs/barCaptures.test.ts` (new); the journey `scripts/e2e/journeys/barcaptures.js` (new,
  in `scripts/features.js`'s `tabs` journeys). Updated to the approved look: `tabs/minimize.test.ts`'s wiring regex
  (audit 57) reads `line(now).time`; `launch.js`'s audit 55 and 57 checks read the time alone drawn whole and the
  distance in the line's spoken name.

No new truth, cache, migration or dependency. No navigation change: the walk screen is not opened by the mic or the
pencil; the line's way back is `showWalk()` as today.

## Tests per criterion

| Id | Test |
|---|---|
| BC1 | journey `barcaptures`: on Explore and Chronicle's Walks the bar holds `bar-photo`, `bar-voice`, `bar-note`, `bar-stop` in that order, each 44 px, named; on Memories none of the three. Unit: `BC1: the bar's captures show on every tab but Memories` (`barCamera`) |
| BC2 | journey: the mic on Explore shows `bar-voice-timer` with a red dot, Discard where the camera was, Save where the mic was, Stop unmoved; Save keeps a voice moment in the open walk; the URL is never `/walk`; a save at once says "Too short, not kept" |
| BC3 | journey: a memo recording, Chronicle's tab tapped: the memo is in the walk; a memo recording, the line tapped: the memo is in the walk and the walk screen opens; a hold on Stop mid-memo says "A voice memo is recording. Save it first." and the walk goes on |
| BC4 | journey: the pencil opens the note's page over Explore (URL not `/walk`); words and Done keep a note in the walk; opened and left empty, nothing is kept |
| BC5 | journey: the walk paused (on the walk screen) and minimized, a memo and a note from the bar join the walk |
| BC6 | unit: `BC6: the line's words are the time alone`, `BC6: the chevron only from 360 px`; journey: at 320 and 390 the dot, time, camera, mic, pencil and Stop share one row, the time whole, the chevron absent at 320 and present at 390, the spoken name holding the distance |
| BC7 | journey: after a memo and a note are kept, the bar shows no said words, no toast, no count; no accent colour in the bar's computed colours |
| BC8 | journey: from Explore and from Chronicle's Walks, the photo, the memo and the note are each one tap from the bar and each kept in the open walk, the URL never `/walk` (E-tabs-9's check) |
| BC9 | journey: Discard shows `bar-voice-undo` ("Voice memo discarded", Undo) above the bar, its box clear of the bar's; Undo keeps the memo in the walk |
| BC10 | journey: a tap on Stop at 320 shows "Hold to stop" on a row above the buttons, whole, the buttons where they were; the refusal under a memo reads whole on its row |

## The testing's size

**Flow** (`docs/TESTING.md`): a screen changes. Journeys: `barcaptures` (new, alone until green), then `tabs`,
`capturehome` and `launch` (they read the bar's line and boxes), and `unsaved` (the bar's said words). Grep for the
removed visible distance: `launch.js` (audit 55, 57); none other reads `recording-numbers`' words.

## Deferred

- T48's Undo that stays with Close: the bar's pill follows the walk screen's five seconds until T48 builds both.
- T44's camera kept mid-memo: the bar follows its drawing (Discard in the camera's place), as the walk screen does today.

## Native paths not run on a device

The bar's memo on a phone (expo-audio recording from a tab, the audio session while the tabs are in front), the note's
page in its Modal over the tabs, and the memo saved as the bar's tab changes: items in `docs/NATIVE_UNVERIFIED.md`.

## Cost

One more `useCaptures` consumer already exists (the bar); the recorder hook (`useAudioRecorder`) is created by it today.
The memo timer ticks in its own `Ticking`, so only it re-renders each second; the bar re-renders on the memo's start
and stop. Nothing per fix beyond today. Harness: none (device only for the audio session).

## Actions (screen: the recording bar, over Explore and Chronicle's sections)

| Goal | How often, where | Control | Matrix |
|---|---|---|---|
| Say something about what is in front of you without opening the walk | now and then, on foot, the phone in hand on another tab | the mic, 44 pt, beside the camera | row 1 (capture: a visible button, one tap) |
| Write a line about it | now and then | the pencil, opens the note's page | row 1 |
| Keep or throw away the memo | every memo | Stop and save (purple) and Discard in place, Undo pill after | rows 7, 20 (act and offer Undo; no confirmation of success) |
| Back to the walk | often | the line (its chevron from 360 px) | row 23 |

Adjacent apps: Voice Memos records in place with one button and keeps the recording as it goes; Apple Journal puts
three kinds side by side. **Against precedent:** none departs; Voice Memos has no Discard while recording (its delete
comes after), ours keeps the walk screen's Discard with Undo, the same job on two screens alike (`ui-patterns.md`,
siblings).

**Where the owner will look first:** at the foot of the tab, on the bar, beside the camera they already use there; they
see a microphone and a pencil. **Defaults that make a control quieter:** none: the mic and the pencil are the camera's
size and ink; the chevron's absence at 320 px is the owner's call.
