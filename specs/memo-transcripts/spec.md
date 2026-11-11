<!-- Repo first: written from the owner's request in a session (Nov 10-11), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Memo transcripts: a voice memo's words, read on the device

Nov 11, 2026 · @Miguel Guerrero

A voice memo is a moment you can play but not search, and it joins no thread: Memories reads a note's text and a photo's caption, and a memo has no words (decision 0098, `docs/DEFERRED.md`). This slice reads a memo's words **on the device** (the phone, and the web app too), with an offline model that is **not in the app**: it is fetched once, on a tap, kept in the cache, loaded only while a memo is being read, and let go again.

The seam is built: `ResurfaceOptions.transcript` and `transcriptExtractor` (`src/lib/resurface/`). What is missing is the transcriber, the place its words are kept, the model, and the one switch that asks for it.

## Vision

Idea: Transcribe voice memos on the device with an offline model, so a memo's words join threads and resurfacing the way notes and captions already do.
Verb: return (a memo gets its words, so it can come back with its thread; Honour is served second-hand: the moment arrives with more of what you said).
Touches: Open question 2 ("Searchable voice memos need on-device transcription, a phone-only feature: acceptable?"), answered by the owner, Nov 11: an offline model. Never "Data leaving the device without a tap" (0005): the only thing that crosses the network is the model file, on a tap, and nothing of the owner's goes the other way. Never "Writing the owner's words for them": a transcript is the owner's own speech read back, kept apart from the memo, never edited, never a title or a summary. Always "Moments and the trace are truth": the audio is the moment, a transcript is derived and recomputed. Always "A moment carries its context": the words are shown with their moment, never as a snippet. Always "Counts are words" (0052): no progress number. Precedents 0098 (memos join threads once something transcribes them), 0107 (storage in words), 0104 (threads follow the moments).
Verdict: aligned if reshaped
Shape: A switch in the walk settings, off, "Transcribe memos on this phone". On, it says in words what comes down and how big, and asks. The model is one pinned file on the chronicles-data host. Transcripts are a cache with the model's tag, shown under their memo in its moment, and joined to threads and resurfacing through the existing seam. Phones and web. No count, no progress bar, no search screen of its own. The web app does the same with its own engine (the owner, Nov 11).
Criteria: MX1-MX32 below carry the Never and Always lines above.
Open: none left from the gate; the plan's three open questions were settled by the owner, Nov 11 (Pages, the walk settings, "Heard by this phone").

## Decisions (the owner's calls, Nov 10-11)

- **An offline model**, not the OS recognizer, so nothing can fall back to a cloud (Nov 11).
- **Not in the bundle, loaded on demand, not held in memory**: downloaded after a tap, kept as a cache file, loaded for a run and released after it (Nov 11).
- **English only**, so the `.en` models (Nov 11).
- **Quantized `base.en`** for the first slice; about 60 MB, from memory, to be measured against the real file (Nov 11).
- **Hosted in the chronicles-data repo**, pinned by URL and checksum, so the app never depends on a third party's layout (Nov 11). **On its Pages site** (`miguelaguerrero.github.io`, already an allowed host for the places archive, 0103), not a release asset, so the slice adds no host (the owner, Nov 11).
- **The label is "Heard by this phone"**, on the card, the thread row and the viewer alike; the walk settings hold the switch (the owner, Nov 11).
- **Go-ahead:** the owner approved the plan, tests first and then the build, on Nov 11.
- **Quietly after saving**, with no progress screen, while the app is open, and never while a walk is recording (Nov 11).
- **Memo audio stays AAC.** A small local native module decodes a memo to 16 kHz mono PCM for a run, like `modules/chronicles-video-edit`; recording and stored files do not change, so memos already kept are read too (Nov 11).
- **Transcripts are a `transcript` table keyed by the piece's id**, with the engine, the model's tag and the time, so a model change reads as stale and deleting a moment takes its words with it (Nov 11).
- Library on phones: `whisper.rn`, from the owner's "offline model" and the recommendation in this session (Nov 11); recorded as decision 0127.
- **It works on the web too** (the owner, Nov 11): `@huggingface/transformers` with an ONNX Whisper model, single-threaded WebAssembly (GitHub Pages sends no cross-origin isolation headers, so no `SharedArrayBuffer`), in a Web Worker that is terminated after a run. A web exception in `docs/ARCHITECTURE.md`: no Expo module transcribes on web and `whisper.rn` has no web build.
- **The engine is replaceable** (the owner, Nov 11): the app depends on one `Engine` contract, never on a library. `whisper.rn` and `transformers.js` are two adapters behind it, so a more optimized native engine later is one new adapter and one registry line, with no change to the shells, the views, the table or the settings.
- **The web model starts at `tiny.en`**, measured in a real browser before the slice settles on it; the tag names the engine and model, so the size can change later (the owner, Nov 11).

