<!-- Repo first: written from the owner's request in a session (Nov 13), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Memo transcripts: a voice memo's words, ready when they are

Nov 13, 2026 · @Miguel Guerrero

A voice memo has no words today, so it cannot join a thread or be found by search (`docs/DEFERRED.md`, "Memo transcripts"; VISION.md open question 2). This slice reads each memo's words on the phone, in the background, and shows them as a caption under the voice note once they are ready. The seam is already built (`ResurfaceOptions.transcript`, `transcriptExtractor`); this builds the transcriber and the caption.

## Vision

Idea: "The transcripts for the voice memos should appear in Chronicles: made in the background, on the phone, and shown like a caption under the voice note when ready."
Verb: return (a memo becomes findable and joins threads; the moment comes back with its words).
Touches: Always "A moment carries its context" and "Moments and the trace are truth; streets, areas and summaries are recomputed": the transcript is derived, so it is a cache beside the memo, never written into the memo. Never "Writing the owner's words for them": a transcript is the engine's reading of the owner's own voice, not words supplied; it is shown as a caption, never in place of a note or caption the owner wrote, and the audio stays the memo. Never "Data leaving the device without a tap": on-device recognition only, with no network fallback (0005). Never "Scores, counts": no confidence, no tally of memos transcribed. Always "Restraint": nothing shows while it is pending. Decision 0098 (memos join threads once transcribed). VISION.md open question 2 (phone-only, on-device transcription) is answered by the owner's go-ahead on Nov 13.
Verdict: aligned if reshaped
Shape: derived words kept in their own table, shown quietly as a caption under the memo only when ready, on phones only.
Criteria: TX3 (a cache, never the memo's own fields), TX5 (on-device only, no network fallback), TX6 (nothing shown while pending, no counts, no confidence), TX9 (never replaces the owner's own words).
Open: how a trimmed memo's transcript is limited to the kept part (see the owner's call below).

## Decisions (the owner's calls, Nov 13)

- **On-device only**, through `expo-speech-recognition`, an Expo config-plugin module (v58 for SDK 58) using the phone's recognizer with `requiresOnDeviceRecognition`. Expo's own SDK has no speech-to-text (`expo-speech` is text-to-speech).
- **In the background, not immediate.** A memo is kept first and as before; its words arrive when ready, with no waiting and no spinner.
- **Shown like a caption under the voice note.**
- **Phone only.** No web transcripts.

## Criteria

Making them

1. **TX1** A kept voice memo with no transcript is queued, and its words are read in the background, one memo at a time, after the memo is saved. Saving, playing and the Undo window are unchanged and never wait on it.
2. **TX2** Memos kept before this slice are read too, the same way, newest first, only while the app is open; none is read twice.
3. **TX3** A transcript is derived data in its own store (`transcript`: `capture_id`, `text`, `lang`, `from_ms`, `to_ms`, `made_at`), never written into the memo's `body`, `caption` or `edit`. Deleting a memo, its moment or its walk deletes its transcript with it. Recomputing never touches the recording.
4. **TX4** One failure never blocks the next memo or the app: an engine error, a memo with no speech, a missing file. A memo that gave no words is recorded as read, so it is not read again at every open.
5. **TX5** Recognition is on the device only: every request sets `requiresOnDeviceRecognition`, and where the phone has no on-device recognizer or the locale's pack is missing, the memo is left unread and nothing is sent anywhere. A test fails if a request is made without it.
6. **TX6** Where there is no engine (the web, an unsupported phone, permission refused), nothing happens and nothing is said: no error, banner or prompt after a refusal, and the memo is as it is today. A refusal is remembered, so it is not asked again.

Showing them

7. **TX7** When a memo's transcript is ready, the viewer shows it under the player as a caption (`testID` `memo-transcript`): the words as heard, secondary in tone, in the language they were spoken. It appears in place when it becomes ready, with the viewer open.
8. **TX8** The journal's in-line voice note shows the same words under its bar, and the replay's bubble does not (deferred).
9. **TX9** While a transcript is pending, absent or empty, nothing is shown: no spinner, "transcribing" copy, placeholder or empty caption. No confidence, no count of memos transcribed or waiting appears anywhere; the words are never in a place where a note or caption the owner wrote would be, and never replace them.

Using them

10. **TX10** A memo's transcript is its `words` for Chronicle: `wordsOf` returns it, so the memo joins threads through `transcriptExtractor` and the moment picker's search finds it. The thread rules (`THREAD_RULES`) are bumped, since memos now add signals.
11. **TX11** `transcriptCaption` (trim, collapse whitespace, no empty string) and `needsTranscript` (which kept memos have no row, and have not been given up on) in `lib/transcript/core.ts` are pure and unit-tested.

Storage

12. **TX12** SQLite migration 28 and IndexedDB version 21 add the store; `dbContract` runs against all three stores; an older database opens and keeps every capture.

Found by the steward (Nov 13), accepted

13. **TX13** A trimmed memo is read from an in-memory copy of its kept span (`voiceSpan`), cut for the recognizer, never kept beside the memo and deleted once read; an untrimmed memo is read from its file. A word spoken in a trimmed-off part is therefore neither in the caption nor in `wordsOf`. The row records the span it was read from; changing, saving or reverting `edit.trim` makes it stale and the memo is read again. A test seeds a trimmed memo and asserts the engine is given the cut copy, never the file, and that the copy is deleted after.
14. **TX14** The caption is plainly the phone's reading: it carries an accessibility label "Read by your phone" and is not styled like a note or a caption the owner wrote. It is not editable in place, and a wrong word is part of the memo (the owner, Nov 13): no edit or hide. A search hit on a transcript shows the moment's normal card, with no snippet or highlight of the transcript.
15. **TX15** The speech permission is never requested during a walk, while recording, or before a memo has been kept in this session. The queue does not run while a walk or a memo is recording, or a memo is playing, and resumes after. A refusal is remembered and the queue stays silent (TX6).
16. **TX16** The adapter asks `supportsOnDeviceRecognition` for the memo's locale before every read and leaves the memo unread when it says no (TX5). The airplane-mode check in `NATIVE_UNVERIFIED` is part of done for the slice. The new dependency's entry in `scripts/vision.allow.json`, if `check:vision` asks for one, states that recognition is on-device only.
17. **TX17** After `THREAD_RULES` is bumped, a thread the owner renamed, removed or marked "Not this one" keeps that state. A test covers it.
18. **TX18** The speech and microphone usage strings are one plain sentence each, naming what happens on the phone, with no urging and no "AI" wording.

## Not in this slice

- Editing or hiding a transcript's words (the owner chose not to, decision 0165).
- A transcript in a language other than the phone's locale: left unread.
- Editing a transcript, and showing it in the replay's bubble.
- Several languages, and Android below 13 (no on-device file recognition).

## Owner's calls (Nov 13, decision 0165)

- A trimmed memo is read from an in-memory copy of its kept part (TX13).
- A wrong or private word is part of the memo: no edit or hide; the provenance label is agreed (TX14).
- **VISION.md open question 2** is answered by this decision; the owner edits the page.
