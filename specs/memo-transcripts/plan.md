# Plan: memo transcripts

Spec: `specs/memo-transcripts/spec.md` (TX1-TX12). Read this, then say go (or what to change). No code has been written.

## Shape

```
memo kept (useCaptures) ──┐
app open (backfill) ──────┤──► needsTranscript(captures, rows)   core, pure
                          │            │
                          │     createTranscripts(ports)           shell: one at a time, never throws
                          │       ports: db (transcript rows), engine, files (resolveMedia)
                          │            │
                          │     engine adapter (native: expo-speech-recognition, file source,
                          │                      requiresOnDeviceRecognition; web: unavailable)
                          ▼            ▼
              transcript store ──► useTranscript(captureId) ──► caption under the memo (viewer, journal line)
                             └──► ResurfaceOptions.transcript ──► wordsOf ──► threads and search
```

## Files

- **core** `src/lib/transcript/core.ts` (`// @layer core`): `needsTranscript`, `transcriptCaption`, the row type. No clock or randomness.
- **shell** `src/lib/transcript/shell.ts` (`createTranscripts(ports)`; the app instance in `transcript/index.ts`): the queue, one memo at a time, a failure recorded and the next memo read; a refused permission remembered in meta `transcript_off`; a `store` views read.
- **adapter** `src/lib/transcript/engine.native.ts` (wraps `expo-speech-recognition`: `audioSource.uri`, `requiresOnDeviceRecognition: true`, `addsPunctuation`, `interimResults: false`, `lang` from the device locale, final result only); `engine.web.ts` returns unavailable; `engine.ts` is the type.
- **view** `src/lib/useTranscript.ts` and `src/components/MemoTranscript.tsx`: the caption. Placed under `VoicePlayer` in `CaptureView.tsx`, and under the bar in `components/journal/MemoLine.tsx`.
- **hooks into existing code:** `useCaptures.ts` calls `transcripts.enqueue(piece)` after a memo is stored (never awaited); the app's start calls `transcripts.backfill()`; `resurface/index` passes `transcript: transcripts.words`; `deleteMoments` and `deleteWalk` take the rows.
- **config:** `expo-speech-recognition` through `EXPO_OFFLINE=1 npx expo install`; its config plugin in `app.json` with the speech and microphone usage strings (words in the app's voice, nothing about sending anywhere).

## Data

New **cache** (derived from the audio, never truth): table `transcript` (`capture_id` PK, `text` TEXT NOT NULL ('' for none heard), `lang`, `made_at`). SQLite migration 28 (27 exist); IndexedDB VERSION 21 with an `oldVersion < 21` step; the third store is the in-memory fake. `dbContract` covers all three. Never edit an earlier migration. A trim does not change it (open question).

## Tests (name = criterion id)

| Criteria | File |
|---|---|
| TX11 | `src/lib/__tests__/transcript/core.test.ts` (new feature `transcript`, a row in `scripts/features.js`) |
| TX1, TX2, TX4, TX5, TX6 | `.../transcript/shell.test.ts` over `fakePorts()` and a fake engine (order, one at a time, failure then next, refusal remembered, `requiresOnDeviceRecognition` on every request, unavailable engine silent) |
| TX3, TX12 | `.../storage/transcript.test.ts` (`dbContract` for the three stores, migration from 27, delete with the memo, moment and walk) |
| TX10 | `.../resurface/threads.test.ts` and `views.test.ts` (a memo with a transcript gives a signal and `words`; `THREAD_RULES` bumped) |
| TX7, TX8, TX9 | the `voicetrim` and `journal` journeys, each with a seeded transcript row: caption shown, nothing shown when absent or empty, no digits that are not the memo's length |

TX7's "appears in place when ready" needs the shell to push; the journey seeds a row after load. The engine itself (TX5 on a phone, the real recognizer, the locale pack, permission) is `UNTESTED` as `device:` with `NATIVE_UNVERIFIED` items.

## Screens: one line per action

- **See a memo's words** (goal: remember what I said, or find it later; every memo, passively): no control, a caption under the player in the secondary text colour, selectable text. Matrix row: read-only metadata under media; precedent: a photo's caption under the picture. No button, no menu, no copy affordance beyond text selection.

## Deferred, and why

Trim-aware transcripts (owner's question); editing; the replay bubble; several languages; a "re-read" action. Android before 13. Retired by none.

## Native, not run on a device

The whole engine adapter, the permission flow and the on-device locale pack on both platforms. Added to `docs/NATIVE_UNVERIFIED.md`: record a memo on iOS and on Android 13+ and see its words arrive; airplane mode; a locale without a pack.

## Steward's findings (Nov 13), triaged

- **S1** (a transcript reads the whole file) accepted as TX13. How the span is cut is the owner's call (spec, "Owner's calls still open"); the plan assumes the recommended way: word timestamps, whole-file read, words outside `voiceSpan` dropped, row stale on a trim change (the row keeps the timestamps with each word).
- **S2** (machine words shown as heard) accepted as TX14; no snippet on a search hit.
- **S3** (prompt and backfill interrupting capture) accepted as TX15; the shell reads `nowPlaying`, the walk's recording state and `memoGate` through ports, and asks for permission only from the first memo kept in the session on a quiet moment.
- **S4** (on-device asserted by a flag) accepted as TX16.
- **S5** (threads reshuffle) accepted as TX17.
- **S6** (usage strings) accepted as TX18.
- Silent items: a foreign-language memo is left unread; a wrong or private transcript has no remedy but deleting the memo (deferred, owner's call); suggested titles from transcripts are not proposed.
- Data: the `transcript` row also keeps `words` as JSON with start and end times, so TX13 can cut to the span without a re-read.