## Criteria

### The words

1. **MX1** A memo with a transcript shows its words under the memo in the moment's viewer, as the model heard them (whitespace trimmed, nothing rewritten), with the moment's place, time and walk as for any moment. The words are labelled as read by the phone, in words, so they are never mistaken for the owner's own note. The label reads "Heard by this phone" and sits wherever the words appear (MX8).
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

10. **MX10** The switch is off by default and is a row in the walk settings, **Transcribe memos on this phone**, with a screen reader label. It is shown on the web too. No control is added to the capture stack or the viewer's toolbar.
11. **MX11** Turning it on says in words what will come down and its size, the size written in words ("about sixty megabytes"), and offers **Download** and **Not now**. Nothing is fetched before the Download tap, and Not now leaves the switch off. The Download tap is the only way a fetch starts: a launch, a run, a retry or a system-removed model never starts one.
12. **MX12** The model is fetched from one pinned URL and checked against a pinned SHA-256 before it is used. It is written to a temporary file and moved into place only when whole and correct; a wrong or partial file is deleted and said in words ("Couldn't get it. Try again."), and the switch stays off.
13. **MX13** The model lives in the cache directory on a phone and in Cache Storage on the web, never in the bundle, the document directory or IndexedDB's records. A phone's path is resolved when used, never stored. A model the system has removed reads as not installed: memos are untouched, there is no error, and the words for the state ("Not installed", "Not enough room") appear only while the switch is on or its row is open. With the switch off the row shows its sub-line and nothing else.
14. **MX14** If the room left is less than the model needs, nothing is fetched and the owner is told in words, in the way storage awareness says it (0107). No gauge, no number of megabytes left.
15. **MX15** Turning the switch off offers **Remove the model**, only on the owner's own tap on the switch and never prompted by the app: it deletes the file and says the room is back, in words. Transcripts already made stay, and are still shown and still used by threads.

### On demand, and not in memory

16. **MX16** The model is loaded only for a run and released when the queue is empty, when the app goes to the background or the page is hidden, and on a memory warning. While idle nothing is loaded: on a phone no context, on the web no Worker and no engine code in memory.
17. **MX17** A run happens only with the switch on, the model installed, the app in the foreground and no walk recording. It takes one memo at a time, oldest unread first, and a capture is never made to wait for it: a memo kept while a run is going is saved at once, nothing is said on the screen, and capture stays one tap away.
18. **MX18** A memo that cannot be read (the decode fails, the model errors) is left as it was, does not stop the queue, and is tried again at the next run, at most twice for a given model. Nothing is said to the owner.
19. **MX19** A memo with no speech stores an empty transcript, so it is not read again at every run, and shows nothing (MX2).
20. **MX20** A memo's audio reaches the engine as 16 kHz mono samples and the memo file is never changed. On a phone the local module decodes the file to 16-bit PCM and deletes the temporary PCM when the run is done, and `isAvailable()` is false where it is not linked (Expo Go). On the web the browser decodes the memo (`decodeAudioData`) and resamples it in memory; nothing is written.

### Deleting, the bundle and the vision

