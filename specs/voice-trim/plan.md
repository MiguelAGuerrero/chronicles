# Voice trim: plan

## Files

- `src/lib/voiceTrim.ts` (core, new): `voiceSpan(trim, durationMs)`, `voiceClock(posS, span)`, `voiceState(posS, span)` (`before` | `inside` | `end`). Pure; no player.
- `src/lib/editSession.ts` (core): kind `'photo' | 'video' | 'voice'`; `TOOLS.voice = ['trim']`; `openSession` opens a voice memo on Trim; the `trim` event now accepts `voice`. Revert, close and changed are unchanged.
- `src/components/edit/MediaEditor.tsx`: a voice variant, no stage picture. A card with the play button and the shared `TrimBar`, on `useAudioPlayer(uri, { updateInterval: 100 })`; the preview pauses at the end handle (as the video's does). Done saves `{ edit }`, no thumbnail.
- `src/components/CaptureView.tsx`: Edit offered for `voice` (line ~609); `VoicePlayer` takes `edit`, starts at the start, finishes at the end, clock and bar against the kept length (`voiceState`); updates `useAudioPlayer`'s `updateInterval` to 100 ms only while a trim is set.
- `src/components/ceremony/Bubbles.tsx`: reads the same trim if it plays a memo (checked while building).
- Docs: `docs/PRODUCT.md`, `.claude/rules/captures-and-media.md` (voice memos), `docs/decisions/` only if the owner changes a call, `docs/ARCHITECTURE.md` codemap, `docs/STATUS.md`, `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md`.
- `scripts/features.js`: `voice-trim` in `IN_PROGRESS`; spec added to the captures feature's `specs`; `src/lib/voiceTrim.ts` to its `source`.

## Data

No new schema. `Capture.edit` (SQLite column `edit`, JSON; IndexedDB whole record) already holds `trim`; a memo stores `{ v:1, rotate:0, crop:null, filter:'original', strokes:[], trim }` and `parseEdit` keeps a trim alone. No migration, no `VERSION` bump. Truth: the recording and its edit; nothing derived.

## Tests per criterion

| Id | Where | Name |
|---|---|---|
| VT1 | `scripts/e2e/journeys/edit.js` | check "VT1: a voice memo's viewer offers Edit, opening a trim-only editor" |
| VT2 | `captures/editSession.test.ts` (clamp, whole memo kept, under a second keeps all); journey checks the bar and label | "VT2: ..." |
| VT3 | journey (play button present; preview pauses at the end) | "VT3: ..." |
| VT4 | `captures/editSession.test.ts` | "VT4: done saves the trim; close asks; revert clears it" |
| VT5 | `captures/editSession.test.ts` (full trim stored as none), `captures/mediaEdit.test.ts` (a voice edit round-trips parse/serialize) | "VT5: ..." |
| VT6 | `captures/voiceTrim.test.ts` | "VT6: ..." (span, clock, state) |
| VT7 | journey: replay over a trimmed memo | "VT7: ..." |
| VT8 | `captures/voiceTrim.test.ts` | "VT8: ..." |
| VT9 | `captures/editSession.test.ts` (photo and video tools unchanged) | "VT9: ..." |

No new feature folder. The e2e needs a fake memo; the edit journey already seeds captures, and I will check how it seeds a voice file (a short generated WAV) before writing the check.

## Screens: one line per action

- **Edit on a voice memo** (viewer toolbar): the goal is "tidy this memo after the fact", occasional, on a moment that exists; control: the toolbar's Edit button, matrix 3 / decision 0114 (an action on an existing moment lives in its toolbar); precedent: photos and videos here.
- **Trim handles** (editor): the goal is "cut the tail", a few drags per memo; control: a two-handle range bar, as the video trim (ME14) and Photos' video trimmer.
- **Play kept part** (editor): "hear what I'm keeping", every edit; a labelled button, as the video trim's.
- **Revert / Done / Close**: as the editor's today.
No control the matrix says to avoid.

## Deferred

- The memo's length shown as the kept length in lists and cards (`MomentCard`, bubbles); they show the original length until a later change.
- Automatic silence detection (the app proposing the cut).
- A waveform along the bar (the video trim shows no frames either).
- A trim offered right after recording.
- Exporting or saving a memo out (there is none today).

## Native paths that will not run on a device

`expo-audio` seeking and the 100 ms status updates for a trimmed memo, on iOS and Android; the preview pausing at the end handle; a replay moving on at a trim's end. Each goes in `docs/NATIVE_UNVERIFIED.md`. VT7's replay advance on a phone is device-only.
