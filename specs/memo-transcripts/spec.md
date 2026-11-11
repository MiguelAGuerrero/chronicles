<!-- Repo first: written from the owner's request in a session (Nov 10-11), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Memo transcripts: a voice memo's words, read on the phone

Nov 11, 2026 · @Miguel Guerrero

A voice memo is a moment you can play but not search, and it joins no thread: Memories reads a note's text and a photo's caption, and a memo has no words (decision 0098, `docs/DEFERRED.md`). This slice reads a memo's words **on the phone**, with an offline model that is **not in the app**: it is fetched once, on a tap, kept in the cache, loaded only while a memo is being read, and let go again.

The seam is built: `ResurfaceOptions.transcript` and `transcriptExtractor` (`src/lib/resurface/`). What is missing is the transcriber, the place its words are kept, the model, and the one switch that asks for it.

## Vision

Idea: Transcribe voice memos on the device with an offline model, so a memo's words join threads and resurfacing the way notes and captions already do.
Verb: return (a memo gets its words, so it can come back with its thread; Honour is served second-hand: the moment arrives with more of what you said).
Touches: Open question 2 ("Searchable voice memos need on-device transcription, a phone-only feature: acceptable?"), answered by the owner, Nov 11: an offline model. Never "Data leaving the device without a tap" (0005): the only thing that crosses the network is the model file, on a tap, and nothing of the owner's goes the other way. Never "Writing the owner's words for them": a transcript is the owner's own speech read back, kept apart from the memo, never edited, never a title or a summary. Always "Moments and the trace are truth": the audio is the moment, a transcript is derived and recomputed. Always "A moment carries its context": the words are shown with their moment, never as a snippet. Always "Counts are words" (0052): no progress number. Precedents 0098 (memos join threads once something transcribes them), 0107 (storage in words), 0104 (threads follow the moments).
Verdict: aligned if reshaped
Shape: A switch in the walk settings, off, "Transcribe memos on this phone". On, it says in words what comes down and how big, and asks. The model is one pinned file on the chronicles-data host. Transcripts are a cache with the model's tag, shown under their memo in its moment, and joined to threads and resurfacing through the existing seam. Phones only. No count, no progress bar, no search screen of its own.
Criteria: MX1-MX24 below carry the Never and Always lines above.
Open: none left from the gate; the plan's three open questions (the model's host path, the walk-settings row, the copy) are the owner's to settle with the plan.

## Decisions (the owner's calls, Nov 10-11)

- **An offline model**, not the OS recognizer, so nothing can fall back to a cloud (Nov 11).
- **Not in the bundle, loaded on demand, not held in memory**: downloaded after a tap, kept as a cache file, loaded for a run and released after it (Nov 11).
- **English only**, so the `.en` models (Nov 11).
- **Quantized `base.en`** for the first slice; about 60 MB, from memory, to be measured against the real file (Nov 11).
- **Hosted in the chronicles-data repo**, pinned by URL and checksum, so the app never depends on a third party's layout (Nov 11).
- **Quietly after saving**, with no progress screen, while the app is open, and never while a walk is recording (Nov 11).
- **Memo audio stays AAC.** A small local native module decodes a memo to 16 kHz mono PCM for a run, like `modules/chronicles-video-edit`; recording and stored files do not change, so memos already kept are read too (Nov 11).
- **Transcripts are a `transcript` table keyed by the piece's id**, with the engine, the model's tag and the time, so a model change reads as stale and deleting a moment takes its words with it (Nov 11).
- Library: `whisper.rn`, from the owner's "offline model" and the recommendation in this session (Nov 11); recorded as decision 0127.

## Criteria

### The words

1. **MX1** A memo with a transcript shows its words under the memo in the moment's viewer, as the model heard them (whitespace trimmed, nothing rewritten), with the moment's place, time and walk as for any moment. The words are labelled as read by the phone, in words, so they are never mistaken for the owner's own note. The same label sits wherever the words appear (MX8).
2. **MX2** A memo without a transcript shows and plays exactly as before. A missing transcript is not an error, not a count and not a state: no icon, no "pending".
3. **MX3** The app never writes anything from a transcript: no title, no summary, no caption, and never over a note or the memo's own fields. A transcript is read, never edited in the app.
4. **MX4** A transcript is stored in the `transcript` table by piece id with the engine, the model's tag and the time it was made; the memo's audio and its row are never altered by it.
5. **MX5** A transcript made by another model's tag is stale: the memo is read again with the installed model and the new words replace the old in one write. A stale transcript is still shown until the new one is stored.
6. **MX6** A transcript is derived data: the same audio and model give the same words, and nothing else (a note, a thread) ever depends on it being stored.