21. **MX21** Deleting a moment, a piece, a walk or a walk's media deletes its transcripts in the same transaction, and a delete waiting in Undo hides them as it hides the memo; Undo brings them back with it (0113, 0104).
22. **MX22** Neither the app bundle nor the app binary holds a model: no model file in `assets/` or the bundle, and no `isBundleAsset` use. A check names any file over 1 MB with a model's extension in the shipped assets. On the web the engine's code is loaded by dynamic import only when a run is due, never in the entry bundle, and its WebAssembly is served from the app's own origin, not a CDN.
23. **MX23** No count, percentage, progress bar, score or duration of a transcript is shown anywhere in this slice, and nothing of the owner's (audio, words, the fact of a run) leaves the device. `check:vision` lists no new host: both platforms' model files come from `miguelaguerrero.github.io`, already allowed, and its reason in `ALLOWED_HOSTS` is extended to name the models (a request to it exposes the device's address, on a tap, and nothing else). `whisper.rn`, the decode module and the web engine make no requests of their own: the web engine's defaults (`huggingface.co` and `cdn.jsdelivr.net`) are switched off, and a web run makes no request to any host but the app's own and the model's. A run never shows or says its progress.

24. **MX24** A transcript's words appear only in the moment's viewer, the resurfaced card and a thread's rows. They never appear in a notification, the share sheet, a reel, a title, a day's lines or a replay's quiet lines.

25. **MX25** On the web the engine runs in a Web Worker, so the page, the capture buttons and a memo's recording are never blocked by a run, and the Worker is terminated when the run ends (MX16).
26. **MX26** The web engine needs no cross-origin isolation: it runs on a page served without COOP and COEP headers (GitHub Pages), single-threaded, with WebGPU used only where the browser offers it and the run falls back to WebAssembly otherwise. It also runs from the sub-path build (`/chronicles`).
27. **MX27** Where the browser cannot run the engine (no WebAssembly, no `AudioContext`, the Worker fails to start) the switch says so in words and the memos are untouched; nothing is fetched. A browser that evicts the model reads as not installed (MX13).

28. **MX28** No code outside `src/lib/transcribe/engines/**` imports `whisper.rn`, `@huggingface/transformers` or the decode module: a lint error says so and names the fix ("Transcribe through `lib/transcribe`; an engine is an adapter in `transcribe/engines/`"), as for `expo-haptics`. No user-facing copy, meta key, table column or view names an engine or a library.
29. **MX29** Every engine is one `Engine` value: an `id`, the `ModelSpec` it needs (its pinned URL, SHA-256, size said in words, and tag), `offline: true` (an engine that cannot say so is refused at registration), `available()`, `load(model)`, `transcribe(audio, signal)` returning words, and `release()`. One contract suite (`engineContract.ts`) holds a fake and every adapter's testable part to it, and a test fails when an `Engine` member has no contract case (as `FC7` does for the Db).
30. **MX30** Swapping the engine changes the registry and nothing else: the shell suites run over two fake engines with different model specs and input kinds and give the same results, and a test counts the files a swap touches (the registry and the new adapter).
31. **MX31** An engine declares the audio it accepts, in order of preference: its own file container, 16 kHz mono WAV, or 16 kHz samples in memory. The run asks the decoder port for the first one the platform can give, and an engine that reads the memo's own container skips the decoder, so the decode module can be removed without touching a shell.
32. **MX32** A swapped engine reads as a new tag (MX5): transcripts already made stay shown and are re-read quietly once the new model is installed. The old engine's model file is deleted as cache hygiene when the new one installs. The new model is never fetched except by the Download tap (MX12), so after an update that changes the engine the row says the model is not installed until the owner taps.

## Record

Built Nov 11, 2026, tests first (the todos landed at `2325d61`, the code after). Every criterion has a test that runs in
`npm test` or the e2e journey `transcripts`:

- **Pure decisions, shells over fakes:** MX1, MX3, MX5, MX6, MX13, MX14, MX17-MX19 (`core.test.ts`, `run.test.ts`,
  `model.test.ts`), MX11, MX12, MX15, MX27, MX32 (`model.test.ts`), MX4, MX16, MX20, MX30, MX31 (`run.test.ts`,
  `decoder.test.ts`), MX7, MX24 (`words.test.ts`), MX29 (`engine.test.ts`, `engineContract.ts`), MX28
  (`engineBoundary.test.ts`, lint), MX22, MX23 (`bundle.test.ts`), MX25-MX27 (`engineWeb.test.ts`).
- **The Db, over the fake, IndexedDB and SQLite:** MX4, MX18, MX19, MX21 (`dbContract.ts`).
- **The whole web path in headless Chromium** (`transcripts`, a stub engine and a real browser decode): MX1-MX4, MX8-MX13,
  MX15-MX17, MX20, MX23, MX27.

What passes here is the logic and the web path with a stub. **Native code has never run on a device:** `whisper.rn`,
the decode module and the download to the cache directory; nor has the real web engine run in a browser. Each has an
item in `docs/NATIVE_UNVERIFIED.md`. The two model files are not published yet (`handoff.md`), so nothing downloads.

Deviations from the plan, and why:
- The web Worker is `public/transcribe-worker.mjs`, plain module JavaScript beside `maplibre-gl-worker.mjs`, not a
  Metro-bundled TypeScript Worker: Metro has no dependable Worker bundling, and this keeps the engine out of the
  bundle entirely (MX22). The tests for MX22, MX26 read it. The web model is one zip pack, unpacked into Cache Storage.
- Search over a memo's words, WebGPU, other languages, a resumable download, a cellular warning and background runs are
  deferred (`docs/DEFERRED.md`); a stale memo whose new read keeps failing is retried at every run, not twice (MX18 bounds
  a memo with no words).
- The audit has not been run (decision 0074: the owner asks).
- `check:test-first` reports MX29 as "todo and real test in the same commit" (2325d61): its contract cases are generated by `engineContract(name, make)`, which the check's pattern reads as one title, so the order is not visible to it. The todos were committed alone before any code; this is a limit of the check, not of the order.