### Threads and resurfacing

7. **MX7** A memo's transcript is the memo's `words` in `ResurfaceOptions.transcript`: a memo joins threads and resurfaces as a note does (weight 0.8, the extractor as it is), and the note and caption extractors are unchanged. A thread's term from a transcript is shown as a suggestion, as for notes (0098), and Rename, Less like this and Not this one work as before.
8. **MX8** A resurfaced or threaded memo leads with its transcript's words and keeps its play button, its place and its time, as a note leads with its text (RM5), with the label of MX1 set apart from a note's text, on the card, the thread row and the viewer alike. A memo with no transcript is shown as before.
9. **MX9** A memo is never listed or found as a bare transcript snippet: wherever its words appear, so do its place and when it was.

### The model on the phone

10. **MX10** The switch is off by default and is a row in the walk settings, **Transcribe memos on this phone**, with a screen reader label. It is absent on the web. No control is added to the capture stack or the viewer's toolbar.
11. **MX11** Turning it on says in words what will come down and its size, the size written in words ("about sixty megabytes"), and offers **Download** and **Not now**. Nothing is fetched before the Download tap, and Not now leaves the switch off. The Download tap is the only way a fetch starts: a launch, a run, a retry or a system-removed model never starts one.
12. **MX12** The model is fetched from one pinned URL and checked against a pinned SHA-256 before it is used. It is written to a temporary file and moved into place only when whole and correct; a wrong or partial file is deleted and said in words ("Couldn't get it. Try again."), and the switch stays off.
13. **MX13** The model lives in the cache directory, never in the bundle or the document directory. Its path is resolved when used, never stored. A model the system has removed reads as not installed: memos are untouched, there is no error, and the words for the state ("Not installed", "Not enough room") appear only while the switch is on or its row is open. With the switch off the row shows its sub-line and nothing else.
14. **MX14** If the room left is less than the model needs, nothing is fetched and the owner is told in words, in the way storage awareness says it (0107). No gauge, no number of megabytes left.
15. **MX15** Turning the switch off offers **Remove the model**, only on the owner's own tap on the switch and never prompted by the app: it deletes the file and says the room is back, in words. Transcripts already made stay, and are still shown and still used by threads.

### On demand, and not in memory

16. **MX16** The model is loaded only for a run and released when the queue is empty, when the app goes to the background and on a memory warning. While idle nothing is loaded.
17. **MX17** A run happens only with the switch on, the model installed, the app in the foreground and no walk recording. It takes one memo at a time, oldest unread first, and a capture is never made to wait for it: a memo kept while a run is going is saved at once, nothing is said on the screen, and capture stays one tap away.
18. **MX18** A memo that cannot be read (the decode fails, the model errors) is left as it was, does not stop the queue, and is tried again at the next run, at most twice for a given model. Nothing is said to the owner.
19. **MX19** A memo with no speech stores an empty transcript, so it is not read again at every run, and shows nothing (MX2).
20. **MX20** The local module decodes a memo's file to 16 kHz mono 16-bit PCM for the engine and deletes the temporary PCM when the run is done. The memo file is never changed. `isAvailable()` is false where the module is not linked (web, Expo Go).

### Deleting, the bundle and the vision

21. **MX21** Deleting a moment, a piece, a walk or a walk's media deletes its transcripts in the same transaction, and a delete waiting in Undo hides them as it hides the memo; Undo brings them back with it (0113, 0104).
22. **MX22** Neither the app bundle nor the app binary holds a model: no model file in `assets/` or the bundle, and no `isBundleAsset` use. A check names any file over 1 MB with a model's extension in the shipped assets.
23. **MX23** No count, percentage, progress bar, score or duration of a transcript is shown anywhere in this slice, and nothing of the owner's (audio, words, the fact of a run) leaves the device. `check:vision` lists exactly one new host, the model's, with its reason (a request to it exposes the phone's address, on a tap, and nothing else), and `whisper.rn` and the decode module make no requests. A run never shows or says its progress.

24. **MX24** A transcript's words appear only in the moment's viewer, the resurfaced card and a thread's rows. They never appear in a notification, the share sheet, a reel, a title, a day's lines or a replay's quiet lines.

## Record

Not yet built. See `plan.md`.
